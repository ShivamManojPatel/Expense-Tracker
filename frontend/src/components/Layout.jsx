import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'ti-layout-dashboard', end: true },
  { to: '/transactions', label: 'Transactions', icon: 'ti-receipt' },
  { to: '/subscriptions', label: 'Subscriptions', icon: 'ti-calendar-event' },
  { to: '/goals', label: 'Goals', icon: 'ti-target-arrow' },
  { to: '/savings', label: 'Savings', icon: 'ti-pig' },
  { to: '/debts', label: 'Debts', icon: 'ti-hand-stop' },
  { to: '/analytics', label: 'Analytics', icon: 'ti-chart-donut' },
  { to: '/settings', label: 'Settings', icon: 'ti-settings' }
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          Ledger<span className="tick">/{user?.currency || 'USD'}</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
            >
              <i className={`ti ${item.icon}`} aria-hidden="true"></i>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          Signed in as {user?.name}
          <br />
          <button className="sidebar-user-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="content-col">
        <header className="topbar">
          <GlobalSearch />
          <div className="topbar-actions">
            <NotificationBell />
            {/* Sidebar (with its own logout button) is hidden below 860px, so this
                is the only always-visible logout control on mobile — see .mobile-logout-btn */}
            <button className="icon-btn mobile-logout-btn" onClick={logout} aria-label="Log out">
              <i className="ti ti-logout"></i>
            </button>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <i className={`ti ${item.icon}`} aria-hidden="true"></i>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}