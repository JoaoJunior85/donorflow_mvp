import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DataTable, StatusBadge } from '../components/UI';

export default function PayeesPage() {
  const { user } = useAuth();
  const [payees, setPayees] = useState([]);
  const [form, setForm] = useState({
    name: '',
    type: 'vendor',
    phone: '',
    email: '',
    serviceProvided: '',
    bankName: '',
    bankAccountNumber: '',
  });
  const [showForm, setShowForm] = useState(false);

  const load = () => api.getPayees().then(setPayees);

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.createPayee(form);
    setShowForm(false);
    setForm({ name: '', type: 'vendor', phone: '', email: '', serviceProvided: '', bankName: '', bankAccountNumber: '' });
    load();
  };

  const handleVerify = async (id, status) => {
    await api.verifyPayee(id, status);
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Payees & Vendors</h1>
          <p className="text-slate-500">Suppliers and payment recipients</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {showForm ? 'Cancel' : 'Add Payee'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2 border rounded-lg" required />
          <input placeholder="Service provided" value={form.serviceProvided} onChange={(e) => setForm({ ...form, serviceProvided: e.target.value })} className="px-4 py-2 border rounded-lg" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-4 py-2 border rounded-lg" />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-4 py-2 border rounded-lg" />
          <input placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="px-4 py-2 border rounded-lg" />
          <input placeholder="Account number" value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} className="px-4 py-2 border rounded-lg" />
          <button type="submit" className="md:col-span-2 bg-brand-600 text-white py-2 rounded-lg w-fit px-6">Save Payee</button>
        </form>
      )}

      <DataTable
        emptyMessage="No payees"
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'type', label: 'Type' },
          { key: 'serviceProvided', label: 'Service' },
          { key: 'phone', label: 'Phone' },
          { key: 'verificationStatus', label: 'Status', render: (r) => <StatusBadge status={r.verificationStatus} /> },
          {
            key: 'actions',
            label: 'Actions',
            render: (r) =>
              user.role === 'admin' && r.verificationStatus === 'pending' ? (
                <div className="flex gap-2">
                  <button onClick={() => handleVerify(r.id, 'verified')} className="text-emerald-600 text-sm">Verify</button>
                  <button onClick={() => handleVerify(r.id, 'rejected')} className="text-red-600 text-sm">Reject</button>
                </div>
              ) : null,
          },
        ]}
        rows={payees}
      />
    </div>
  );
}
