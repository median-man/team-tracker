const {
  AuthenticationError,
  UserInputError,
} = require("apollo-server-express");
const { User } = require("../models");
const Team = require("../models/Team");
const { signToken } = require("../util/auth");
const { dateScalar } = require("./customScalars");

const resolvers = {
  Date: dateScalar,
  Query: {
    me: async (parent, args, ctx) => {
      // if ctx.user is undefined, then no token or an invalid token was
      // provided by the client.
      if (!ctx.user) {
        throw new AuthenticationError("Must be logged in.");
      }
      return User.findOne({ email: ctx.user.email }).populate("teams");
    },
  },
  Mutation: {
    createUser: async (parent, { userInput }) => {
      try {
        const user = await User.create({ ...userInput });
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
    login: async (parent, args) => {
      const { email, password } = args;
      const user = await User.findOne({ email });
      if (!user) {
        throw new AuthenticationError("Invalid username or password");
      }
      const authentic = await user.isCorrectPassword(password);
      if (!authentic) {
        throw new AuthenticationError("Invalid username or password");
      }
      const token = await signToken(user);
      user.lastLogin = Date.now();
      // skip validation because the only change is to lastLogin and hashed
      // password will fail password validation
      await user.save({ validateBeforeSave: false });
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
