import * as graph from 'fbgraph';

import { IModels } from './connectionResolver';
import { debugBase, debugError, debugWhatsapp } from './debuggers';
import { generateAttachmentUrl, getConfig } from './commonUtils';
import { IAttachment, IAttachmentMessage } from './types';
import { IIntegrationDocument } from './models/Integrations';
import { FacebookAdapter } from 'botbuilder-adapter-facebook-erxes';

export const graphRequest = {
  base(method: string, path?: any, accessToken?: any, ...otherParams) {
    // set access token
    graph.setAccessToken(accessToken);
    graph.setVersion('19.0');

    return new Promise((resolve, reject) => {
      graph[method](path, ...otherParams, (error, response) => {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      });
    });
  },
  get(...args): any {
    return this.base('get', ...args);
  },

  post(...args): any {
    return this.base('post', ...args);
  },

  delete(...args): any {
    return this.base('del', ...args);
  }
};

export const getPostDetails = async (
  pageId: string,
  pageTokens: { [key: string]: string },
  postId: string
) => {
  let pageAccessToken;

  try {
    pageAccessToken = getPageAccessTokenFromMap(pageId, pageTokens);
  } catch (e) {
    debugError(`Error occurred while getting page access token: ${e.message}`);
    throw new Error();
  }

  try {
    const response: any = await graphRequest.get(
      `/${postId}?fields=permalink_url,message,created_time,`,
      pageAccessToken
    );

    return response;
  } catch (e) {
    debugError(`Error occurred while getting whatsapp post: ${e.message}`);
    return null;
  }
};
export const getPostLink = async (accessToken: string, post_id: string) => {
  try {
    const response = await graphRequest.get(
      `${post_id}/?fields=permalink,caption,media_url,media_type,comments,username,comments_count,id,ig_id,timestamp`,
      accessToken
    );
    return response;
  } catch (e) {
    if (e.message.includes('Error validating access token')) {
      // Handle the invalid token case
      debugError(
        'Access token is invalid or expired. Reauthentication required.'
      );
      // Prompt reauthentication or refresh token logic here
    } else {
      debugError(`Error occurred while getting Instagram post: ${e.message}`);
    }
    return null;
  }
};
export const getFacebookPageIdsForInsta = async (
  accessToken: string,
  whatsappPageId: string
): Promise<string | null> => {
  try {
    const response: any = await graphRequest.get(
      '/me/accounts?fields=whatsapp_business_account,access_token,id,name',
      accessToken
    );

    if (!response || !response.data || response.data.length === 0) {
      throw new Error('No data found in response');
    }

    for (const page of response.data) {
      if (page.whatsapp_business_account) {
        const pageId = page.whatsapp_business_account.id;

        if (pageId === whatsappPageId) {
          return page.id; // Return the found page ID as a string
        }
      }
    }

    return null;
  } catch (error) {
    throw error;
  }
};
export const subscribePage = async (
  pageId,
  pageToken
): Promise<{ success: true } | any> => {
  return graphRequest.post(`${pageId}/subscribed_apps`, pageToken, {
    subscribed_fields: ['conversations', 'feed', 'messages']
  });
};

export const getPageAccessToken = async (
  pageId: string,
  userAccessToken: string
) => {
  const response = await graphRequest.get(
    `${pageId}/?fields=access_token`,
    userAccessToken
  );

  return response.access_token;
};

export const refreshPageAccesToken = async (
  models: IModels,
  pageId: string,
  integration: IIntegrationDocument
) => {
  const account = await models.Accounts.getAccount({
    _id: integration.accountId
  });

  const facebookPageTokensMap = integration.facebookPageTokensMap || {};

  const pageAccessToken = await getPageAccessToken(pageId, account.token);

  facebookPageTokensMap[pageId] = pageAccessToken;

  await models.Integrations.updateOne(
    { _id: integration._id },
    { $set: { facebookPageTokensMap } }
  );

  return facebookPageTokensMap;
};

export const unsubscribePage = async (
  pageId,
  pageToken
): Promise<{ success: true } | any> => {
  return graphRequest
    .delete(`${pageId}/subscribed_apps`, pageToken)
    .then((res) => res)
    .catch((e) => {
      debugError(e);
      throw e;
    });
};
export const getPageList = async (
  models: IModels,
  accessToken?: string,
  kind?: string
) => {
  let response = {} as any;
  try {
    response = await graphRequest.get(
      '/me/accounts?fields=whatsapp_business_account, access_token,id,name',
      accessToken
    );
  } catch (e) {
    throw e;
  }

  const pages: any[] = [];
  for (const page of response.data) {
    if (page.whatsapp_business_account) {
      const pageId = page.whatsapp_business_account.id;
      const accounInfo: any = await graphRequest.get(
        `${pageId}?fields=username`,
        accessToken
      );

      const integration = await models.Integrations.findOne({
        whatsappPageId: accounInfo.id,
        kind
      });

      pages.push({
        id: accounInfo.id,
        name: accounInfo.username,
        isUsed: !!integration
      });
    }
  }

  return pages;
};

export const getPageAccessTokenFromMap = (
  pageId: string,
  pageTokens: { [key: string]: string }
): string => {
  return (pageTokens || {})[pageId];
};
export const getInstagramUser = async (
  userId: string,
  facebookPageId: string,
  facebookPageTokensMap?: { [key: string]: string }
) => {
  if (facebookPageTokensMap !== undefined) {
    const token = await getPageAccessTokenFromMap(
      facebookPageId,
      facebookPageTokensMap
    );
    const accounInfo: any = await graphRequest.get(
      `${userId}?fields=name,username,profile_pic`,
      token
    );
    return accounInfo;
  } else {
    throw new Error(
      'facebookPageTokensMap is undefined. Unable to get Instagram user.'
    );
  }
};

export const sendReply = async (
  models: IModels,
  url: string,
  data: any,
  integrationId: string
) => {
  const integration = await models.Integrations.findOne({
    erxesApiId: integrationId
  });
  if (!integration) {
    throw new Error('Integration not found');
  }
  const { facebookPageTokensMap = {}, facebookPageId } = integration;

  let pageAccessToken: string | undefined;

  try {
    if (!facebookPageId) {
      throw new Error('Facebook page ID is not defined.');
    }

    pageAccessToken = getPageAccessTokenFromMap(
      facebookPageId,
      facebookPageTokensMap
    );

    if (!pageAccessToken) {
      throw new Error('Page access token not found.');
    }

    // Continue processing with `pageAccessToken`
  } catch (e) {
    debugError(
      `Error occurred while trying to get page access token: ${e.message}`
    );
    return e;
  }

  try {
    const response = await graphRequest.post(`${url}`, pageAccessToken, {
      ...data
    });
    debugWhatsapp(`Successfully sent data to whatsapp ${JSON.stringify(data)}`);
    return response;
  } catch (e) {
    debugError(
      `Error ocurred while trying to send post request to facebook ${
        e.message
      } data: ${JSON.stringify(data)}`
    );

    throw new Error(e.message);
  }
};
export const generateAttachmentMessages = (
  subdomain: string,
  attachments: IAttachment[]
) => {
  const messages: IAttachmentMessage[] = [];

  for (const attachment of attachments || []) {
    let type = 'file';

    if (attachment.type.startsWith('image')) {
      type = 'image';
    }

    const url = generateAttachmentUrl(subdomain, attachment.url);

    messages.push({
      attachment: {
        type,
        payload: {
          url
        }
      }
    });
  }

  return messages;
};
