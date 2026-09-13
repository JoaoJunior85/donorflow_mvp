import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCurrency } from '../services/api';
import { DataTable, StatusBadge } from '../components/UI';

export default function PaymentRequestsPage() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    api.getPaymentRequests().then(setRequests);
  }, []);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Payment Requests</h1>
          <p className="text-slate-500">Track status of submitted requests</p>
        </div>
        <Link
          to="/payment-requests/new"
          className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          New Request
        </Link>
      </div>

      <DataTable
        emptyMessage="No payment requests"
        columns={[
          { key: 'project', label: 'Project', render: (r) => r.project?.title },
          { key: 'subWallet', label: 'Sub-wallet', render: (r) => r.subWallet?.name },
          { key: 'payee', label: 'Payee', render: (r) => r.payee?.name },
          { key: 'purpose', label: 'Purpose' },
          { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'createdAt',
            label: 'Submitted',
            render: (r) => new Date(r.createdAt).toLocaleDateString(),
          },
        ]}
        rows={requests}
      />
    </div>
  );
}
