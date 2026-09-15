import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, formatCurrency } from '../services/api';
import { DataTable, StatusBadge, SuccessBanner } from '../components/UI';

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
  const [success, setSuccess] = useState('');

  const load = () => api.getProjects().then(setProjects).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    if (user.role === 'donor') {
      api.getRecipients().then(setRecipients).catch(() => {});
    }
  }, [user.role]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const budget = Number(form.totalBudget);
    if (!budget || budget <= 0) {
      setError('Total budget must be a positive number.');
      return;
    }

    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      setError('Project end date cannot be earlier than start date.');
      return;
    }

    try {
      await api.createProject({
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        totalBudget: budget,
        recipientId: form.recipientId || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
      setShowForm(false);
      setForm({ title: '', description: '', totalBudget: '', recipientId: '', startDate: '', endDate: '' });
      setSuccess('Project successfully created.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const featuredProject = projects[0] ?? null;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-slate-500">Track funded programmes and sub-wallets</p>
        </div>
        {user.role === 'donor' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 cursor-pointer"
          >
            {showForm ? 'Cancel' : 'New Project'}
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <SuccessBanner title="Success" message={success} onClose={() => setSuccess('')} />}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-brand-900">Create Project</h2>
              <p className="text-sm text-slate-500">Add a new funding initiative and define its delivery scope.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Project Title *</label>
              <input
                placeholder="e.g. Digital Skills Training"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Total Budget (USD) *</label>
              <input
                placeholder="e.g. 100000"
                type="number"
                step="0.01"
                min="1"
                value={form.totalBudget}
                onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Project Description</label>
              <textarea
                placeholder="Provide details on project goals, targets and location..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Recipient (optional)</label>
              <select
                value={form.recipientId}
                onChange={(e) => setForm({ ...form, recipientId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
              >
                <option value="">Select recipient</option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} ({r.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button type="submit" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 cursor-pointer">
              Create Project
            </button>
          </div>
        </form>
      )}

      {featuredProject && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Project details</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">{featuredProject.title}</h2>
            </div>
            <StatusBadge status={featuredProject.status} />
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            {featuredProject.description || 'No description added for this project yet.'}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Budget</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(featuredProject.totalBudget)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Recipient</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{featuredProject.recipient?.fullName ?? '—'}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Funded</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(featuredProject.wallet?.totals?.funded ?? 0)}</div>
            </div>
          </div>
        </div>
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
