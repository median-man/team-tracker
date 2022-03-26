const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.test.local") });
const { startServer } = require("../server");
const db = require("../config/connection");
const request = require("supertest");
// const typeDefs = require("../schemas/typeDefs");
// const resolvers = require("../schemas/resolvers");

let app, httpServer;
beforeAll(async () => {
  ({ app, httpServer } = await startServer({ port: 0 }));
});

afterAll(() => {
  db.close();
  httpServer.close();
});

it("apollo-server health check", async () => {
  const url = `http://localhost:${httpServer.address().port}`;
  const response = await request(url).get("/graphql").query({
    query: `{ __typename }`,
  });
  expect(response.body).toEqual({ data: { __typename: "Query" } });
});

describe("create user", () => {
  afterEach(async () => {
    await db.dropDatabase();
  });
  it("should throw UserInputError given an user", async () => {
    const url = `http://localhost:${httpServer.address().port}`;
    const response = await request(url)
      .post("/graphql")
      .send({
        query: `mutation createUser($userInput: UserInput!) {
          createUser(userInput: $userInput) {
            user {
              _id
              email
              username
            }
          }
        }`,
        variables: {
          userInput: {
            // no username provided
            password: "Password12", // password does not contain special character
            email: "testemail.com", // missing "@"
          },
        },
      });
    const { errors } = response.body;
    expect(errors[0].message).toBe("Invalid user value");
    expect(errors[0].extensions).toEqual({
      code: "BAD_USER_INPUT",
      validationErrors: {
        email: "'testemail.com' is not a valid email.",
        username: "Path `username` is required.",
        password: "Invalid password. Must contain uppercase and lowercase letters, numbers, and special characters."
      },
    });
  });
  
  it("should create a new user", async () => {
    const url = `http://localhost:${httpServer.address().port}`;
    const response = await request(url)
      .post("/graphql")
      .send({
        query: `mutation createUser($userInput: UserInput!) {
          createUser(userInput: $userInput) {
            user {
              _id
              email
              username
            }
          }
        }`,
        variables: {
          userInput: {
            username: "testuser",
            password: "Password12#",
            email: "test@email.com",
          },
        },
      });
    if (response.status === 400) {
      const { errors } = response.body;
      throw new Error(
        `GraphQL Errors:\n${errors
          .map((e) => `    ${e.extensions?.code}: ${e.message}`)
          .join("\n")}`
      );
    }
    const { data } = response.body;
    expect(data.createUser).toEqual(
      expect.objectContaining({
        user: {
          _id: expect.any(String),
          email: "test@email.com",
          username: "testuser",
        },
      })
    );
  });
});
