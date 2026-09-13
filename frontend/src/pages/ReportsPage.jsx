import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../services/api';
import { DataTable, PageSkeleton } from '../components/UI';
import SubWalletBarChart from '../components/SubWalletBarChart';

export default function ReportsPage() {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects()
      .then((p) => {
        setProjects(p);
        if (p.length) setSelectedId(p[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getProjectReport(selectedId)
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const refresh = () => {
      setLoading(true);
      api.getProjectReport(selectedId, { skipCache: true })
        .then(setReport)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    };
    window.addEventListener('donorflow:refresh-dashboard', refresh);
    return () => window.removeEventListener('donorflow:refresh-dashboard', refresh);
  }, [selectedId]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Reports</h1>
      <p className="mb-8 text-slate-500">Project spending, sub-wallet balances, and payee summaries</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="mb-6 rounded-lg border px-4 py-2"
      >
        {!projects.length && <option value="">No accessible projects</option>}
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>

      {loading && <PageSkeleton />}

      {!loading && report && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Funded</p>
              <p className="text-xl font-bold">{formatCurrency(report.totals?.funded ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Spent</p>
              <p className="text-xl font-bold">{formatCurrency(report.totals?.spent ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Remaining</p>
              <p className="text-xl font-bold">{formatCurrency(report.totals?.remaining ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Transactions</p>
              <p className="text-xl font-bold">{report.transactionCount}</p>
            </div>
          </div>

          <div className="mb-8">
            <SubWalletBarChart data={report.subWalletReports} title="Sub-wallet allocation vs spending" />
          </div>

          <h2 className="mb-4 text-lg font-semibold">Payee Summary</h2>
          <DataTable
            emptyMessage="No payee payments yet"
            columns={[
              { key: 'name', label: 'Payee' },
              { key: 'total', label: 'Total Paid', render: (r) => formatCurrency(r.total) },
            ]}
            rows={report.payeeReport}
          />
        </>
      )}
    </div>
  );
}
