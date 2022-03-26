const teardown = async () => {
  await global.__MONGOD__.stop();
};
module.exports = teardown;
