const { MongoDataSource } = require("apollo-datasource-mongodb");

class UsersSource extends MongoDataSource {
  findOne(criteria) {
    return this.model.findOne(criteria).populate("teams");
  }
  create(values) {
    return this.model.create(values);
  }
  async login({ email, password }) {
    const user = await this.model.findOne({ email });
    if (!user) {
      return null;
    }
    const authentic = await user.isCorrectPassword(password);
    if (!authentic) {
      return null;
    }
    user.lastLogin = Date.now();
    // skip validation because the only change is to lastLogin and hashed
    // password will fail password validation
    await user.save({ validateBeforeSave: false });
    return user;
  }
}

module.exports = UsersSource;
