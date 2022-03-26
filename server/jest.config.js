const path = require("path");
const config = {
  globalSetup: path.join(__dirname, "./test/setup.js"),
  globalTeardown: path.join(__dirname, "./test/teardown.js"),
};

module.exports = config;
