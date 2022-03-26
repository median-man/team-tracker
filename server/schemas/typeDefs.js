const { gql } = require("apollo-server-express");

const typeDefs = gql`
  "Unix time stamp in milliseconds."
  scalar Date

  type Query {
    "Find the logged in user."
    me: User
  }

  type Mutation {
    createUser(userInput: UserInput!): Auth
    login(email: String!, password: String!): Auth
  }

  input UserInput {
    email: String
    password: String
    username: String
  }

  type Auth {
    token: String!
    user: User!
  }

  type User {
    _id: ID!
    username: String!
    email: String!
    lastLogin: Date!
  }
`;

module.exports = typeDefs;
