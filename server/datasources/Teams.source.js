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
}

module.exports = TeamsSource;
