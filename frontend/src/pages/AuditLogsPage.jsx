import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DataTable } from '../components/UI';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.getAuditLogs().then(setLogs);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Audit Logs</h1>
      <DataTable
        emptyMessage="No audit logs"
        columns={[
          { key: 'action', label: 'Action' },
          { key: 'user', label: 'User', render: (r) => r.user?.fullName ?? 'System' },
          { key: 'entityType', label: 'Entity Type' },
          { key: 'entityId', label: 'Entity ID', render: (r) => r.entityId?.slice(0, 8) + '...' },
          {
            key: 'createdAt',
            label: 'Timestamp',
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
        ]}
        rows={logs}
      />
    </div>
  );
}
