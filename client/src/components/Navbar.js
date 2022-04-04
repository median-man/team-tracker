import { NavLink } from "react-router-dom";
import { useAuth } from "../util/auth";
import "./Navbar.css";

export default function Navbar() {
  const { isLoggedIn, logout } = useAuth();
  return (
    <nav className="navbar">
      {isLoggedIn ? (
        <>
          <NavLink to="/dashboard" className="navbar-link">
            Dashboard
          </NavLink>
          <NavLink to="/teams/add" className="navbar-link">
            Add Team
          </NavLink>
          <NavLink to="/teams/1" className="navbar-link">
            Team
          </NavLink>
          <NavLink to="/teams/1/members" className="navbar-link">
            Members
          </NavLink>
          <NavLink to="/teams/1/notes/add" className="navbar-link">
            Add Note
          </NavLink>
          <button className="navbar-link" onClick={logout}>
            Logout
          </button>
        </>
      ) : (
        <>
          <NavLink to="/" className="navbar-link">
            About
          </NavLink>
          <NavLink to="/login" className="navbar-link">
            Login
          </NavLink>
          <NavLink to="/signup" className="navbar-link">
            Signup
          </NavLink>
          {/* temporarily render links to protected routes */}
          <NavLink to="/dashboard" className="navbar-link">
            Dashboard
          </NavLink>
          <NavLink to="/teams/add" className="navbar-link">
            Add Team
          </NavLink>
          <NavLink end to="/teams/1" className="navbar-link">
            Team
          </NavLink>
          <NavLink to="/teams/1/members" className="navbar-link">
            Members
          </NavLink>
          <NavLink to="/teams/1/notes/add" className="navbar-link">
            Add Note
          </NavLink>
          <button className="navbar-link" onClick={logout}>
            Logout
          </button>
        </>
      )}
    </nav>
  );
}
