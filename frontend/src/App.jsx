import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import PaymentRequestsPage from './pages/PaymentRequestsPage';
import NewPaymentRequestPage from './pages/NewPaymentRequestPage';
import ApprovalsPage from './pages/ApprovalsPage';
import TransactionsPage from './pages/TransactionsPage';
import ReportsPage from './pages/ReportsPage';
import PayeesPage from './pages/PayeesPage';
import UsersPage from './pages/UsersPage';
import AuditLogsPage from './pages/AuditLogsPage';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/payment-requests" element={<PaymentRequestsPage />} />
        <Route path="/payment-requests/new" element={<NewPaymentRequestPage />} />
        <Route path="/payees" element={<PayeesPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['donor']} />}>
        <Route path="/approvals" element={<ApprovalsPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/users" element={<UsersPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
