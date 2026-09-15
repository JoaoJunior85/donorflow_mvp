import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, formatCurrency } from '../services/api';
import StatCard from '../components/StatCard';
import { DataTable, Icon, StatusBadge, SuccessBanner } from '../components/UI';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [subForm, setSubForm] = useState({ name: '', purpose: '', allocatedAmount: '', approvalLimit: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingFund, setLoadingFund] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);

  const load = () => api.getProject(id).then(setProject).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [id]);

  if (!project) return <p className="text-slate-500 py-12 text-center">{error || 'Loading project details...'}</p>;

  const totals = project.wallet?.totals ?? {};
  const funded = totals.funded ?? 0;
  const totalBudget = Number(project.totalBudget ?? 0);
  const remainingBudget = Math.max(0, totalBudget - funded);
  const fundedPercent = totalBudget > 0 ? Math.min(100, Math.round((funded / totalBudget) * 100)) : 0;
  const spentPercent = totalBudget > 0 ? Math.min(100, Math.round(((totals.spent ?? 0) / totalBudget) * 100)) : 0;

  const existingAllocations = (project.wallet?.subWallets ?? []).reduce(
    (sum, sw) => sum + Number(sw.allocatedAmount),
    0
  );
  const availableToAllocate = Math.max(0, funded - existingAllocations);

  const handleFund = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const amount = Number(fundAmount);

    if (!amount || amount <= 0) {
      setError('Please enter a valid positive funding amount.');
      return;
    }
    if (amount > remainingBudget) {
      setError(`Funding exceeds the remaining project budget. Maximum allowed is ${formatCurrency(remainingBudget)}.`);
      return;
    }

    setLoadingFund(true);
    try {
      await api.fundProject(id, amount);
      setFundAmount('');
      setSuccess(`Successfully funded ${formatCurrency(amount)}. Project balance updated.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingFund(false);
    }
  };

  const handleSubWallet = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const allocated = Number(subForm.allocatedAmount);
    const approvalLimit = subForm.approvalLimit ? Number(subForm.approvalLimit) : 0;

    if (!allocated || allocated <= 0) {
      setError('Please enter a valid positive allocation amount.');
      return;
    }
    if (allocated > availableToAllocate) {
      setError(`Allocation exceeds available wallet funds. Maximum available: ${formatCurrency(availableToAllocate)}.`);
      return;
    }
    if (approvalLimit < 0) {
      setError('Approval limit cannot be negative.');
      return;
    }
    if (approvalLimit > allocated) {
      setError('Approval limit cannot exceed the sub-wallet allocated amount.');
      return;
    }

    setLoadingSub(true);
    try {
      await api.createSubWallet(id, {
        name: subForm.name.trim(),
        purpose: subForm.purpose.trim(),
        allocatedAmount: allocated,
        approvalLimit: approvalLimit > 0 ? approvalLimit : undefined,
      });
      setSubForm({ name: '', purpose: '', allocatedAmount: '', approvalLimit: '' });
      setSuccess(`Sub-wallet "${subForm.name}" created with ${formatCurrency(allocated)}.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSub(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">{project.description || 'No description provided.'}</p>
        </div>
        {project.recipient && (
          <div className="flex items-center gap-2 text-xs bg-slate-100 rounded-xl px-3 py-2 text-slate-700">
            <span className="font-semibold text-slate-500">Recipient:</span>
            <span>{project.recipient.fullName} ({project.recipient.email})</span>
          </div>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}
      {success && <SuccessBanner title="Success" message={success} onClose={() => setSuccess('')} />}

      {/* Progress & Stat Cards */}
      <div className="mb-8 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Funding Progress</span>
            <p className="text-sm font-semibold text-slate-800">
              {formatCurrency(funded)} funded of {formatCurrency(totalBudget)} ({fundedPercent}%)
            </p>
          </div>
          <div className="text-xs text-slate-500">
            {remainingBudget > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                <Icon name="clock" size={14} /> Remaining to fund: {formatCurrency(remainingBudget)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                <Icon name="check" size={14} /> Fully Funded (100%)
              </span>
            )}
          </div>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex">
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${fundedPercent}%` }}
            title={`Funded: ${fundedPercent}%`}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-slate-400">
          <span>0%</span>
          <span>Spent: {formatCurrency(totals.spent ?? 0)} ({spentPercent}%)</span>
          <span>100% ({formatCurrency(totalBudget)})</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Budget" value={formatCurrency(project.totalBudget)} accent="brand" />
        <StatCard label="Funded" value={formatCurrency(funded)} accent="green" />
        <StatCard label="Spent" value={formatCurrency(totals.spent ?? 0)} accent="amber" />
        <StatCard label="Remaining Balance" value={formatCurrency(totals.remaining ?? 0)} accent="donated" />
      </div>

      {user.role === 'donor' && (
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Funding Form or Full Funded Banner */}
          {remainingBudget > 0 ? (
            <form onSubmit={handleFund} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 flex flex-col justify-between">
              <div>
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-brand-900">
                      {project.wallet ? 'Add Project Funding' : 'Fund Project'}
                    </h2>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                      Max: {formatCurrency(remainingBudget)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {project.wallet
                      ? 'Simulate additional funding transfer into the project wallet.'
                      : 'Provide initial funding to activate the project wallet and enable sub-wallets.'}
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Funding Amount (USD) — cannot exceed budget
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={remainingBudget}
                      placeholder={`Max ${remainingBudget}`}
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Budget remaining: {formatCurrency(remainingBudget)}</span>
                    <button
                      type="button"
                      onClick={() => setFundAmount(remainingBudget.toString())}
                      className="font-medium text-brand-600 hover:underline cursor-pointer"
                    >
                      Fund Remaining
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={loadingFund || remainingBudget <= 0}
                className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 cursor-pointer"
              >
                {loadingFund ? 'Processing...' : 'Simulate Funding'}
              </button>
            </form>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 flex flex-col justify-center items-center text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <Icon name="check" size={26} />
              </div>
              <h3 className="text-base font-bold text-emerald-900">Project is Fully Funded</h3>
              <p className="text-xs text-emerald-700 mt-1 max-w-sm">
                The full budget of {formatCurrency(totalBudget)} has been credited to the wallet. No additional funding can be added.
              </p>
            </div>
          )}

          {/* Sub-Wallet Form */}
          {project.wallet ? (
            <form onSubmit={handleSubWallet} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 flex flex-col justify-between">
              <div>
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-brand-900">Add Sub-Wallet</h2>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      Available: {formatCurrency(availableToAllocate)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Divide funded resources into purpose-bound accounts (e.g. Venue, Supplies).
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      placeholder="Name (e.g. Venue Wallet)"
                      value={subForm.name}
                      onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white"
                      required
                    />
                    <input
                      placeholder="Purpose (e.g. Venue hire)"
                      value={subForm.purpose}
                      onChange={(e) => setSubForm({ ...subForm, purpose: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={availableToAllocate}
                        placeholder={`Allocated (max ${availableToAllocate})`}
                        value={subForm.allocatedAmount}
                        onChange={(e) => setSubForm({ ...subForm, allocatedAmount: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={subForm.allocatedAmount || availableToAllocate}
                        placeholder="Approval limit (optional)"
                        value={subForm.approvalLimit}
                        onChange={(e) => setSubForm({ ...subForm, approvalLimit: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Allocations cannot exceed the unallocated wallet funds ({formatCurrency(availableToAllocate)}).
                  </p>
                </div>
              </div>
              <button
                type="submit"
                disabled={loadingSub || availableToAllocate <= 0}
                className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 cursor-pointer"
              >
                {loadingSub ? 'Creating...' : 'Create Sub-Wallet'}
              </button>
            </form>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col justify-center items-center text-center">
              <div className="h-12 w-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mb-3">
                <Icon name="lock" size={24} />
              </div>
              <h3 className="text-base font-semibold text-slate-800">Sub-Wallets Locked</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Fund this project first using the form on the left to activate the wallet and enable purpose-based sub-wallets.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sub-Wallets Table */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg text-slate-800">Purpose-Based Sub-Wallets</h2>
          <span className="text-xs text-slate-500">
            Total Allocated: {formatCurrency(existingAllocations)} of {formatCurrency(funded)}
          </span>
        </div>
        <DataTable
          emptyMessage="No sub-wallets created yet"
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'purpose', label: 'Purpose' },
            { key: 'allocatedAmount', label: 'Allocated', render: (r) => formatCurrency(r.allocatedAmount) },
            { key: 'approvalLimit', label: 'Approval Limit', render: (r) => (r.approvalLimit ? formatCurrency(r.approvalLimit) : 'No limit') },
            { key: 'spent', label: 'Spent', render: (r) => formatCurrency(r.spent) },
            { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={project.wallet?.subWallets ?? []}
        />
      </div>

      {/* Payment Requests Table */}
      <div className="mb-8">
        <h2 className="font-semibold text-lg text-slate-800 mb-4">Payment Requests</h2>
        <DataTable
          emptyMessage="No payment requests for this project"
          columns={[
            { key: 'purpose', label: 'Purpose' },
            { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
            { key: 'payee', label: 'Payee', render: (r) => r.payee?.name },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            {
              key: 'flags',
              label: 'Flags / Rules',
              render: (r) => (r.flags?.length ? r.flags.join('; ') : 'Passed all rules'),
            },
          ]}
          rows={project.paymentRequests}
        />
      </div>

      {/* Transactions Table */}
      <div>
        <h2 className="font-semibold text-lg text-slate-800 mb-4">Ledger Transactions</h2>
        <DataTable
          emptyMessage="No completed transactions yet"
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
    </div>
  );
}
