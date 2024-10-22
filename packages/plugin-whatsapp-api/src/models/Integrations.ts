import { Document, Model, Schema } from 'mongoose';

import { IModels } from '../connectionResolver';
import { field } from './definitions/utils';

export interface IIntegration {
  kind: string;
  accountId: string;
  emailScope?: string;
  erxesApiId: string;
  facebookPageId?: string;
  whatsappPageId?: string;
  facebookPageTokensMap?: { [key: string]: string };
  email: string;
  expiration?: string;
  healthStatus?: string;
  error?: string;
}

export interface IIntegrationDocument extends IIntegration, Document {}

// schema for integration document
export const integrationSchema = new Schema({
  _id: field({ pkey: true }),
  kind: String,
  accountId: String,
  erxesApiId: String,
  emailScope: String,
  whatsappPageId: String,
  facebookPageId: String,

  email: String,
  expiration: String,

  facebookPageTokensMap: field({
    type: Object,
    default: {}
  }),
  healthStatus: String,
  error: String
});

export interface IIntegrationModel extends Model<IIntegrationDocument> {
  getIntegration(selector): Promise<IIntegrationDocument>;
}

export const loadIntegrationClass = (models: IModels) => {
  class Integration {
    public static async getIntegration(selector) {
      // const integration = await models.Integrations.findOne(selector);

      const integration = await models.Integrations.findOne();
      if (!integration) {
        throw new Error('Instagram Integration not found ');
      }

      return integration;
    }
  }

  integrationSchema.loadClass(Integration);

  return integrationSchema;
};
