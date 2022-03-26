const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.test.local") });
const { startServer } = require("../server");
const db = require("../config/connection");
const request = require("supertest");
const jwt = require("jsonwebtoken");

let app, httpServer;
beforeAll(async () => {
  ({ app, httpServer } = await startServer({ port: 0 }));
});

afterEach(async () => {
  await db.dropDatabase();
});

afterAll(() => {
  db.close();
  httpServer.close();
});

// helper for sending a graphql request
const gqlRequest = ({ query, variables }) => {
  const url = `http://localhost:${httpServer.address().port}`;
  return request(url).post("/graphql").send({ query, variables });
};

const expectNoGqlErrors = (response) => {
  const { errors } = response.body;
  if (errors) {
    throw new Error(
      `GraphQL Errors:\n${errors
        .map((e) => `    ${e.extensions?.code}: ${e.message}`)
        .join("\n")}`
    );
  }
};

it("apollo-server health check", async () => {
  const url = `http://localhost:${httpServer.address().port}`;
  const response = await request(url).get("/graphql").query({
    query: `{ __typename }`,
  });
  expect(response.body).toEqual({ data: { __typename: "Query" } });
});

describe("create user mutation", () => {
  it("should throw UserInputError given a user", async () => {
    const query = `mutation createUser($userInput: UserInput!) {
      createUser(userInput: $userInput) {
        user {
          _id
          email
          username
        }
      }
    }`;
    const userInput = {
      // no username provided
      password: "Password12", // password does not contain special character
      email: "testemail.com", // missing "@"
    };
    const response = await gqlRequest({ query, variables: { userInput } });

    const { errors } = response.body;
    expect(errors[0].message).toBe("Invalid user value");
    expect(errors[0].extensions).toEqual({
      code: "BAD_USER_INPUT",
      validationErrors: {
        email: `'${userInput.email}' is not a valid email.`,
        username: "Path `username` is required.",
        password:
          "Invalid password. Must contain uppercase and lowercase letters, numbers, and special characters.",
      },
    });
  });

  it("should create a new user and token", async () => {
    const query = `mutation createUser($userInput: UserInput!) {
      createUser(userInput: $userInput) {
        user {
          _id
          email
          username
        }
        token
      }
    }`;
    const userInput = {
      username: "testuser",
      password: "Password12#",
      email: "test@email.com",
    };
    const response = await gqlRequest({ query, variables: { userInput } });
    expectNoGqlErrors(response);
    const { data } = response.body;
    expect(data.createUser).toEqual(
      expect.objectContaining({
        user: {
          _id: expect.any(String),
          email: userInput.email,
          username: userInput.username,
        },
        token: expect.any(String),
      })
    );
  });
});

describe("login mutation", () => {
  const userInput = {
    username: "testuser",
    password: "Password12#",
    email: "test@email.com",
  };
  beforeEach(async () => {
    const query = `mutation createUser($userInput: UserInput!) {
      createUser(userInput: $userInput) {
        user {
          _id
          email
          username
        }
        token
      }
    }`;
    const response = await gqlRequest({ query, variables: { userInput } });
    expectNoGqlErrors(response);
  });

  it("should return user and token", async () => {
    const query = `mutation login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        user {
          _id
          email
          username
        }
        token
      }
    }`;
    const variables = { email: userInput.email, password: userInput.password };
    const response = await gqlRequest({ query, variables });
    expectNoGqlErrors(response);
    const { data } = response.body;

    expect(data.login).toEqual(
      expect.objectContaining({
        user: {
          _id: expect.any(String),
          email: userInput.email,
          username: userInput.username,
        },
        token: expect.any(String),
      })
    );
  });

  it("auth token payload should contain the user id, username, and email", async () => {
    const query = `mutation login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        user {
          _id
          email
          username
        }
        token
      }
    }`;
    const variables = { email: userInput.email, password: userInput.password };
    const response = await gqlRequest({ query, variables });
    expectNoGqlErrors(response);
    const { user, token } = response.body.data.login;
    const { data } = jwt.decode(token);
    expect(data).toEqual({
      _id: user._id,
      email: user.email,
      username: user.username,
    });
  });
});
