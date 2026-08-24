import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, formatCurrency } from '../services/api';
import { DataTable } from '../components/UI';

export default function ReportsPage() {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.getProjects().then((p) => {
      setProjects(p);
      if (p.length) setSelectedId(p[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedId) {
      api.getProjectReport(selectedId).then(setReport);
    }
  }, [selectedId]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Reports</h1>
      <p className="text-slate-500 mb-8">Project spending, sub-wallet, and payee summaries</p>

      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="mb-6 px-4 py-2 border rounded-lg"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>

      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-slate-500">Funded</p>
              <p className="text-xl font-bold">{formatCurrency(report.totals?.funded ?? 0)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-slate-500">Spent</p>
              <p className="text-xl font-bold">{formatCurrency(report.totals?.spent ?? 0)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-slate-500">Remaining</p>
              <p className="text-xl font-bold">{formatCurrency(report.totals?.remaining ?? 0)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-slate-500">Transactions</p>
              <p className="text-xl font-bold">{report.transactionCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="font-semibold mb-4">Sub-Wallet Spending</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={report.subWalletReports}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `K${v / 1000}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="spent" fill="#3b82f6" name="Spent" radius={[4, 4, 0, 0]} />
                <Bar dataKey="remaining" fill="#10b981" name="Remaining" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h2 className="font-semibold text-lg mb-4">Payee Summary</h2>
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
