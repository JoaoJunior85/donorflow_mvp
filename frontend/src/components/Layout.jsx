import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Icon } from './UI';

const navByRole = {
  donor: [
    { to: '/dashboard', label: 'Dashboard', icon: 'home' },
    { to: '/projects', label: 'Projects', icon: 'projects' },
    { to: '/approvals', label: 'Approvals', icon: 'shield' },
    { to: '/transactions', label: 'Transactions', icon: 'transfer' },
    { to: '/reports', label: 'Reports', icon: 'report' },
  ],
  recipient: [
    { to: '/dashboard', label: 'Dashboard', icon: 'chart' },
    { to: '/projects', label: 'Projects', icon: 'folder' },
    { to: '/payment-requests/new', label: 'New Request', icon: 'plus-document' },
    { to: '/payment-requests', label: 'My Requests', icon: 'hourglass' },
    { to: '/payees', label: 'Payees', icon: 'user' },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: 'building' },
    { to: '/projects', label: 'Projects', icon: 'projects' },
    { to: '/payees', label: 'Payees', icon: 'user' },
    { to: '/users', label: 'Users', icon: 'users' },
    { to: '/audit-logs', label: 'Audit Logs', icon: 'report' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const links = navByRole[user?.role] ?? [];

  const loadNotifications = () => {
    if (!user?.role || !['donor', 'admin'].includes(user.role)) {
      setNotifications([]);
      return;
    }

    api
      .getDashboard()
      .then((data) => {
        if (user.role === 'donor') {
          setNotifications(
            data.pendingApprovals > 0
              ? [{ label: `${data.pendingApprovals} payment request(s) awaiting approval`, to: '/approvals' }]
              : []
          );
          return;
        }

        const items = [];
        if (data.pendingPayees > 0) {
          items.push({ label: `${data.pendingPayees} payee(s) awaiting verification`, to: '/payees' });
        }
        if (data.flaggedRequests > 0) {
          items.push({ label: `${data.flaggedRequests} flagged request(s) need attention`, to: '/projects' });
        }
        setNotifications(items);
      })
      .catch(() => setNotifications([]));
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.role, location.pathname]);

  useEffect(() => {
    const handleRefresh = () => loadNotifications();
    window.addEventListener('donorflow:refresh-dashboard', handleRefresh);
    return () => window.removeEventListener('donorflow:refresh-dashboard', handleRefresh);
  }, [user?.role]);

  const handleNotificationClick = () => {
    if (user?.role === 'donor') {
      navigate('/approvals');
      return;
    }

    if (user?.role === 'admin') {
      navigate('/payees');
      return;
    }

    setNotificationOpen((open) => !open);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] lg:flex">
      {menuOpen && <button aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-20 bg-[#092d43]/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col bg-brand-900 text-white shadow-2xl transition-transform duration-300 lg:static lg:w-64 lg:translate-x-0 lg:shadow-none ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="border-b border-white/10 p-5">
          <div className="brand-logo dashboard-logo sidebar-logo"><img src="/images/donorflow_badge_sidebar_clean.png" alt="DonorFlow" /></div>
          <p className="mt-2 text-xs text-brand-100">Funds · Projects · Impact</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `sidebar-nav-link flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive ? 'sidebar-nav-link-active bg-brand-500 text-white shadow-lg shadow-black/10' : 'text-brand-100 hover:bg-white/10'
                }`
              }
              onClick={() => setMenuOpen(false)}
            >
              <Icon name={link.icon} size={24} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="sidebar-profile mb-3 flex items-center gap-3 rounded-xl p-3">
            <div className="user-avatar user-avatar-sidebar" aria-label="User profile"><Icon name="user" size={24} /></div>
            <div className="min-w-0 text-sm text-brand-100">
              <p className="truncate font-semibold text-white">{user?.fullName}</p>
              <p className="capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto">
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur lg:hidden">
          <button onClick={() => setMenuOpen(true)} className="rounded-xl p-2 text-brand-900 hover:bg-brand-50" aria-label="Open navigation">
            <Icon name="menu" size={22} />
          </button>
          <div className="brand-logo dashboard-logo mobile-logo"><img src="/images/donorflow_badge_clean.png" alt="DonorFlow" /></div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                className="notification-button relative"
                aria-label={notifications.length ? `${notifications.length} notifications` : 'No notifications'}
                title="Notifications"
                onClick={handleNotificationClick}
              >
                <Icon name="bell" size={20} />
                {notifications.length > 0 && (
                  <span className="notification-count" aria-label={`${notifications.length} notifications`}>
                    {notifications.length}
                  </span>
                )}
              </button>
              {notificationOpen && notifications.length > 0 && (
                <div className="absolute right-0 top-12 z-40 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notifications</p>
                  <div className="space-y-2">
                    {notifications.map((item, index) => (
                      <NavLink
                        key={`${item.label}-${index}`}
                        to={item.to}
                        onClick={() => setNotificationOpen(false)}
                        className="block rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="user-avatar user-avatar-mobile" aria-label="User profile"><Icon name="user" size={23} /></div>
          </div>
        </header>

        <div className="hidden border-b border-slate-200/80 bg-white/80 px-6 py-4 backdrop-blur lg:flex lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-900/60">DonorFlow</p>
            <h2 className="text-sm font-semibold text-slate-700">Operations overview</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                className="notification-button relative"
                aria-label={notifications.length ? `${notifications.length} notifications` : 'No notifications'}
                title="Notifications"
                onClick={handleNotificationClick}
              >
                <Icon name="bell" size={18} />
                {notifications.length > 0 && (
                  <span className="notification-count" aria-label={`${notifications.length} notifications`}>
                    {notifications.length}
                  </span>
                )}
              </button>
              {notificationOpen && notifications.length > 0 && (
                <div className="absolute right-0 top-11 z-40 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notifications</p>
                  <div className="space-y-2">
                    {notifications.map((item, index) => (
                      <NavLink
                        key={`${item.label}-${index}`}
                        to={item.to}
                        onClick={() => setNotificationOpen(false)}
                        className="block rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="user-avatar user-avatar-mobile" aria-label="User profile"><Icon name="user" size={18} /></div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900">{user?.fullName}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="page-enter mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061c2b]/55 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close logout confirmation"
            onClick={() => setLogoutConfirmOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="logout-dialog relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="logout-dialog-icon"><Icon name="logout" size={22} /></div>
            <h2 id="logout-title" className="mt-4 text-lg font-bold text-brand-900">Sign out?</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Your session will be closed securely.</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
