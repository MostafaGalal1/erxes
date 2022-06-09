const listParamsDef = `
  $page: Int
  $perPage: Int
  $sortField: String
  $sortDirection: Int
  $searchValue: String
  $departmentId: String
  $branchId: String

  $beginDate: Date
  $endDate: Date
  $productId: String
`;

const listParamsValue = `
  page: $page
  perPage: $perPage
  sortField: $sortField
  sortDirection: $sortDirection
  searchValue: $searchValue
  departmentId: $departmentId
  branchId: $branchId
  beginDate: $beginDate
  endDate: $endDate
  productId: $productId
`;

export const safeRemainderFields = `
  _id
  createdAt
  createdBy
  modifiedAt
  modifiedBy

  date: Date
  description

  status
  branchId
  departmentId

  branch {
    _id
    code
    title
  }
  department {
    _id
    code
    title
  }

`;

const safeRemainders = `
  query safeRemainders(
    ${listParamsDef}
  ) {
    safeRemainders(
      ${listParamsValue}
    ) {
      remainders {
        ${safeRemainderFields}
      }

      totalCount
    }
  }
`;

export default {
  safeRemainders
};
