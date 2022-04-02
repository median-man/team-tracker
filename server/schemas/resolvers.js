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

    /**
     * Update team matching the given teamId if the team belongs to the logged in user.
     */
    async updateTeam(
      parent,
      { teamId, teamInput },
      { user, dataSources: { teams } }
    ) {
      const team = await teams.update({ teamId, userId: user._id }, teamInput);
      if (team) {
        return { success: true, team };
      }
      return { success: false };
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

    /**
     * Find given team for the authenticated user and updates the app field.
     */
    async updateApp(
      parent,
      { teamId, appInput },
      { user, dataSources: { teams } }
    ) {
      const team = await teams.updateApp({
        userId: user._id,
        teamId,
        ...appInput,
      });
      return { success: team !== null, team };
    },

    /**
     * Find given teamId and create a note associated with that team. Team must belong to auth. user.
     */
    async createNote(
      parent,
      { teamId, noteInput },
      { user, dataSources: { notes } }
    ) {
      const note = await notes.createNote({
        teamId,
        userId: user._id,
        ...noteInput,
      });
      if (note) {
        return { success: true, note };
      }
      return { success: false };
    },

    /**
     * Find given noteId and update the note.
     *
     * Returns a NoteUpdateResponse with the updated note data. Request returns
     * {success: false} if user is not authorized to update the note.
     */
    async updateNote(
      parent,
      { noteId, noteInput },
      { user, dataSources: { notes } }
    ) {
      const note = await notes.updateNote(
        { noteId, userId: user._id },
        noteInput
      );
      if (note) {
        return { success: true, note };
      }
      return { success: false };
    },
    /**
     * Deletes the note for the given noteId if it belongs to the authenticated user.
     */
    async deleteNote(parent, { noteId }, { user, dataSources: { notes } }) {
      const deleteCount = await notes.delete({ noteId, userId: user._id });
      return { success: deleteCount === 1 };
    },
  },
  User: {
    async teams(user, { _id }, { dataSources: { teams } }) {
      // await necessary to avoid querying twice due to apollo's implementation
      if (_id) {
        return await teams.findByUserId(user._id, { _id });
      }
      return await teams.findByUserId(user._id);
    },
  },
  Team: {
    async notes(team, args, { dataSources: { notes } }) {
      return notes.findByTeamId(team._id);
    },
  },
};

module.exports = resolvers;
