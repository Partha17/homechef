import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/orders", label: "Orders", icon: "📋" },
  { path: "/menu", label: "Menu", icon: "🍛" },
  { path: "/customers", label: "Customers", icon: "👥" },
  { path: "/analytics", label: "Analytics", icon: "📈" },
  { path: "/ai-settings", label: "AI Settings", icon: "🤖" },
];

export default function Layout() {
  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>HomeChef</h2>
        </div>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}