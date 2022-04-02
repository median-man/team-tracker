const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.test.local") });
const { startServer } = require("../server");
const db = require("../config/connection");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { Note } = require("../models");

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

const testTeamInput = {
  name: "Test Team",
  members: ["Jerry", "Elaine"],
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

const createTestTeam = async (token) => {
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
  const variables = { teamInput: testTeamInput };
  const response = await gqlRequest({ query, variables, token });
  expectNoGqlErrors(response);
  return response.body.data.createTeam;
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
    const teamResponse = await createTestTeam(token);
    expect(teamResponse).toEqual(
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
      const { team } = await createTestTeam(token);
      teamId = team._id;
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
  const noteData = {
    body: "According to most studies, people’s number one fear is public speaking. Number two is death. Death is number two. Does that sound right? This means to the average person, if you go to a funeral, you’re better off in the casket than doing the eulogy.",
  };

  beforeEach(async () => {
    ({ token } = await createTestUser());
    ({ team } = await createTestTeam(token));
  });

  const createNote = async (
    { body } = noteData,
    { authToken } = { authToken: token } // options
  ) => {
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
      teamId: team._id,
      noteInput: { body },
    };
    const response = await gqlRequest({ query, variables, token: authToken });
    // assert that no gql errors occurred
    expectNoGqlErrors(response);
    return response.body.data.createNote;
  };

  describe("create a note", () => {
    test("create a new note", async () => {
      const createNoteResponse = await createNote();
      // assert the return values match expected values
      expect(createNoteResponse).toMatchObject({
        success: true,
        note: { _id: expect.any(String), ...noteData },
      });
    });

    test("can only add notes to own teams", async () => {
      // create a second user which will try to create a team for the testUser
      const { token } = await createTestUser({
        username: "user2",
        email: "user2@email.com",
        password: "P@ssword123",
      });
      const createNoteResult = await createNote(noteData, {
        authToken: token,
      });
      expect(createNoteResult).toMatchObject({
        success: false,
      });
    });
  });

  describe("edit a note", () => {
    let note;

    beforeEach(async () => {
      ({ note } = await createNote());
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
      ({ note } = await createNote());
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
  beforeEach(async () => {
    ({ token } = await createTestUser());
    expect(token).not.toBeNull();
    await createTestTeam(token);
  });

  it("should return user data", async () => {
    const query = `query me {
      me {
        _id
        email
        username
        teams {
          name
          members
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
      teams: [testTeamInput],
    });
  });

  test.todo("should return all my teams");
  test.todo("should return a team given an optional teamId param");
  test.todo("should return the notes for a given teamId");
});
