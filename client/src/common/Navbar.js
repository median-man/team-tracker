import { NavLink } from "react-router-dom";
import { MenuIcon } from "@heroicons/react/solid";
import { useAuth } from "../util/auth";
import { useState } from "react";
import { Collapse } from "./Collapse";

// Classes shared by buttons and links in the navigation menu
const navItemClasses =
  "hover:bg-blue-400 focus:bg-blue-400 focus:outline-none px-4 py-1 active:bg-blue-300 transition-color";

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button className={`${navItemClasses} w-full text-left`} onClick={logout}>
      Logout
    </button>
  );
}

export default function Navbar() {
  const { isLoggedIn } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const toggleMenu = () => setIsMenuOpen((isMenuOpen) => !isMenuOpen);

  return (
    <header className="bg-blue-500 text-white flex justify-between items-center flex-wrap md:min-h-full md:block">
      <h1 className="text-2xl font-medium pb-2 py-2 px-3 grow">Team Tracker</h1>
      <button onClick={toggleMenu} className="h-6 w-6 mr-3 grow-0 md:hidden" aria-label="toggle navigation menu">
        <MenuIcon />
      </button>
      <Collapse className="w-full" open={isMenuOpen}>
        <nav className={`flex flex-col pb-4`}>
          {isLoggedIn ? (
            <>
              <NavLink className={navItemClasses} to="/dashboard">
                Dashboard
              </NavLink>
              <NavLink className={navItemClasses} to="/teams/add">
                Add Team
              </NavLink>
              <NavLink className={navItemClasses} to="/teams/1">
                Team
              </NavLink>
              <NavLink className={navItemClasses} to="/teams/1/members">
                Members
              </NavLink>
              <NavLink className={navItemClasses} to="/teams/1/notes/add">
                Add Note
              </NavLink>
              <LogoutButton />
            </>
          ) : (
            <>
              <NavLink className={navItemClasses} to="/">
                About
              </NavLink>
              <NavLink className={navItemClasses} to="/login">
                Login
              </NavLink>
              <NavLink className={navItemClasses} to="/signup">
                Signup
              </NavLink>
              {/* temporarily render links to protected routes */}
              <NavLink className={navItemClasses} to="/dashboard">
                Dashboard
              </NavLink>
              <NavLink className={navItemClasses} to="/teams/add">
                Add Team
              </NavLink>
              <NavLink className={navItemClasses} end to="/teams/1">
                Team
              </NavLink>
              <NavLink className={navItemClasses} to="/teams/1/members">
                Members
              </NavLink>
              <NavLink className={navItemClasses} to="/teams/1/notes/add">
                Add Note
              </NavLink>
              <LogoutButton />
            </>
          )}
        </nav>
      </Collapse>
    </header>
  );
}
