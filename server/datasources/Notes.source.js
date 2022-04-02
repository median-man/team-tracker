const { MongoDataSource } = require("apollo-datasource-mongodb");

class NotesSource extends MongoDataSource {
  /**
   * Create a note and return a promise which resolves the new note. If userId is not authorized to update given teamId, then no note will be created. Instead, null is returned.
   */
  async createNote({ teamId, userId, ...noteData }) {
    // only authorize if the userId matches team.user field
    const { teams } = this.context.dataSources;
    const [team] = await teams.findByUserId(userId, { _id: teamId });
    if (!team) {
      // not authorized
      return null;
    }

    return this.model.create({ ...noteData, team: teamId, user: userId });
  }

  /**
   * Update a note and return a promise which resolved the updated note.
   */
  updateNote({ noteId, userId }, noteData) {
    return this.model.findOneAndUpdate(
      { _id: noteId, user: userId },
      noteData,
      { new: true }
    );
  }

  /**
   * Delete a note for given noteId.
   *
   * Returns a promise which resolves 1 if note is deleted and 0 if no matching note is found.
   */
  async delete({ noteId }) {
    const result = await this.model.deleteOne({ _id: noteId });
    return result.deletedCount;
  }
}

module.exports = NotesSource;
