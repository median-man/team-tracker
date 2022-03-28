const { MongoDataSource } = require("apollo-datasource-mongodb");

class UsersSource extends MongoDataSource {}

module.exports = UsersSource;
