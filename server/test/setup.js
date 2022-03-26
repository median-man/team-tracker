// const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const setup = async () => {
  const mongoServer = await MongoMemoryServer.create();
  global.__MONGOD__ = mongoServer;
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = `${uri.slice(
    0,
    uri.lastIndexOf("/")
  )}/team_tracker_test`;
};

module.exports = setup;
