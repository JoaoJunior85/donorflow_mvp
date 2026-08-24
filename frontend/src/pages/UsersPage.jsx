import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DataTable } from '../components/UI';

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.getUsers().then(setUsers);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Users</h1>
      <DataTable
        columns={[
          { key: 'fullName', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'role', label: 'Role', render: (r) => <span className="capitalize">{r.role}</span> },
          {
            key: 'createdAt',
            label: 'Joined',
            render: (r) => new Date(r.createdAt).toLocaleDateString(),
          },
        ]}
        rows={users}
      />
    </div>
  );
}
