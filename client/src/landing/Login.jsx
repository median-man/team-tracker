import {
  Label,
  Input,
  Form,
  Heading,
  Card,
  SubmitButton,
  LinkButton,
  Divider,
} from "./Form";
import { Wrapper } from "./Wrapper";

export function Login() {
  const handleFormSubmit = (event) => {
    event.preventDefault();
  };
  return (
    <Wrapper>
      <Form onSubmit={handleFormSubmit}>
        <Heading>Sign In</Heading>
        <Card>
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            name="email"
            id="email"
            placeholder="enter your email"
          />
          <Label htmlFor="password">Password</Label>
          <Input
            type="password"
            name="password"
            id="password"
            placeholder="enter a password"
          />
          <SubmitButton>Sign in</SubmitButton>
          <Divider>or</Divider>
          <LinkButton to="/signup">Sign up</LinkButton>
        </Card>
      </Form>
    </Wrapper>
  );
}
