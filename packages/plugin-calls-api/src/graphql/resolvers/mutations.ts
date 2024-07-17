import { generateToken, getRecordUrl, sendToGrandStream } from '../../utils';
import { IContext, IModels } from '../../connectionResolver';

import acceptCall from '../../acceptCall';
import graphqlPubsub from '@erxes/api-utils/src/graphqlPubsub';
import { IUserDocument } from '@erxes/api-utils/src/types';
import { ICallHistory } from '../../models/definitions/callHistories';
import { sendInboxMessage } from '../../messageBroker';
import { updateConfigs } from '../../helpers';
import { getOrCreateCustomer } from '../../store';
import { putCreateLog, putDeleteLog, putUpdateLog } from '../../logUtils';
import { redlock } from '../../redlock';

export interface ISession {
  sessionCode: string;
}
interface ICallHistoryEdit extends ICallHistory {
  _id: string;
  transferedCallStatus: string;
}

const callsMutations = {
  async callsIntegrationUpdate(_root, { configs }, { models }: IContext) {
    const { inboxId, ...data } = configs;
    const token = await generateToken(inboxId);

    const integration = await models.Integrations.findOneAndUpdate(
      { inboxId },
      { $set: { ...data, token } },
    );
    return integration;
  },

  async callAddCustomer(_root, args, { models, subdomain }: IContext) {
    const integration = await models.Integrations.findOne({
      inboxId: args.inboxIntegrationId,
    }).lean();

    if (!integration) {
      throw new Error('Integration not found');
    }
    const customer = await getOrCreateCustomer(models, subdomain, args);

    const channels = await sendInboxMessage({
      subdomain,
      action: 'channels.find',
      data: {
        integrationIds: { $in: [integration.inboxId] },
      },
      isRPC: true,
    });
    return {
      customer: customer?.erxesApiId && {
        __typename: 'Customer',
        _id: customer.erxesApiId,
      },
      channels,
    };
  },

  async callUpdateActiveSession(
    _root,
    {},
    {
      models,
      user,
    }: { models: IModels; user: IUserDocument & ISession; subdomain: string },
  ) {
    const activeSession = await models.ActiveSessions.findOne({
      userId: user._id,
    });

    if (activeSession) {
      return activeSession;
    }

    await models.ActiveSessions.create({
      userId: user._id,
      lastLoginDeviceId: user.sessionCode,
    });

    return await models.ActiveSessions.findOne({
      userId: user._id,
    });
  },

  async callTerminateSession(_root, {}, { models, user, subdomain }: IContext) {
    await models.ActiveSessions.deleteOne({
      userId: user._id,
    });

    graphqlPubsub.publish(
      `sessionTerminateRequested:${subdomain}:${user._id}`,
      {
        userId: user._id,
      },
    );
    return user._id;
  },

  async callDisconnect(_root, {}, { models, user, subdomain }: IContext) {
    await models.ActiveSessions.deleteOne({
      userId: user._id,
    });

    graphqlPubsub.publish(
      `sessionTerminateRequested:${subdomain}:${user._id}`,
      {
        userId: user._id,
      },
    );

    return 'disconnected';
  },

  async callHistoryAdd(
    _root,
    doc: ICallHistory,
    { user, models, subdomain }: IContext,
  ) {
    const history = await acceptCall(
      models,
      subdomain,
      doc,
      user,
      'addHistory',
    );

    await putCreateLog(
      subdomain,
      {
        type: 'call',
        newData: doc,
        object: history,
        description: `Call "${history._id}" has been created`,
      },
      user,
    );

    return models.CallHistory.getCallHistory(history.timeStamp);
  },

  async callHistoryEdit(
    _root,
    { ...doc }: ICallHistoryEdit & { inboxIntegrationId: string },
    { user, models, subdomain }: IContext,
  ) {
    const { _id } = doc;
    const history = await models.CallHistory.findOne({
      _id,
    });

    if (history && history.callStatus === 'active') {
      let callStatus = doc.callStatus;
      if (doc.transferedCallStatus) {
        callStatus = 'transfered';
      }

      await models.CallHistory.deleteMany({
        timeStamp: doc.timeStamp,
        callStatus: 'cancelled',
      });

      await models.CallHistory.updateOne(
        { _id },
        {
          $set: {
            ...doc,
            modifiedAt: new Date(),
            modifiedBy: user._id,
            callStatus: callStatus,
          },
        },
      );

      await putUpdateLog(
        subdomain,
        {
          type: 'call',
          object: history,
          newData: doc,
          description: `call ${history._id} has been edited`,
        },
        user,
      );

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      await models.CallHistory.updateMany(
        {
          customerPhone: doc.customerPhone,
          createdAt: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
          callStatus: 'cancelled',
        },
        {
          $set: {
            modifiedAt: new Date(),
            modifiedBy: user._id,
            callStatus: 'cancelledToAnswered',
          },
        },
      );
      const callRecordUrl = await getRecordUrl(doc, user, models, subdomain);
      if (
        callRecordUrl &&
        callRecordUrl !== 'Check transfered call record url!'
      ) {
        await models.CallHistory.updateOne(
          { _id },
          { $set: { recordUrl: callRecordUrl } },
        );
        return callRecordUrl;
      }
      if (callRecordUrl === 'Check transfered call record url!') {
        return callRecordUrl;
      }
      return 'success';
    } else if (doc.callStatus === 'cancelled') {
      const cancelledCall = await models.CallHistory.findOne({
        timeStamp: doc.timeStamp,
      });
      if (cancelledCall) {
        return 'Already exists this history';
      }
      const integration = await models.Integrations.findOne({
        inboxId: doc.inboxIntegrationId,
      }).lean();

      if (!integration) {
        throw new Error('Integration not found');
      }

      return new Promise(async (resolve, reject) => {
        let lock;

        try {
          lock = await redlock.lock(
            `${subdomain}:call:history${doc.timeStamp}`,
            60000,
          );
        } catch (e) {
          return reject(`History ${doc.timeStamp} is already being processed`);
        }

        try {
          await lock.extend(60000);

          const oldHistory = await models.CallHistory.findOne({
            customerPhone: doc.customerPhone,
            callStatus: doc.callStatus,
            timeStamp: doc.timeStamp,
          });

          if (!oldHistory) {
            const history = new models.CallHistory({
              ...doc,
              operatorPhone: integration.phone,
              createdAt: new Date(),
              createdBy: doc.endedBy ? user._id : null,
              updatedBy: doc.endedBy ? user._id : null,
            });

            try {
              await history.save();

              return resolve('Successfully edited');
            } catch (saveError) {
              return reject(`Failed to save call history ${saveError}`);
            }
          } else {
            return resolve('Call history already exists');
          }
        } catch (processingError) {
          return reject('An error occurred while processing call history');
        } finally {
          try {
            await lock.unlock();
          } catch (unlockError) {
            console.error('Failed to release lock:', unlockError);
          }
        }
      });
    } else {
      throw new Error(`You cannot edit`);
    }
  },

  async callHistoryEditStatus(
    _root,
    { callStatus, timeStamp }: { callStatus: String; timeStamp: Number },
    { user, models }: IContext,
  ) {
    if (timeStamp && timeStamp !== 0) {
      await models.CallHistory.updateOne(
        { timeStamp },
        {
          $set: {
            callStatus,
            modifiedAt: new Date(),
            modifiedBy: user._id,
          },
        },
      );
      return 'success';
    }
    throw new Error(`Cannot found session id`);
  },

  async callHistoryRemove(
    _root,
    { _id }: { _id: string },
    { models, subdomain, user }: IContext,
  ) {
    const history = await models.CallHistory.findOneAndDelete({ _id });

    if (!history) {
      throw new Error(`Call history not found with id ${_id}`);
    }
    await putDeleteLog(
      subdomain,
      {
        type: 'call',
        object: history,
        description: `call "${history?._id}" has been deleted`,
      },
      user,
    );
    return history;
  },

  async callsUpdateConfigs(_root, { configsMap }, { models }: IContext) {
    await updateConfigs(models, configsMap);

    return { status: 'ok' };
  },

  async callsPauseAgent(
    _root,
    { status, integrationId },
    { models, user }: IContext,
  ) {
    const integration = await models.Integrations.findOne({
      inboxId: integrationId,
    }).lean();

    if (!integration) {
      throw new Error('Integration not found');
    }
    const operator = integration.operators.find(
      (operator) => operator.userId === user?._id,
    );

    const extentionNumber = operator?.gsUsername || '1001';

    const queueData = (await sendToGrandStream(
      models,
      {
        path: 'api',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: {
          request: {
            action: 'pauseUnpauseQueueAgent',
            operatetype: status,
            interface: extentionNumber,
          },
        },
        integrationId: integrationId,
        retryCount: 3,
        isConvertToJson: true,
        isAddExtention: false,
      },
      user,
    )) as any;

    if (queueData && queueData.response) {
      const { need_apply } = queueData?.response;
      if (need_apply) {
        const operator = await models.Operators.getOperator(user._id);
        if (operator) {
          await models.Operators.updateOperator(user._id, status);
        } else if (!operator) {
          await models.Operators.create({
            userId: user._id,
            status,
            extension: extentionNumber,
          });
        }
        return need_apply;
      }
    }
    return 'failed';
  },

  async callTransfer(
    _root,
    { extensionNumber, integrationId, direction },
    { models, user }: IContext,
  ) {
    const listBridgedChannelsPayload = {
      path: 'api',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: {
        request: {
          action: 'listBridgedChannels',
        },
      },
      integrationId,
      retryCount: 3,
      isConvertToJson: true,
      isAddExtention: false,
      isGetExtension: true,
    };

    const {
      response: listBridgedChannelsResponse,
      extentionNumber: extension,
    } = await sendToGrandStream(models, listBridgedChannelsPayload, user);
    let channel = '';
    if (listBridgedChannelsResponse?.response) {
      const channels = listBridgedChannelsResponse.response.channel;
      if (channels) {
        const filteredChannels = channels.filter((ch) => {
          if (direction === 'incoming') {
            return ch.callerid2 === extension;
          } else {
            return ch.callerid1 === extension;
          }
        });
        if (filteredChannels.length > 0) {
          if (direction === 'incoming') {
            channel = filteredChannels[0].channel2 || '';
          } else {
            channel = filteredChannels[0].channel1 || '';
          }
        }
      }
    }

    const callTransferPayload = {
      path: 'api',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: {
        request: {
          action: 'callTransfer',
          extension: extensionNumber,
          channel,
        },
      },
      integrationId,
      retryCount: 3,
      isConvertToJson: true,
      isAddExtention: false,
    };

    const callTransferResponse = await sendToGrandStream(
      models,
      callTransferPayload,
      user,
    );

    if (callTransferResponse?.response?.need_apply) {
      return callTransferResponse?.response?.need_apply;
    }

    return 'failed';
  },
};

export default callsMutations;
