import { Document, Model, Schema } from 'mongoose';

import { IModels } from '../connectionResolver';
import { field } from './definitions/utils';

export interface IIntegration {
  kind: string;
  accountId: string;
  emailScope?: string;
  erxesApiId: string;
  whatsappNumberIds?: string[];
  email: string;
  expiration?: string;
  healthStatus?: string;
  error?: string;
}

export interface IIntegrationDocument extends IIntegration, Document {}

export const integrationSchema = new Schema({
  _id: field({ pkey: true }),
  kind: String,
  accountId: String,
  erxesApiId: String,
  emailScope: String,
  whatsappNumberIds: field({
    type: [String],
    label: 'whatsapp Number ids',
    optional: true
  }),
  email: String,
  expiration: String,
  healthStatus: String,
  error: String
});

export interface IIntegrationModel extends Model<IIntegrationDocument> {
  getIntegration(selector): Promise<IIntegrationDocument>;
}

export const loadIntegrationClass = (models: IModels) => {
  class Integration {
    public static async getIntegration(selector) {
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
