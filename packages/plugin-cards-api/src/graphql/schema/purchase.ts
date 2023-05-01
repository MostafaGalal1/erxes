import {
  commonDragParams,
  commonListTypes,
  commonMutationParams,
  commonTypes,
  conformityQueryFields,
  copyParams,
  commonCostParamsDef
} from './common';

export const types = ({ contacts, tags }) => `
  type PurchaseListItem @key(fields: "_id") {
    products: JSON
    amount: JSON
    customFieldsData: JSON
    ${commonListTypes}
  }

  type Purchase @key(fields: "_id") {
    _id: String!
    amount: JSON

    ${
      contacts
        ? `
      companies: [Company]
      customers: [Customer]
      `
        : ''
    }

    ${tags ? `tags: [Tag]` : ''}

    products: JSON
    productsData: JSON
    paymentsData: JSON
    ${commonTypes}
  }

  type PurchaseTotalCurrency {
    amount: Float
    name: String
  }

  type PurchaseTotalForType {
    _id: String
    name: String
    currencies: [PurchaseTotalCurrency]
  }

  input PurchaseProductField {
    productId : String
    quantity: Int
  }
  input costObjectInput {
    name: String
    code: String
  }
`;

const purchaseMutationParams = `
  paymentsData: JSON,
  productsData: JSON,
`;

const commonQueryParams = `
  _ids: [String]
  date: ItemDate
  parentId:String
  pipelineId: String
  pipelineIds: [String]
  customerIds: [String]
  companyIds: [String]
  assignedUserIds: [String]
  productIds: [String]
  closeDateType: String
  labelIds: [String]
  search: String
  priority: [String]
  sortField: String
  sortDirection: Int
  userIds: [String]
  segment: String
  segmentData: String
  assignedToMe: String
  startDate: String
  endDate: String
  hasStartAndCloseDate: Boolean
  stageChangedStartDate: Date
  stageChangedEndDate: Date
  noSkipArchive: Boolean
  tagIds: [String]
  number: String
  branchIds: [String]
  departmentIds: [String]
`;

const listQueryParams = `
    initialStageId: String
    stageId: String
    skip: Int
    limit: Int
    ${commonQueryParams}
    ${conformityQueryFields}
 `;

const archivedPurchasesParams = `
  pipelineId: String!
  search: String
  userIds: [String]
  priorities: [String]
  assignedUserIds: [String]
  labelIds: [String]
  productIds: [String]
  companyIds: [String]
  customerIds: [String]
  startDate: String
  endDate: String
 `;

const fieldsGroupsCommonFields = `
  name: String
  contentType: String
  order: Int
  description: String
  parentId: String
  code: String
  isMultiple: Boolean
  isVisible: Boolean
  isVisibleInDetail: Boolean
  config: JSON

  logicAction: String
  logics: [LogicInput]
`;

export const queries = `
 purchaseDetail(_id: String!): Purchase
 purchasecheckDiscount(_id: String!,products:[ProductField]):JSON
 purchases(${listQueryParams}): [PurchaseListItem]
 purchasesTotalCount(${listQueryParams}): Int
 archivedPurchases(
   page: Int
   perPage: Int
   ${archivedPurchasesParams}
 ): [Purchase]
 archivedPurchasesCount(
   ${archivedPurchasesParams}
 ): Int
 purchasesTotalAmounts(
   ${commonQueryParams}
   ${conformityQueryFields}
 ): [TotalForType]
  costs: [JSON]
  costTotalCount:JSON
  costDetail(_id: String!): JSON

`;

export const mutations = `
 purchasesAdd(name: String!, ${copyParams}, ${purchaseMutationParams}, ${commonMutationParams}): Purchase
 purchasesEdit(_id: String!, name: String, ${purchaseMutationParams}, ${commonMutationParams}): Purchase
 purchasesChange(${commonDragParams}): Purchase
 purchasesRemove(_id: String!): Purchase
 purchasesWatch(_id: String, isAdd: Boolean): Purchase
 purchasesCopy(_id: String!, proccessId: String): Purchase
 purchasesArchive(stageId: String!, proccessId: String): String
 purchasesCreateProductsData(proccessId: String, purchaseId: String, docs: JSON): JSON
 purchasesEditProductData(proccessId: String, purchaseId: String, dataId: String, doc: JSON): JSON
 purchasesDeleteProductData(proccessId: String, purchaseId: String, dataId: String): JSON
 costAdd(code: String, name: String): JSON
 costRemove(_id: String!): JSON
 costEdit(_id: String!, ${commonCostParamsDef}): JSON

`;
