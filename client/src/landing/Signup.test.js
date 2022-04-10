import { BrowserRouter as Router } from "react-router-dom";
import { render } from "@testing-library/react";
import { Signup } from "./Signup";

test("renders a Signup component", () => {
  render(
    <Router>
      <Signup />
    </Router>
  );
});

test.todo("displays a spinner while loading");
test.todo("user cannot submit while loading");
test.todo("redirects after successful login");
test.todo("displays an alert message when login fails");
test.todo("displays message for failed username validation");
test.todo("displays message for failed email validation");
test.todo("displays message for failed password validation");
