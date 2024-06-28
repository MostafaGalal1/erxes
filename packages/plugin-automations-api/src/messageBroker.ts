import { sendMessage } from '@erxes/api-utils/src/core';
import type {
  MessageArgsOmitService,
  MessageArgs
} from '@erxes/api-utils/src/core';
import { playWait } from './actions';
import {
  checkWaitingResponseAction,
  doWaitingResponseAction
} from './actions/wait';
import { generateModels } from './connectionResolver';
import { receiveTrigger } from './utils';
import {
  consumeQueue,
  consumeRPCQueue
} from '@erxes/api-utils/src/messageBroker';
import { debugInfo } from '@erxes/api-utils/src/debuggers';

export const setupMessageConsumers = async () => {
  consumeQueue('automations:trigger', async ({ subdomain, data }) => {
    debugInfo(`Receiving queue data: ${JSON.stringify(data)}`);

    const models = await generateModels(subdomain);
    const { type, actionType, targets } = data;

    if (actionType && actionType === 'waiting') {
      await playWait(models, subdomain, data);
      return;
    }

    if (await checkWaitingResponseAction(models, type, actionType, targets)) {
      await doWaitingResponseAction(models, subdomain, data);
      return;
    }

    await receiveTrigger({ models, subdomain, type, targets });
  });

  consumeRPCQueue('automations:trigger', async ({ subdomain, data }) => {
    debugInfo(`Receiving queue data: ${JSON.stringify(data)}`);

    const models = await generateModels(subdomain);
    const { type, actionType, targets } = data;

    if (await checkWaitingResponseAction(models, type, actionType, targets)) {
      await doWaitingResponseAction(models, subdomain, data);
      return {
        status: 'success',
        data: 'complete'
      };
    }

    try {
      await receiveTrigger({ models, subdomain, type, targets });
      return {
        status: 'success',
        data: 'complete'
      };
    } catch (error) {
      return {
        status: 'error',
        errorMessage: error?.message || 'error'
      };
    }
  });

  consumeRPCQueue('automations:find.count', async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    const { query = {} } = data || {};

    return {
      status: 'success',
      data: await models.Automations.countDocuments(query)
    };
  });
};

export const sendCommonMessage = async (
  args: MessageArgs & { serviceName: string }
): Promise<any> => {
  return sendMessage({
    ...args
  });
};

export const sendCoreMessage = async (
  args: MessageArgsOmitService
): Promise<any> => {
  return sendMessage({
    serviceName: 'core',
    ...args
  });
};

export const sendSegmentsMessage = async (
  args: MessageArgsOmitService
): Promise<any> => {
  return sendMessage({
    serviceName: 'segments',
    ...args
  });
};

export const sendEmailTemplateMessage = async (
  args: MessageArgsOmitService
): Promise<any> => {
  return sendMessage({
    serviceName: 'emailtemplates',
    ...args
  });
};

export const sendLogsMessage = (args: MessageArgsOmitService): Promise<any> => {
  return sendMessage({
    serviceName: 'logs',
    ...args
  });
};
