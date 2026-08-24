import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api, formatCurrency } from '../services/api';
import StatCard from '../components/StatCard';
import { DataTable, StatusBadge } from '../components/UI';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function DonorDashboard({ data }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Donated" value={formatCurrency(data.totalDonated)} accent="brand" />
        <StatCard label="Total Spent" value={formatCurrency(data.totalSpent)} accent="amber" />
        <StatCard label="Remaining Balance" value={formatCurrency(data.remainingBalance)} accent="green" />
        <StatCard
          label="Pending Approvals"
          value={data.pendingApprovals}
          sub={`${data.activeProjects} active projects`}
          accent="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-lg mb-4">Spending by Category</h2>
          {data.spendingByCategory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.spendingByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {data.spendingByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm py-12 text-center">No spending recorded yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">Pending Approvals</h2>
            <Link to="/approvals" className="text-brand-600 text-sm font-medium hover:underline">
              View all
            </Link>
          </div>
          {data.pendingApprovals > 0 ? (
            <p className="text-amber-700 bg-amber-50 p-4 rounded-lg text-sm">
              You have {data.pendingApprovals} payment request(s) awaiting your review.
            </p>
          ) : (
            <p className="text-slate-500 text-sm">No pending approvals</p>
          )}
        </div>
      </div>

      <h2 className="font-semibold text-lg mb-4">Recent Transactions</h2>
      <DataTable
        emptyMessage="No transactions yet"
        columns={[
          { key: 'referenceNumber', label: 'Reference' },
          { key: 'project', label: 'Project', render: (r) => r.project?.title },
          { key: 'subWallet', label: 'Sub-wallet', render: (r) => r.subWallet?.name },
          { key: 'payee', label: 'Payee', render: (r) => r.payee?.name },
          { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
          {
            key: 'createdAt',
            label: 'Date',
            render: (r) => new Date(r.createdAt).toLocaleDateString(),
          },
        ]}
        rows={data.recentTransactions}
      />
    </>
  );
}

function RecipientDashboard({ data }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Assigned Projects" value={data.assignedProjects} accent="brand" />
        <StatCard label="Pending Requests" value={data.pendingCount} accent="amber" />
        <StatCard label="Completed Payments" value={data.approvedCount} accent="green" />
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-lg">Available Sub-Wallets</h2>
        <Link
          to="/payment-requests/new"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          New Payment Request
        </Link>
      </div>
      <DataTable
        emptyMessage="No sub-wallets assigned"
        columns={[
          { key: 'projectTitle', label: 'Project' },
          { key: 'name', label: 'Sub-wallet' },
          { key: 'purpose', label: 'Purpose' },
          { key: 'allocatedAmount', label: 'Allocated', render: (r) => formatCurrency(r.allocatedAmount) },
          { key: 'balance', label: 'Available', render: (r) => formatCurrency(r.balance) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
        rows={data.subWallets}
      />

      <h2 className="font-semibold text-lg mt-8 mb-4">Recent Requests</h2>
      <DataTable
        emptyMessage="No payment requests yet"
        columns={[
          { key: 'project', label: 'Project', render: (r) => r.project?.title },
          { key: 'purpose', label: 'Purpose' },
          { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
        rows={data.paymentRequests}
      />
    </>
  );
}

function AdminDashboard({ data }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Users" value={data.users} accent="brand" />
        <StatCard label="Organizations" value={data.organizations} accent="green" />
        <StatCard label="Projects" value={data.projects} accent="amber" />
        <StatCard label="Flagged Requests" value={data.flaggedRequests} accent="red" />
        <StatCard label="Pending Payees" value={data.pendingPayees} accent="amber" />
      </div>

      <h2 className="font-semibold text-lg mb-4">Recent Audit Logs</h2>
      <DataTable
        emptyMessage="No audit logs"
        columns={[
          { key: 'action', label: 'Action' },
          { key: 'user', label: 'User', render: (r) => r.user?.fullName ?? 'System' },
          { key: 'entityType', label: 'Entity' },
          {
            key: 'createdAt',
            label: 'When',
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
        ]}
        rows={data.auditLogs}
      />
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-slate-500">Loading dashboard...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">
        Welcome, {user.fullName.split(' ')[0]}
      </h1>
      <p className="text-slate-500 mb-8 capitalize">{user.role} dashboard</p>

      {user.role === 'donor' && <DonorDashboard data={data} />}
      {user.role === 'recipient' && <RecipientDashboard data={data} />}
      {user.role === 'admin' && <AdminDashboard data={data} />}
    </div>
  );
}
