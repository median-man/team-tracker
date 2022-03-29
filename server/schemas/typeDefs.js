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
    createTeam(teamInput: TeamInput!): TeamUpdateResponse
    addTeamMember(teamId: ID!, memberName: String!): TeamUpdateResponse
    removeTeamMember(teamId: ID!, memberName: String!): TeamUpdateResponse
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

  # Mutation Response Types
  type AuthResponse {
    success: Boolean!
    token: String!
    user: User!
  }
  type TeamUpdateResponse {
    success: Boolean!
    team: Team
  }
`;

module.exports = typeDefs;
