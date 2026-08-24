import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navByRole = {
  donor: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/projects', label: 'Projects' },
    { to: '/approvals', label: 'Approvals' },
    { to: '/transactions', label: 'Transactions' },
    { to: '/reports', label: 'Reports' },
  ],
  recipient: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/projects', label: 'Projects' },
    { to: '/payment-requests/new', label: 'New Request' },
    { to: '/payment-requests', label: 'My Requests' },
    { to: '/payees', label: 'Payees' },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/projects', label: 'Projects' },
    { to: '/users', label: 'Users' },
    { to: '/audit-logs', label: 'Audit Logs' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = navByRole[user?.role] ?? [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-900 text-white flex flex-col">
        <div className="p-6 border-b border-brand-700">
          <h1 className="text-xl font-bold tracking-tight">DonorFlow</h1>
          <p className="text-brand-100 text-xs mt-1">Purpose-bound accountability</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-brand-100 hover:bg-brand-700'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-700">
          <div className="text-sm text-brand-100 mb-2">
            <p className="font-medium text-white">{user?.fullName}</p>
            <p className="capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm rounded-lg hover:bg-brand-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
