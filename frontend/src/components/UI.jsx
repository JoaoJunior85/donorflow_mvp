import { formatCurrency, statusColor } from '../services/api';

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(status)}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

export function DataTable({ columns, rows, emptyMessage = 'No data' }) {
  if (!rows?.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-500">{emptyMessage}</div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-3 font-semibold text-slate-600">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="hover:bg-slate-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StatusBadge;
export { formatCurrency };
