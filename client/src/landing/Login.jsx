import { Link } from "react-router-dom";

function Label(props) {
  return <label className="block pb-1" {...props} />;
}

function Input(props) {
  return (
    <input
      className="p-3 rounded shadow block w-full mb-3 focus-visible:outline-blue-500"
      {...props}
    />
  );
}

export function Login() {
  const handleFormSubmit = (event) => {
    event.preventDefault();
  };
  return (
    <main className="grow flex justify-center items-center py-3">
      <form onSubmit={handleFormSubmit} className="w-full px-6 max-w-md">
        <h2 className="text-center font-bold text-2xl pb-8">Sign In</h2>
        <div className="bg-white rounded p-6 shadow-xl border-t-4 border-blue-500">
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
          <button className="focus-visible:outline-blue-500 rounded bg-blue-500 text-white block w-full py-2 text-lg shadow mt-8 transition hover:bg-blue-600  active:bg-blue-100 active:shadow-gray-700  active:text-gray-700">
            Sign in
          </button>
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-400"></div>
            <span className="flex-shrink mx-4 text-gray-400">or</span>
            <div className="flex-grow border-t border-gray-400"></div>
          </div>
          <Link to="/signup" className="focus-visible:outline-blue-500 rounded border text-gray-700 border-gray-500 block w-full py-2 text-lg shadow transition hover:bg-gray-500 hover:text-white  active:bg-gray-200 active:shadow-gray-700  active:text-gray-700 text-center">Sign up</Link>
        </div>
      </form>
    </main>
  );
}
