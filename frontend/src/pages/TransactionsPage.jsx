import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../services/api';
import { DataTable } from '../components/UI';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    api.getTransactions().then(setTransactions);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Transaction History</h1>
      <p className="text-slate-500 mb-8">All completed simulated payments</p>

      <DataTable
        emptyMessage="No transactions yet"
        columns={[
          { key: 'referenceNumber', label: 'Reference' },
          { key: 'project', label: 'Project', render: (r) => r.project?.title },
          { key: 'subWallet', label: 'Sub-wallet', render: (r) => r.subWallet?.name },
          { key: 'payee', label: 'Payee', render: (r) => r.payee?.name },
          { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
          {
            key: 'createdAt',
            label: 'Date',
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
        ]}
        rows={transactions}
      />
    </div>
  );
}
