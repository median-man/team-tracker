const { MongoDataSource } = require("apollo-datasource-mongodb");
const Team = require("../models/Team");

class TeamsSource extends MongoDataSource {
  create({ userId, ...values }) {
    return Team.create({ ...values, user: userId });
  }
  findByUserId(userId) {
    return this.model.find({ user: userId });
  }
  addMember({ memberName, teamId, userId }) {
    return Team.findOneAndUpdate(
      { _id: teamId, user: userId },
      { $addToSet: { members: memberName } },
      { new: true }
    );
  }
  removeMember({ memberName, teamId, userId }) {
    return Team.findOneAndUpdate(
      { _id: teamId, user: userId },
      { $pull: { members: memberName } },
      { new: true }
    );
  }
}

module.exports = TeamsSource;
