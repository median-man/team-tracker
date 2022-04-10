import { fireEvent, render, screen } from "../util/testUtils";
import userEvent from "@testing-library/user-event";
import { graphql } from "msw";
import { setupServer } from "msw/node";
import { Signup } from "./Signup";

const server = setupServer(
  graphql.mutation("CreateUser", (req, res, ctx) =>
    res(
      ctx.data({
        createUser: {
          user: {
            _id: "6252cee3fe89582ec32525ef",
            email: req.variables.email,
            username: req.variables.username,
          },
        },
      })
    )
  )
);

beforeAll(() => server.listen());
afterAll(() => server.close());

test("renders a Signup component", () => {
  render(<Signup />);
});

test("displays a loading indicator after user clicks submit", async () => {
  render(<Signup />);

  // fake values for testing
  const username = "sandsOfArrakis";
  const email = "paul@houseatreides.net";
  const password = "mu@dD1b";

  // type in form values
  userEvent.type(screen.getByRole("textbox", { name: /username/i }), username);
  userEvent.type(screen.getByRole("textbox", { name: /email/i }), email);
  userEvent.type(screen.getByLabelText(/password/i), password);

  userEvent.click(screen.getByRole("button", { name: /create account/i }));

  // manually fire transitionEnd (testing library doesn't simulate this)
  fireEvent.transitionEnd(await screen.findByTestId("fade"));

  const loadingMessage = await screen.findByRole("alert");
  expect(loadingMessage).toHaveTextContent(/creating your account/i);
  expect(loadingMessage).toBeVisible();
});

test.todo("user cannot submit while loading");
test.todo("redirects after successful login");
test.todo("displays an alert message when login fails");
test.todo("displays message for failed username validation");
test.todo("displays message for failed email validation");
test.todo("displays message for failed password validation");
