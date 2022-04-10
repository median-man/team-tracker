import { ApolloProvider } from "@apollo/client";
import { render as rtlRender } from "@testing-library/react";
import { client } from "./apolloClient";
import { BrowserRouter as Router } from "react-router-dom";

const TestWrapper = ({ children }) => (
  <ApolloProvider client={client}>
    <Router>{children}</Router>
  </ApolloProvider>
);

const render = (ui, options = {}) => {
  return rtlRender(ui, { wrapper: TestWrapper, ...options });
};

export * from "@testing-library/react";
export { render };
