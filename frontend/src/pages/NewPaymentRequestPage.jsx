import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency } from '../services/api';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.getProjects(), api.getPayees()]).then(([p, pay]) => {
      setProjects(p);
      setPayees(pay);
    });
  }, []);

  const selectedProject = projects.find((p) => p.id === form.projectId);
  const subWallets = selectedProject?.wallet?.subWallets ?? [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.createPaymentRequest({
        ...form,
        amount: Number(form.amount),
      });
      navigate('/payment-requests');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">New Payment Request</h1>
      <p className="text-slate-500 mb-8">Request payment from a purpose-based sub-wallet</p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Project</label>
          <select
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value, subWalletId: '' })}
            className="w-full px-4 py-2 border rounded-lg"
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
          <label className="block text-sm font-medium mb-1">Sub-wallet</label>
          <select
            value={form.subWalletId}
            onChange={(e) => setForm({ ...form, subWalletId: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            required
          >
            <option value="">Select sub-wallet</option>
            {subWallets.map((sw) => (
              <option key={sw.id} value={sw.id}>
                {sw.name} — {formatCurrency(sw.balance)} available
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Payee</label>
          <select
            value={form.payeeId}
            onChange={(e) => setForm({ ...form, payeeId: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            required
          >
            <option value="">Select payee</option>
            {payees.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.verificationStatus})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Amount (ZMW)</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            required
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Purpose</label>
          <input
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Invoice URL (optional for MVP)</label>
          <input
            value={form.invoiceUrl}
            onChange={(e) => setForm({ ...form, invoiceUrl: e.target.value })}
            placeholder="https://..."
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
