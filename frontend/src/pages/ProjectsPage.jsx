import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, formatCurrency } from '../services/api';
import { DataTable, StatusBadge } from '../components/UI';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    totalBudget: '',
    recipientId: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');

  const load = () => api.getProjects().then(setProjects).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    if (user.role === 'donor') {
      api.getRecipients().then(setRecipients).catch(() => {});
    }
  }, [user.role]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createProject({
        ...form,
        totalBudget: Number(form.totalBudget),
        recipientId: form.recipientId || undefined,
      });
      setShowForm(false);
      setForm({ title: '', description: '', totalBudget: '', recipientId: '', startDate: '', endDate: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-slate-500">Track funded programmes and sub-wallets</p>
        </div>
        {user.role === 'donor' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            {showForm ? 'Cancel' : 'New Project'}
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Project title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="px-4 py-2 border rounded-lg"
              required
            />
            <input
              placeholder="Total budget (ZMW)"
              type="number"
              value={form.totalBudget}
              onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
              className="px-4 py-2 border rounded-lg"
              required
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="px-4 py-2 border rounded-lg md:col-span-2"
              rows={2}
            />
            <select
              value={form.recipientId}
              onChange={(e) => setForm({ ...form, recipientId: e.target.value })}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">Select recipient (optional)</option>
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName} ({r.email})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium">
            Create Project
          </button>
        </form>
      )}

      <DataTable
        emptyMessage="No projects yet"
        columns={[
          {
            key: 'title',
            label: 'Project',
            render: (r) => (
              <Link to={`/projects/${r.id}`} className="text-brand-600 font-medium hover:underline">
                {r.title}
              </Link>
            ),
          },
          { key: 'totalBudget', label: 'Budget', render: (r) => formatCurrency(r.totalBudget) },
          {
            key: 'funded',
            label: 'Funded',
            render: (r) => formatCurrency(r.wallet?.totals?.funded ?? 0),
          },
          {
            key: 'spent',
            label: 'Spent',
            render: (r) => formatCurrency(r.wallet?.totals?.spent ?? 0),
          },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'recipient',
            label: 'Recipient',
            render: (r) => r.recipient?.fullName ?? '—',
          },
        ]}
        rows={projects}
      />
    </div>
  );
}
