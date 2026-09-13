import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api, formatCurrency } from '../services/api';
import StatCard from '../components/StatCard';
import SubWalletBarChart from '../components/SubWalletBarChart';
import { DataTable, Icon, PageSkeleton, StatusBadge } from '../components/UI';

const COLORS = ['#092d43', '#19b975', '#f2b84b', '#e86b5d', '#4b8da8'];

function DonorDashboard({ data }) {
  const activity = data.recentTransactions?.slice(0, 4) ?? [];
  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Donated" value={formatCurrency(data.totalDonated)} accent="donated" icon="wallet" />
        <StatCard label="Total Spent" value={formatCurrency(data.totalSpent)} accent="amber" icon="chart" />
        <StatCard label="Remaining Balance" value={formatCurrency(data.remainingBalance)} accent="green" icon="wallet" />
        <StatCard
          label="Pending Approvals"
          value={data.pendingApprovals}
          sub={`${data.activeProjects} active projects`}
          accent="red"
          icon="clock"
        />
      </div>

      <div className="mb-8">
        <SubWalletBarChart data={data.subWalletReports} title="Sub-wallet allocation vs spending" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="dashboard-section min-w-0 p-5 sm:p-6">
          <div className="section-header">
            <h2 className="font-semibold text-lg">Spending by Category</h2>
          </div>
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

        <div className="dashboard-section min-w-0 p-5 sm:p-6">
          <div className="section-header">
            <h2 className="font-semibold text-lg">Recent Activity</h2>
            <Link to="/transactions" className="text-brand-600 text-sm font-semibold hover:underline">
              View all
            </Link>
          </div>
          {activity.length ? (
            <div>
              {activity.map((item) => {
                const payeeName = item.payee?.name ?? 'Payment';
                const projectName = item.project?.title ?? 'Project transaction';
                const subWalletName = item.subWallet?.name ?? 'General wallet';
                const purpose = item.subWallet?.purpose ?? 'Project activity';

                return (
                  <div className="activity-row" key={item.id ?? item.referenceNumber}>
                    <span className="activity-icon bg-emerald-50 text-emerald-600"><Icon name="check" size={21} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{payeeName}</p>
                      <p className="truncate text-xs text-slate-500">{projectName}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {subWalletName} · {purpose}
                      </p>
                    </div>
                    <div className="min-w-[88px] text-right">
                      <strong className="block text-sm text-emerald-600">{formatCurrency(item.amount)}</strong>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Paid</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : data.pendingApprovals > 0 ? (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              <Icon name="clock" size={20} />
              <span>You have {data.pendingApprovals} payment request(s) awaiting review.</span>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No pending approvals</p>
          )}
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Recent Transactions</h2>
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
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Assigned Projects" value={data.assignedProjects} accent="purple" icon="folder" />
        <StatCard label="Pending Requests" value={data.pendingCount} accent="amber" icon="hourglass" />
        <StatCard label="Completed Payments" value={data.approvedCount} accent="green" icon="payments" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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

      <h2 className="mb-4 mt-8 text-lg font-semibold">Recent Requests</h2>
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
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Users" value={data.users} accent="brand" icon="users" />
        <StatCard label="Organizations" value={data.organizations} accent="green" icon="building" />
        <StatCard label="Projects" value={data.projects} accent="amber" icon="projects" />
        <StatCard label="Flagged Requests" value={data.flaggedRequests} accent="red" icon="flag" />
        <StatCard label="Pending Payees" value={data.pendingPayees} accent="purple" icon="clock" />
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
    const load = (skipCache = false) => {
      api.getDashboard({ skipCache }).then(setData).catch((e) => setError(e.message));
    };
    load();
    const refresh = () => load(true);
    window.addEventListener('donorflow:refresh-dashboard', refresh);
    return () => window.removeEventListener('donorflow:refresh-dashboard', refresh);
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <PageSkeleton />;

  return (
    <div className="page-enter">
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
