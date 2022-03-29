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
const gqlRequest = ({ query, variables, token }) => {
  const url = `http://localhost:${httpServer.address().port}`;
  if (token) {
    return request(url)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send({ query, variables });
  }
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

const testUserInput = {
  username: "testuser",
  password: "Password12#",
  email: "test@email.com",
};
const createTestUser = async (userInput = testUserInput) => {
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
  const response = await gqlRequest({
    query,
    variables: { userInput },
  });
  expectNoGqlErrors(response);
  return response.body.data.createUser;
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
        success
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
  beforeEach(createTestUser);

  it("should return user, token, and success fields", async () => {
    const query = `mutation login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        success
        user {
          _id
          email
          username
        }
        token
      }
    }`;
    const variables = {
      email: testUserInput.email,
      password: testUserInput.password,
    };
    const response = await gqlRequest({ query, variables });
    expectNoGqlErrors(response);
    const { data } = response.body;

    expect(data.login).toEqual(
      expect.objectContaining({
        success: true,
        user: {
          _id: expect.any(String),
          email: testUserInput.email,
          username: testUserInput.username,
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
    const variables = {
      email: testUserInput.email,
      password: testUserInput.password,
    };
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

describe("teams", () => {
  let token;
  let user;
  beforeEach(async () => {
    ({ token, user } = await createTestUser());
    expect(token).not.toBeNull();
  });

  test("create a team", async () => {
    const query = `mutation createTeam($teamInput: TeamInput!) {
      createTeam(teamInput: $teamInput) {
        success
        team {
          _id
          name
          user {
            _id
          }
          members
        }
      }
    }`;
    const variables = {
      teamInput: { name: "Test Team", members: ["Jerry", "Elaine"] },
    };
    const response = await gqlRequest({ query, variables, token });
    expectNoGqlErrors(response);
    const team = response.body.data.createTeam;
    expect(team).toEqual(
      expect.objectContaining({
        success: true,
        team: {
          _id: expect.any(String),
          name: "Test Team",
          user: {
            _id: user._id,
          },
          members: ["Jerry", "Elaine"],
        },
      })
    );
  });

  describe("update a team", () => {
    let teamId;
    beforeEach(async () => {
      const query = `mutation createTeam($teamInput: TeamInput!) {
        createTeam(teamInput: $teamInput) {
          team {
            _id
          }
        }
      }`;
      const variables = {
        teamInput: { name: "Test Team", members: ["Jerry", "Elaine"] },
      };
      const response = await gqlRequest({ query, variables, token });
      expectNoGqlErrors(response);
      teamId = response.body.data.createTeam.team._id;
    });

    describe("add member", () => {
      test("add a member to a team", async () => {
        const query = `mutation addTeamMember($teamId: ID!, $memberName: String!) {
            addTeamMember(teamId: $teamId, memberName: $memberName) {
              success
              team {
                _id
                members
              }
            }
          }`;
        const variables = { teamId, memberName: "Kramer" };
        const response = await gqlRequest({ query, variables, token });
        expectNoGqlErrors(response);
        console.log(response.body.data.addTeamMember);
        expect(response.body.data.addTeamMember).toMatchObject({
          success: true,
          team: {
            _id: teamId,
            members: expect.arrayContaining(["Kramer"]),
          },
        });
      });

      test("request must include auth", async () => {
        const query = `mutation addTeamMember($teamId: ID!, $memberName: String!) {
          addTeamMember(teamId: $teamId, memberName: $memberName) {
            team {
              _id
              members
            }
          }
        }`;
        const variables = { teamId, memberName: "Kramer" };
        const response = await gqlRequest({ query, variables });
        const { errors, data } = response.body;
        expect(data.addTeamMember).toBeNull();
        expect(errors[0]).toMatchObject({
          message: "Must include a valid token.",
          extensions: {
            code: "UNAUTHENTICATED",
          },
        });
      });

      test("can only update own team", async () => {
        const { token } = await createTestUser({
          username: "testuser2",
          email: "user2@email.com",
          password: "P@ssword123",
        });
        const query = `mutation addTeamMember($teamId: ID!, $memberName: String!) {
          addTeamMember(teamId: $teamId, memberName: $memberName) {
            success
            team {
              _id
              members
            }
          }
        }`;
        // using id of team created for first testUser
        const variables = { teamId, memberName: "Kramer" };
        const response = await gqlRequest({ query, variables, token });
        const { data } = response.body;
        expect(data.addTeamMember).toMatchObject({
          success: false,
          team: null,
        });
      });
    });

    describe("remove member", () => {
      beforeEach(async () => {});

      test("remove member from a team", async () => {
        const query = `mutation removeTeamMember($teamId: ID!, $memberName: String!) {
          removeTeamMember(teamId: $teamId, memberName: $memberName) {
            success
            team {
              _id
              members
            }
          }
        }`;
        const variables = { teamId, memberName: "Elaine" };
        const response = await gqlRequest({ query, variables, token });
        expectNoGqlErrors(response);
        expect(response.body.data.removeTeamMember).toMatchObject({
          success: true,
          team: {
            _id: teamId,
            members: expect.not.arrayContaining(["Elaine"]),
          },
        });
      });

      test("can only update own team", async () => {
        const { token } = await createTestUser({
          username: "testuser2",
          email: "user2@email.com",
          password: "P@ssword123",
        });
        const query = `mutation removeTeamMember($teamId: ID!, $memberName: String!) {
          removeTeamMember(teamId: $teamId, memberName: $memberName) {
            success
            team {
              _id
              members
            }
          }
        }`;
        // use teamId of team belonging to first testUser
        const variables = { teamId, memberName: "Elaine" };
        const response = await gqlRequest({ query, variables, token });
        const { data } = response.body;
        expect(data.removeTeamMember).toMatchObject({
          success: false,
          team: null,
        });
      });
    });
  });
});

describe("me query", () => {
  let token;
  beforeEach(async () => {
    ({ token } = await createTestUser());
    expect(token).not.toBeNull();
  });

  it("should return user data", async () => {
    const query = `query me {
      me {
        _id
        email
        username
        teams {
          name
        }
      }
    }`;
    const variables = {
      email: testUserInput.email,
      password: testUserInput.password,
    };
    const response = await gqlRequest({ query, variables, token });
    expectNoGqlErrors(response);
    expect(response.body.data.me).toMatchObject({
      _id: expect.any(String),
      username: testUserInput.username,
      email: testUserInput.email,
      teams: [],
    });
  });
});
