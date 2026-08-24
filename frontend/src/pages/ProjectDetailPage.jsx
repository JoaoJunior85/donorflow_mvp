import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, formatCurrency } from '../services/api';
import StatCard from '../components/StatCard';
import { DataTable, StatusBadge } from '../components/UI';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [subForm, setSubForm] = useState({ name: '', purpose: '', allocatedAmount: '', approvalLimit: '' });
  const [error, setError] = useState('');

  const load = () => api.getProject(id).then(setProject).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [id]);

  const handleFund = async (e) => {
    e.preventDefault();
    try {
      await api.fundProject(id, Number(fundAmount));
      setFundAmount('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubWallet = async (e) => {
    e.preventDefault();
    try {
      await api.createSubWallet(id, {
        name: subForm.name,
        purpose: subForm.purpose,
        allocatedAmount: Number(subForm.allocatedAmount),
        approvalLimit: subForm.approvalLimit ? Number(subForm.approvalLimit) : undefined,
      });
      setSubForm({ name: '', purpose: '', allocatedAmount: '', approvalLimit: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!project) return <p className="text-slate-500">{error || 'Loading...'}</p>;

  const totals = project.wallet?.totals ?? {};

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{project.title}</h1>
      <p className="text-slate-500 mb-6">{project.description}</p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Budget" value={formatCurrency(project.totalBudget)} />
        <StatCard label="Funded" value={formatCurrency(totals.funded ?? 0)} accent="green" />
        <StatCard label="Spent" value={formatCurrency(totals.spent ?? 0)} accent="amber" />
        <StatCard label="Remaining" value={formatCurrency(totals.remaining ?? 0)} accent="brand" />
      </div>

      {user.role === 'donor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {!project.wallet && (
            <form onSubmit={handleFund} className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold mb-4">Fund Project</h2>
              <input
                type="number"
                placeholder="Amount (ZMW)"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg mb-3"
                required
              />
              <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
                Simulate Funding
              </button>
            </form>
          )}

          {project.wallet && (
            <form onSubmit={handleSubWallet} className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold mb-4">Add Sub-Wallet</h2>
              <div className="space-y-3">
                <input
                  placeholder="Name (e.g. Venue Wallet)"
                  value={subForm.name}
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
                <input
                  placeholder="Purpose"
                  value={subForm.purpose}
                  onChange={(e) => setSubForm({ ...subForm, purpose: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
                <input
                  type="number"
                  placeholder="Allocated amount"
                  value={subForm.allocatedAmount}
                  onChange={(e) => setSubForm({ ...subForm, allocatedAmount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
                <input
                  type="number"
                  placeholder="Approval limit (optional)"
                  value={subForm.approvalLimit}
                  onChange={(e) => setSubForm({ ...subForm, approvalLimit: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <button type="submit" className="mt-3 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
                Create Sub-Wallet
              </button>
            </form>
          )}
        </div>
      )}

      <h2 className="font-semibold text-lg mb-4">Sub-Wallets</h2>
      <DataTable
        emptyMessage="No sub-wallets yet"
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'purpose', label: 'Purpose' },
          { key: 'allocatedAmount', label: 'Allocated', render: (r) => formatCurrency(r.allocatedAmount) },
          { key: 'spent', label: 'Spent', render: (r) => formatCurrency(r.spent) },
          { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
        rows={project.wallet?.subWallets ?? []}
      />

      <h2 className="font-semibold text-lg mt-8 mb-4">Payment Requests</h2>
      <DataTable
        emptyMessage="No payment requests"
        columns={[
          { key: 'purpose', label: 'Purpose' },
          { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
          { key: 'payee', label: 'Payee', render: (r) => r.payee?.name },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'flags',
            label: 'Flags',
            render: (r) => (r.flags?.length ? r.flags.join('; ') : '—'),
          },
        ]}
        rows={project.paymentRequests}
      />

      <h2 className="font-semibold text-lg mt-8 mb-4">Transactions</h2>
      <DataTable
        emptyMessage="No transactions"
        columns={[
          { key: 'referenceNumber', label: 'Reference' },
          { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
          { key: 'payee', label: 'Payee', render: (r) => r.payee?.name },
          { key: 'subWallet', label: 'Sub-wallet', render: (r) => r.subWallet?.name },
          {
            key: 'createdAt',
            label: 'Date',
            render: (r) => new Date(r.createdAt).toLocaleDateString(),
          },
        ]}
        rows={project.transactions}
      />
    </div>
  );
}
