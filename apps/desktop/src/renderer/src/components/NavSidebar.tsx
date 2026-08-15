import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/actions", label: "Actions" },
  { to: "/waiting", label: "Waiting" },
  { to: "/documents", label: "Documents" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
];

export function NavSidebar() {
  return (
    <nav className="sidebar" aria-label="Primary">
      <div className="sidebar-brand">Clerk</div>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
