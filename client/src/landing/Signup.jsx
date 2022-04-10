import {
  Divider,
  Label,
  Input,
  Form,
  Heading,
  Card,
  SubmitButton,
  LinkButton,
} from "./Form";
import { Wrapper } from "./Wrapper";

export function Signup() {
  const handleFormSubmit = (event) => {
    event.preventDefault();
  };
  return (
    <Wrapper>
      <Form onSubmit={handleFormSubmit}>
        <Heading>Create an Account</Heading>
        <p className="pb-8">
          Creating an account enables you to start tracking the progress of your
          teams and keep a log.
        </p>
        <Card>
          <Label htmlFor="username">Username</Label>
          <Input
            type="text"
            name="username"
            id="username"
            placeholder="create a username"
          />
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
          <SubmitButton>Create account</SubmitButton>
          <Divider>Already have an account?</Divider>
          <LinkButton to="/login">Sign in</LinkButton>
        </Card>
      </Form>
    </Wrapper>
  );
}
