import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { NAV } from "../nav";
import { useAuth } from "../auth/AuthContext";
import { IconBus, IconClose, IconLogout, IconMenu } from "./icons";
import "./Layout.less";

export function Layout() {
  const { username, logout } = useAuth();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);

  const active = NAV.find((n) => location.pathname.startsWith(n.to)) ?? NAV[0];

  return (
    <div className={`layout${drawer ? " layout--drawer" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">
            <IconBus />
          </span>
          <span className="sidebar__brand-text">
            <b>zbiorkom</b>
            <span>.live · admin</span>
          </span>
          <button
            className="sidebar__close"
            aria-label="Zamknij menu"
            onClick={() => setDrawer(false)}
          >
            <IconClose />
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar__link${isActive ? " is-active" : ""}`
              }
            >
              <Icon className="sidebar__link-icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="sidebar__user">
            <span className="sidebar__avatar">
              {(username ?? "?").slice(0, 1).toUpperCase()}
            </span>
            <div className="sidebar__user-meta">
              <b>{username ?? "—"}</b>
              <span>administrator</span>
            </div>
          </div>
          <button className="btn btn--ghost sidebar__logout" onClick={() => void logout()}>
            <IconLogout /> Wyloguj
          </button>
        </div>
      </aside>

      {drawer && (
        <div
          className="layout__scrim"
          onClick={() => setDrawer(false)}
          aria-hidden
        />
      )}

      <div className="main">
        <header className="topbar">
          <button
            className="topbar__menu"
            aria-label="Otwórz menu"
            onClick={() => setDrawer(true)}
          >
            <IconMenu />
          </button>
          <div className="topbar__titles">
            <h1>{active.label}</h1>
            <p>{active.desc}</p>
          </div>
        </header>

        <main className="content">
          <div className="content__inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
