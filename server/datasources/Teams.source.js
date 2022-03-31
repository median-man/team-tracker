const { MongoDataSource } = require("apollo-datasource-mongodb");

class TeamsSource extends MongoDataSource {
  create({ userId, ...values }) {
    return this.model.create({ ...values, user: userId });
  }
  findByUserId(userId) {
    return this.model.find({ user: userId });
  }
  addMember({ memberName, teamId, userId }) {
    return this.model.findOneAndUpdate(
      { _id: teamId, user: userId },
      { $addToSet: { members: memberName } },
      { new: true }
    );
  }
  removeMember({ memberName, teamId, userId }) {
    return this.model.findOneAndUpdate(
      { _id: teamId, user: userId },
      { $pull: { members: memberName } },
      { new: true }
    );
  }

  /**
   * Updates the app field for a team which matches given userId and teamId. Returns null if no matching team is found.
   */
  updateApp({ userId, teamId, ...appData }) {
    return this.model.findOneAndUpdate(
      { _id: teamId, user: userId },
      { app: appData },
      { new: true }
    );
  }

  /**
   * Creates a new note for matching teamId. Returns null if no matching team found belonging to the given userId.
   */
  async addNote({ userId, teamId, ...noteData }) {
    const team = await this.model.findOne({ _id: teamId, user: userId });
    if (!team) {
      return null;
    }
    return team.addNote(noteData);
  }
}

module.exports = TeamsSource;
