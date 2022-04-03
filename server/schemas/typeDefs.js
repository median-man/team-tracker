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
    updateTeam(teamId: ID!, teamInput: TeamInput!): TeamUpdateResponse
    addTeamMember(teamId: ID!, memberName: String!): TeamUpdateResponse
    removeTeamMember(teamId: ID!, memberName: String!): TeamUpdateResponse
    updateApp(teamId: ID!, appInput: AppInput!): TeamUpdateResponse
    createNote(teamId: ID!, noteInput: NoteInput!): NoteUpdateResponse
    updateNote(noteId: ID!, noteInput: NoteInput!): NoteUpdateResponse
    deleteNote(noteId: ID!): NoteUpdateResponse
  }

  input UserInput {
    email: String
    password: String
    username: String
  }

  input TeamInput {
    name: String
    members: [String]
    memberNames: [String]
  }

  input AppInput {
    title: String
    repoUrl: String
    url: String
  }

  input NoteInput {
    body: String
  }

  type User {
    _id: ID!
    username: String!
    email: String!
    lastLogin: Date!
    teams(_id: ID): [Team]
  }

  type Team {
    _id: ID!
    name: String!
    app: App
    memberNames: [String]
    notes: [Note]
  }

  type App {
    title: String!
    repoUrl: String
    url: String
    links: [String]
  }

  type Note {
    _id: ID!
    body: String!
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
  type NoteUpdateResponse {
    success: Boolean!
    note: Note
  }
`;

module.exports = typeDefs;
