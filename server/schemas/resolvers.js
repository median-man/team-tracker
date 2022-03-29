const {
  AuthenticationError,
  UserInputError,
} = require("apollo-server-express");
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
        return { user, token, success: true };
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
      return { token, user, success: true };
    },
    async createTeam(parent, { teamInput }, { user, dataSources }) {
      const { teams } = dataSources;
      return {
        success: true,
        team: teams.create({ ...teamInput, userId: user._id }),
      };
    },
    async addTeamMember(parent, { teamId, memberName }, { user, dataSources }) {
      if (!user) {
        throw new AuthenticationError("Must include a valid token.");
      }
      const team = await dataSources.teams.addMember({
        teamId,
        memberName,
        userId: user._id,
      });
      return { success: Boolean(team), team };
    },
    async removeTeamMember(
      parent,
      { teamId, memberName },
      { user, dataSources }
    ) {
      const team = await dataSources.teams.removeMember({
        teamId,
        memberName,
        userId: user._id,
      });
      return { success: Boolean(team), team };
    },
  },
  User: {
    async teams(user, args, { dataSources: { teams } }) {
      // await necessary to avoid querying twice due to apollo's implementation
      return await teams.findByUserId(user._id);
    },
  },
};

module.exports = resolvers;
