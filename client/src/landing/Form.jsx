import { Link } from "react-router-dom";

export function Label(props) {
  return <label className="block pb-1" {...props} />;
}

export function Input(props) {
  return (
    <input
      className="p-3 rounded shadow block w-full mb-3 focus-visible:outline-blue-500"
      {...props}
    />
  );
}

export function Form({ onSubmit, children }) {
  return (
    <form onSubmit={onSubmit} className="w-full px-6 max-w-md">
      {children}
    </form>
  );
}

export function Heading({ children }) {
  return <h2 className="text-center font-bold text-2xl pb-8">{children}</h2>;
}

export function Card({ children }) {
  return (
    <div className="bg-white rounded p-6 shadow-xl border-t-4 border-blue-500">
      {children}
    </div>
  );
}

export function SubmitButton({ children }) {
  return (
    <button className="focus-visible:outline-blue-500 rounded bg-blue-500 text-white block w-full py-2 text-lg shadow mt-8 transition hover:bg-blue-600  active:bg-blue-100 active:shadow-gray-700  active:text-gray-700">
      {children}
    </button>
  );
}

export function LinkButton({ children, to }) {
  return (
    <Link
      to={to}
      className="focus-visible:outline-blue-500 rounded border text-gray-700 border-gray-500 block w-full py-2 text-lg shadow transition hover:bg-gray-500 hover:text-white  active:bg-gray-200 active:shadow-gray-700  active:text-gray-700 text-center"
    >
      {children}
    </Link>
  );
}

export function Divider({ children }) {
  return (
    <div className="relative flex py-2 items-center">
      <div className="flex-grow border-t border-gray-400"></div>
      <span className="flex-shrink mx-4 text-gray-400">{children}</span>
      <div className="flex-grow border-t border-gray-400"></div>
    </div>
  );
}
