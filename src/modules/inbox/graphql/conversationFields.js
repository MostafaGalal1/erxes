export default `
  _id
  content
  status
  assignedUserId
  createdAt
  assignedUser {
    _id
    username
    details
  }
  integration {
    _id
    kind
    brandId,
    brand {
      _id
      name
    }
    channels {
      _id
      name
    }
  }
  customer {
    _id
    name
    email
    phone
    isUser
    integrationId
    createdAt

    getMessengerCustomData
    customFieldsData
    messengerData
    twitterData
    facebookData
  }
  messageCount
  participatorCount
  participatedUserIds
  participatedUsers {
    _id
    username
    details
  }
  tagIds
  tags {
    _id
    name
    colorCode
  }
  twitterData
  facebookData
  readUserIds
`;
