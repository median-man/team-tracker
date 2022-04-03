const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.test.local") });
const { startServer } = require("../server");
const db = require("../config/connection");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { Note } = require("../models");

let httpServer;
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

const testTeamInput = {
  name: "Test Team",
  memberNames: ["Jerry", "Elaine"],
};

const testNoteInput = {
  body: "According to most studies, people’s number one fear is public speaking. Number two is death. Death is number two. Does that sound right? This means to the average person, if you go to a funeral, you’re better off in the casket than doing the eulogy.",
};

/**
 * Returns a new test user and token.
 */
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

const createTestTeam = async (token, teamInput = testTeamInput) => {
  const query = `mutation createTeam($teamInput: TeamInput!) {
    createTeam(teamInput: $teamInput) {
      success
      team {
        _id
        name
        memberNames
      }
    }
  }`;
  const variables = { teamInput };
  const response = await gqlRequest({ query, variables, token });
  expectNoGqlErrors(response);
  return response.body.data.createTeam;
};

const createTestNote = async (token, teamId, { body } = testNoteInput) => {
  // add a note to the team
  const query = `
      mutation createNote($teamId: ID!, $noteInput: NoteInput!) {
        createNote(teamId: $teamId, noteInput: $noteInput) {
          success
          note {
            _id
            body
          }
        }
      }`;
  const variables = {
    teamId,
    noteInput: { body },
  };
  const response = await gqlRequest({ query, variables, token });
  // assert that no gql errors occurred
  expectNoGqlErrors(response);
  return response.body.data.createNote;
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
  beforeEach(async () => {
    ({ token, user } = await createTestUser());
    expect(token).not.toBeNull();
  });

  test("create a team", async () => {
    const teamResponse = await createTestTeam(token);
    expect(teamResponse).toEqual({
      success: true,
      team: {
        _id: expect.any(String),
        name: testTeamInput.name,
        memberNames: testTeamInput.memberNames,
      },
    });
  });

  describe("update a team", () => {
    let teamId;
    beforeEach(async () => {
      const { team } = await createTestTeam(token);
      teamId = team._id;
    });

    test("update team name", async () => {
      const name = "No Soup for You";
      const query = `
        mutation updateTeam($teamId: ID!, $teamInput: TeamInput!) {
          updateTeam(teamId: $teamId, teamInput: $teamInput) {
            success
            team {
              _id
              name
            }
          }
        }
      `;
      const variables = { teamId, teamInput: { name } };
      const response = await gqlRequest({ query, variables, token });
      expectNoGqlErrors(response);
      expect(response.body.data.updateTeam).toEqual({
        success: true,
        team: { _id: teamId, name },
      });
    });

    test("can only update own team", async () => {
      ({ token } = await createTestUser({
        username: "Newman",
        email: "newman@email.com",
        password: "P@ssword1",
      }));
      const name = "No Soup for You";
      const query = `
        mutation updateTeam($teamId: ID!, $teamInput: TeamInput!) {
          updateTeam(teamId: $teamId, teamInput: $teamInput) {
            success
            team {
              _id
              name
            }
          }
        }
      `;
      const variables = { teamId, teamInput: { name } };
      const response = await gqlRequest({ query, variables, token });
      expectNoGqlErrors(response);
      expect(response.body.data.updateTeam).toEqual({
        success: false,
        team: null,
      });
    });

    describe("add member", () => {
      test("add a member to a team", async () => {
        const memberName = "Kramer";
        const query = `mutation addTeamMember($teamId: ID!, $memberName: String!) {
            addTeamMember(teamId: $teamId, memberName: $memberName) {
              success
              team {
                _id
                memberNames
              }
            }
          }`;
        const variables = { teamId, memberName };
        const response = await gqlRequest({ query, variables, token });
        expectNoGqlErrors(response);
        expect(response.body.data.addTeamMember).toMatchObject({
          success: true,
          team: {
            _id: teamId,
            memberNames: expect.arrayContaining([memberName]),
          },
        });
      });

      test("request must include auth", async () => {
        const query = `mutation addTeamMember($teamId: ID!, $memberName: String!) {
          addTeamMember(teamId: $teamId, memberName: $memberName) {
            team {
              _id
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
      test("remove member from a team", async () => {
        const memberName = "Elaine";
        const query = `mutation removeTeamMember($teamId: ID!, $memberName: String!) {
          removeTeamMember(teamId: $teamId, memberName: $memberName) {
            success
            team {
              _id
              memberNames
            }
          }
        }`;
        const variables = { teamId, memberName };
        const response = await gqlRequest({ query, variables, token });
        expectNoGqlErrors(response);
        expect(response.body.data.removeTeamMember).toMatchObject({
          success: true,
          team: {
            _id: teamId,
            memberNames: expect.not.arrayContaining([memberName]),
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

    describe("update app", () => {
      test("set the app field for a team", async () => {
        const query = `mutation updateApp($teamId: ID!, $appInput: AppInput!) {
          updateApp(teamId: $teamId, appInput: $appInput) {
            success
            team {
              _id
              app {
                title
                repoUrl
                url
              }
            }
          }
        }`;
        const variables = {
          teamId,
          appInput: {
            title: "Test App",
            repoUrl: "https://github.com/median-man/test-app",
            url: "https://www.test-app.com",
          },
        };
        const response = await gqlRequest({ query, variables, token });
        expectNoGqlErrors(response);
        expect(response.body.data.updateApp).toMatchObject({
          success: true,
          team: {
            _id: teamId,
          },
        });
      });

      test("can only update an app for own team", async () => {
        const { token } = await createTestUser({
          username: "testuser2",
          email: "user2@email.com",
          password: "P@ssword123",
        });
        const query = `mutation updateApp($teamId: ID!, $appInput: AppInput!) {
          updateApp(teamId: $teamId, appInput: $appInput) {
            success
            team {
              _id
              app {
                title
                repoUrl
                url
              }
            }
          }
        }`;
        const variables = {
          teamId,
          appInput: {
            title: "Test App",
            repoUrl: "https://github.com/median-man/test-app",
            url: "https://www.test-app.com",
          },
        };
        const response = await gqlRequest({ query, variables, token });
        expect(response.body.data.updateApp).toMatchObject({
          success: false,
          team: null,
        });
      });
    });
  });
});

describe("notes", () => {
  let token;
  let team;

  beforeEach(async () => {
    ({ token } = await createTestUser());
    ({ team } = await createTestTeam(token));
  });

  describe("create a note", () => {
    test("create a new note", async () => {
      const createNoteResponse = await createTestNote(token, team._id);
      // assert the return values match expected values
      expect(createNoteResponse).toMatchObject({
        success: true,
        note: { _id: expect.any(String), ...testNoteInput },
      });
    });

    test("can only add notes to own teams", async () => {
      // create a second user which will try to create a team for the testUser
      const { token } = await createTestUser({
        username: "user2",
        email: "user2@email.com",
        password: "P@ssword123",
      });
      const createNoteResult = await createTestNote(
        token,
        team._id,
        testNoteInput
      );
      expect(createNoteResult).toMatchObject({
        success: false,
      });
    });
  });

  describe("edit a note", () => {
    let note;

    beforeEach(async () => {
      ({ note } = await createTestNote(token, team._id));
    });

    test("update note body", async () => {
      const query = `
        mutation updateNote($noteId: ID!, $noteInput: NoteInput!) {
          updateNote(noteId: $noteId, noteInput: $noteInput) {
            success
            note {
              _id
              body
            }
          }
        }`;
      const noteInput = {
        body: "Jerry, just remember, it's not a lie if you believe it.",
      };
      const variables = { noteId: note._id, noteInput };
      const response = await gqlRequest({ query, variables, token });
      expectNoGqlErrors(response);
      expect(response.body.data.updateNote).toMatchObject({
        success: true,
        note: expect.objectContaining({
          _id: expect.any(String),
          body: noteInput.body,
        }),
      });
    });

    test("can only update own notes", async () => {
      // login as different user
      const { token } = await createTestUser({
        username: "OtherUser",
        email: "other@email.com",
        password: "P@ssword123",
      });

      // try to update other user's note
      const query = `
        mutation updateNote($noteId: ID!, $noteInput: NoteInput!) {
          updateNote(noteId: $noteId, noteInput: $noteInput) {
            success
            note {
              _id
              body
            }
          }
        }`;
      const noteInput = {
        body: "Jerry, just remember, it's not a lie if you believe it.",
      };
      const variables = { noteId: note._id, noteInput };
      const response = await gqlRequest({ query, variables, token });

      // assert failed update
      expect(response.body.data.updateNote).toMatchObject({
        success: false,
        note: null,
      });
    });
  });

  describe("delete a note", () => {
    let note;

    beforeEach(async () => {
      ({ note } = await createTestNote(token, team._id));
    });

    const deleteNoteMutation = ({ noteId, token }) => {
      const query = `
        mutation deleteNote($noteId: ID!) {
          deleteNote(noteId: $noteId) {
            success
            note {
              _id
            }
          }
        }`;
      const variables = { noteId };
      return gqlRequest({ query, variables, token });
    };

    test("completely removes the note", async () => {
      const response = await deleteNoteMutation({ noteId: note._id, token });
      expectNoGqlErrors(response);
      expect(response.body.data.deleteNote).toEqual({
        success: true,
        note: null,
      });
      // assert that Note removed from the db
      expect(await Note.findById(note._id)).toBeNull();
    });

    test("responds with success: false when no note is found", async () => {
      const response = await deleteNoteMutation({
        noteId: "000000000000000000000000",
        token,
      });
      expectNoGqlErrors(response);
      expect(response.body.data.deleteNote).toEqual({
        success: false,
        note: null,
      });
    });

    test("can only delete own notes", async () => {
      // create a second user who will attempt to delete testUser's note
      ({ token } = await createTestUser({
        username: "other",
        email: "other@email.com",
        password: "P@ssword1",
      }));
      const response = await deleteNoteMutation({ noteId: note._id, token });
      expectNoGqlErrors(response);
      expect(response.body.data.deleteNote).toEqual({
        success: false,
        note: null,
      });
    });
  });
});

describe("me query", () => {
  let token;
  let team;
  beforeEach(async () => {
    ({ token } = await createTestUser());
    expect(token).not.toBeNull();
    ({ team } = await createTestTeam(token));
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
      teams: [{ name: testTeamInput.name }],
    });
  });

  test("find team by id", async () => {
    // create a second team which will be used to test the _id param on me.teams
    const { team } = await createTestTeam(token, {
      name: "The Double Dippers",
    });
    const query = `query findTeam($teamId: ID!) {
      me {
        teams(_id: $teamId) {
          _id
          name
        }
      }
    }`;
    const variables = { teamId: team._id };
    const response = await gqlRequest({ query, variables, token });
    expectNoGqlErrors(response);
    expect(response.body.data.me).toEqual({
      teams: [{ _id: team._id, name: "The Double Dippers" }],
    });
  });

  test("query notes for a team", async () => {
    const { note } = await createTestNote(token, team._id);
    const query = `query findTeamNotes($teamId: ID!) {
      me {
        teams(_id: $teamId) {
          notes {
            _id
            body
          }
        }
      }
    }`;
    const variables = { teamId: team._id };
    const response = await gqlRequest({ query, variables, token });
    expectNoGqlErrors(response);
    expect(response.body.data.me).toEqual({
      teams: [{ notes: [note] }],
    });
  });
});
