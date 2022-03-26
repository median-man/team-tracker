const path = require("path");
const http = require("http");
const express = require("express");
const { ApolloServer } = require("apollo-server-express");

const { typeDefs, resolvers } = require("./schemas");
const db = require("./config/connection");
const { authMiddleware } = require("./util/auth");
const { ApolloServerPluginDrainHttpServer } = require("apollo-server-core");

async function startServer({ port }) {
  try {
    // Wait for db connection
    await new Promise((resolve) => db.once("open", resolve));

    // create express app
    const app = express();

    if (process.env.NODE_ENV === "production") {
      // Handle requests for client assets
      app.use(express.static(path.join(__dirname, "../client/build")));

      // Respond with react client for all other requests. This route should be
      // the last route added to the express app.
      app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../client/build/index.html"));
      });
    }

    const httpServer = http.createServer(app);

    // create apollo server
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      // context: authMiddleware,
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer: httpServer })],
    });
    await server.start();

    server.applyMiddleware({
      app,
      path: "/graphql"
    });

    // start listening for requests
    httpServer.listen({ port }, () => {
      console.log(
        `🚀 Apollo Server ready at http://localhost:${
          httpServer.address().port
        }${server.graphqlPath}`
      );
    });

    return { app, httpServer };
  } catch (error) {
    console.log(error);
    console.log(
      "⛔ There was an error starting the server. See above for details."
    );
    console.log("Shutting down.");
    process.exit(1);
  }
}

module.exports = { startServer };
