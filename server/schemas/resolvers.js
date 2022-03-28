const {
  AuthenticationError,
  UserInputError,
} = require("apollo-server-express");
const Team = require("../models/Team");
const { signToken } = require("../util/auth");
const { dateScalar } = require("./customScalars");

const resolvers = {
  Date: dateScalar,
  Query: {
    me: async (parent, args, { user, dataSources }) => {
      // if ctx.user is undefined, then no token or an invalid token was
      // provided by the client.
      if (!user) {
        throw new AuthenticationError("Must be logged in.");
      }
      const { users } = dataSources;
      return users.findOne({ email: user.email });
    },
  },
  Mutation: {
    createUser: async (parent, { userInput }, { dataSources: { users } }) => {
      try {
        const user = await users.create({ ...userInput });
        const token = await signToken(user);
        return { user, token };
      } catch (error) {
        if (error.name === "ValidationError") {
          const validationErrors = {};
          for (const field in error.errors) {
            validationErrors[field] = error.errors[field].message;
          }
          throw new UserInputError("Invalid user value", { validationErrors });
        }
        if (error.name === "MongoError" && error.code === 11000) {
          const [[key, value]] = Object.entries(error.keyValue);
          throw new UserInputError(`${key} "${value}" already exists.`);
        }
        throw error;
      }
    },
    login: async (parent, { email, password }, { dataSources: { users } }) => {
      const user = await users.login({ email, password });
      if (!user) {
        throw new AuthenticationError("Invalid username or password");
      }
      const token = await signToken(user);
      return { token, user };
    },
    async createTeam(parent, { teamInput }, { user }) {
      return Team.create({ ...teamInput, user: user._id });
    },
    async addTeamMember(parent, { teamId, memberName }, { user }) {
      if (!user) {
        throw new AuthenticationError("Must include a valid token.");
      }
      return Team.findOneAndUpdate(
        { _id: teamId, user: user._id },
        { $addToSet: { members: memberName } },
        { new: true }
      );
    },
    async removeTeamMember(parent, { teamId, memberName }, { user }) {
      return Team.findOneAndUpdate(
        { _id: teamId, user: user._id },
        { $pull: { members: memberName } },
        { new: true }
      );
    },
  },
};

module.exports = resolvers;
