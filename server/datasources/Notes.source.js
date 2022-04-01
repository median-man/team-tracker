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
  updateNote(noteId, noteData) {
    return this.model.findByIdAndUpdate(noteId, noteData, { new: true });
  }
}

module.exports = NotesSource;
