import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency } from '../services/api';
import { SuccessBanner } from '../components/UI';

export default function NewPaymentRequestPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [payees, setPayees] = useState([]);
  const [form, setForm] = useState({
    projectId: '',
    subWalletId: '',
    payeeId: '',
    amount: '',
    purpose: '',
    description: '',
    invoiceUrl: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.getProjects(), api.getPayees()]).then(([p, pay]) => {
      setProjects(p);
      setPayees(pay);
    });
  }, []);

  const selectedProject = projects.find((p) => p.id === form.projectId);
  const subWallets = selectedProject?.wallet?.subWallets ?? [];
  const selectedSubWallet = subWallets.find((sw) => sw.id === form.subWalletId);
  const selectedPayee = payees.find((p) => p.id === form.payeeId);

  const amountNum = Number(form.amount || 0);
  const maxAvailable = Number(selectedSubWallet?.balance ?? 0);
  const isOverBalance = selectedSubWallet && amountNum > maxAvailable;
  const isAboveApprovalLimit = selectedSubWallet?.approvalLimit && amountNum > Number(selectedSubWallet.approvalLimit);
  const remainingAfter = selectedSubWallet ? Math.max(0, maxAvailable - amountNum) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    if (isOverBalance) {
      setError(`Requested amount (${formatCurrency(amountNum)}) exceeds available sub-wallet balance (${formatCurrency(maxAvailable)}).`);
      return;
    }

    setLoading(true);
    try {
      await api.createPaymentRequest({
        ...form,
        amount: amountNum,
        purpose: form.purpose.trim(),
        description: form.description?.trim() || undefined,
        invoiceUrl: form.invoiceUrl?.trim() || undefined,
      });
      setSuccess('Payment request submitted successfully.');
      setTimeout(() => navigate('/payment-requests'), 700);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">New Payment Request</h1>
      <p className="text-slate-500 mb-8">Request payment from a purpose-based sub-wallet to a recorded vendor</p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}
      {success && <SuccessBanner title="Success" message={success} onClose={() => setSuccess('')} />}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Project *</label>
          <select
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value, subWalletId: '' })}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
            required
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Sub-Wallet *</label>
          <select
            value={form.subWalletId}
            onChange={(e) => setForm({ ...form, subWalletId: e.target.value })}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
            disabled={!form.projectId}
            required
          >
            <option value="">{form.projectId ? 'Select sub-wallet' : 'Select a project first'}</option>
            {subWallets.map((sw) => (
              <option key={sw.id} value={sw.id}>
                {sw.name} — {formatCurrency(sw.balance)} available
              </option>
            ))}
          </select>
          {selectedSubWallet && (
            <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs flex justify-between">
              <div>
                <span className="text-slate-500">Available Balance:</span>{' '}
                <strong className="text-emerald-700">{formatCurrency(maxAvailable)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Purpose:</span>{' '}
                <strong className="text-slate-800">{selectedSubWallet.purpose}</strong>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Payee / Vendor *</label>
          <select
            value={form.payeeId}
            onChange={(e) => setForm({ ...form, payeeId: e.target.value })}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
            required
          >
            <option value="">Select payee</option>
            {payees.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.verificationStatus})
              </option>
            ))}
          </select>
          {selectedPayee && selectedPayee.verificationStatus !== 'verified' && (
            <p className="mt-1 text-xs text-amber-700 font-medium">
              ℹ️ Payee is not yet verified. Donor will see a verification warning.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-semibold text-slate-700">Amount (USD) *</label>
            {selectedSubWallet && (
              <span className="text-xs text-slate-500">
                Max: {formatCurrency(maxAvailable)}
              </span>
            )}
          </div>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={selectedSubWallet ? maxAvailable : undefined}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder={selectedSubWallet ? `Up to ${maxAvailable}` : 'Enter amount'}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
            required
          />

          {isOverBalance && (
            <p className="mt-1 text-xs font-semibold text-red-600">
              ⚠️ Amount exceeds the available sub-wallet balance of {formatCurrency(maxAvailable)}.
            </p>
          )}

          {isAboveApprovalLimit && !isOverBalance && (
            <p className="mt-1 text-xs font-medium text-amber-700">
              ℹ️ Amount exceeds the approval limit ({formatCurrency(selectedSubWallet.approvalLimit)}). This will be flagged for explicit donor review.
            </p>
          )}

          {selectedSubWallet && form.amount && !isOverBalance && (
            <p className="mt-1 text-xs text-slate-500">
              Sub-wallet balance after request: <strong>{formatCurrency(remainingAfter)}</strong>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Purpose *</label>
          <input
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            placeholder="e.g. Venue hire for community screening"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Description / Notes</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Provide context or explanation for this payment..."
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Invoice / Receipt URL (optional)</label>
          <input
            value={form.invoiceUrl}
            onChange={(e) => setForm({ ...form, invoiceUrl: e.target.value })}
            placeholder="https://... (link to supporting receipt or invoice)"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || isOverBalance}
            className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Submitting Request...' : 'Submit Payment Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
