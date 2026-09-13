import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../services/api';
import { DataTable, StatusBadge, SuccessBanner } from '../components/UI';

export default function ApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () =>
    api.getPaymentRequests({ status: 'pending' }).then((all) => {
      const pending = all.filter((r) => ['pending', 'frozen'].includes(r.status));
      setRequests(pending.length ? pending : all.filter((r) => r.status === 'pending'));
      return api.getPaymentRequests();
    });

  useEffect(() => {
    api.getPaymentRequests().then((all) => {
      setRequests(all.filter((r) => ['pending', 'frozen'].includes(r.status)));
    });
  }, []);

  const openDetail = async (id) => {
    const detail = await api.getPaymentRequest(id);
    setSelected(detail);
    setComment('');
  };

  const handleDecision = async (decision) => {
    if (!selected) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.approvePaymentRequest(selected.id, { decision, comment });
      setSelected(null);
      setSuccess(`Payment request ${decision}.`);
      const all = await api.getPaymentRequests();
      setRequests(all.filter((r) => ['pending', 'frozen'].includes(r.status)));
      window.dispatchEvent(new CustomEvent('donorflow:refresh-dashboard'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Payment Approvals</h1>
      <p className="text-slate-500 mb-8">Review, approve, reject, or freeze payment requests</p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <SuccessBanner title="Approved" message={success} onClose={() => setSuccess('')} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-4">Pending Requests</h2>
          <DataTable
            emptyMessage="No pending approvals"
            columns={[
              { key: 'project', label: 'Project', render: (r) => r.project?.title },
              { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'action',
                label: '',
                render: (r) => (
                  <button
                    onClick={() => openDetail(r.id)}
                    className="text-brand-600 text-sm font-medium hover:underline"
                  >
                    Review
                  </button>
                ),
              },
            ]}
            rows={requests}
          />
        </div>

        {selected && (
          <div className="h-fit rounded-xl bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-8">
            <h2 className="font-semibold text-lg mb-4">Request Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-semibold text-lg">{formatCurrency(selected.amount)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Purpose</dt>
                <dd>{selected.purpose}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Payee</dt>
                <dd>
                  {selected.payee?.name} ({selected.payee?.verificationStatus})
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Sub-wallet balance</dt>
                <dd>{formatCurrency(selected.subWallet?.balance)}</dd>
              </div>
              {selected.flags?.length > 0 && (
                <div>
                  <dt className="text-slate-500">Flags</dt>
                  <dd className="text-amber-700">
                    <ul className="list-disc ml-4">
                      {selected.flags.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              {selected.invoiceUrl && (
                <div>
                  <dt className="text-slate-500">Invoice</dt>
                  <dd>
                    <a href={selected.invoiceUrl} target="_blank" rel="noreferrer" className="text-brand-600">
                      View document
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comment (optional)"
              className="w-full mt-4 px-3 py-2 border rounded-lg text-sm"
              rows={2}
            />

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => handleDecision('approved')}
                disabled={loading}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision('rejected')}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => handleDecision('frozen')}
                disabled={loading}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
              >
                Freeze
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
