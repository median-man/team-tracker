const { gql } = require("apollo-server-express");

const typeDefs = gql`
  "Unix time stamp in milliseconds."
  scalar Date

  type Query {
    "Find the logged in user."
    me: User!
  }

  type Mutation {
    createUser(userInput: UserInput!): AuthResponse
    login(email: String!, password: String!): AuthResponse
    createTeam(teamInput: TeamInput!): Team
    addTeamMember(teamId: ID!, memberName: String!): Team
    removeTeamMember(teamId: ID!, memberName: String!): Team
  }

  input UserInput {
    email: String
    password: String
    username: String
  }

  input TeamInput {
    name: String
    members: [String]
  }

  type AuthResponse {
    success: Boolean!
    token: String!
    user: User!
  }

  type User {
    _id: ID!
    username: String!
    email: String!
    lastLogin: Date!
    teams: [Team]
  }

  type Team {
    _id: ID!
    name: String!
    user: User!
    app: App
    members: [String]
  }

  type App {
    title: String!
    repoUrl: String
    url: String
    links: [String]
  }
`;

module.exports = typeDefs;
