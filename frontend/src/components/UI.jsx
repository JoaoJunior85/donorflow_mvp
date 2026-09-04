import { formatCurrency, statusColor } from '../services/api';

const iconPaths = {
  wallet: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H20v14H5.5A2.5 2.5 0 0 1 3 16.5v-9Z" /><path d="M3 8h14a2 2 0 0 1 2 2v2H17a2 2 0 0 0 0 4h2v2" /><path d="M17 14h.01" /></>,
  chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
  check: <><circle cx="12" cy="12" r="8.5" /><path d="m8 12 2.5 2.5L16 9" /></>,
  user: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,
  logout: <><path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" /><path d="m14 8 4 4-4 4M18 12H9" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  home: <><path d="m4 11 8-7 8 7" /><path d="M6 10v9h12v-9M10 19v-5h4v5" /></>,
  projects: <><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M8 5V3.5h8V5M3.5 10h17" /></>,
  shield: <><path d="M12 3.5 19 6v5.2c0 4.4-3 7.8-7 9.3-4-1.5-7-4.9-7-9.3V6l7-2.5Z" /><path d="m9 12 2 2 4-4" /></>,
  transfer: <><path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" /></>,
  report: <><path d="M5 20V10M12 20V4M19 20v-7" /><path d="M3 20h18" /></>,
  folder: <><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5l.5-9Z" /></>,
  hourglass: <><path d="M6 4h12M6 20h12M7 4c0 4 5 4 5 8s-5 4-5 8M17 4c0 4-5 4-5 8s5 4 5 8" /></>,
  payments: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M8 14h.01M12 14h4" /></>,
  users: <><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="8" r="3" /><path d="M17 11a3 3 0 1 0-1.2-5.75M16 15h1.5a3.5 3.5 0 0 1 3.5 3.5V20" /></>,
  building: <><path d="M4 20V5l8-2 8 2v15M2 20h20M8 8h1M15 8h1M8 12h1M15 12h1M8 16h1M15 16h1" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 5c4-3 7 3 14 0v9c-7 3-10-3-14 0" /></>,
  'plus-document': <><path d="M6 3.5h8l4 4V20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" /><path d="M14 3.5v4h4M12 11v6M9 14h6" /></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  'eye-off': <><path d="m3 3 18 18" /><path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.4 17.4 0 0 1-3.1 3.7M6.2 6.2C3.9 7.8 2.5 12 2.5 12s3.5 6 9.5 6c1.1 0 2.1-.2 3-.5" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  bell: <><path d="M15 18H9" /><path d="M18 16H6l1.5-2.2V10a4.5 4.5 0 0 1 9 0v3.8L18 16Z" /><path d="M10 18a2 2 0 0 0 4 0" /></>,
};

export function Icon({ name, size = 20, strokeWidth = 1.8 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{iconPaths[name] ?? iconPaths.projects}</svg>;
}

export function StatusBadge({ status }) {
  const labels = { approved: 'Approved', pending: 'Pending', rejected: 'Rejected', completed: 'Completed', frozen: 'Frozen' };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(status)}`}>
      {labels[status] ?? status?.replace(/_/g, ' ')}
    </span>
  );
}

export function PageSkeleton({ rows = 3 }) {
  return <div className="space-y-4" aria-label="Loading">
    <div className="skeleton h-8 w-56 rounded-lg" />
    <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
    <div className="skeleton h-56 w-full rounded-2xl" />
    {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
  </div>;
}

export function SuccessBanner({ title, message, onClose }) {
  return (
    <div className="success-banner" role="status" aria-live="polite">
      <div className="success-banner-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5 9.5 17 19 7.5" />
        </svg>
      </div>
      <div className="success-banner-copy">
        <div className="success-banner-title">{title}</div>
        {message && <div className="success-banner-message">{message}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="success-banner-close" aria-label="Dismiss success message">
          ×
        </button>
      )}
    </div>
  );
}

export function DataTable({ columns, rows, emptyMessage = 'No data' }) {
  if (!rows?.length) {
    return (
      <div className="data-table-empty rounded-2xl p-8 text-center text-slate-500">{emptyMessage}</div>
    );
  }

  return (
    <div className="data-table-scroll rounded-2xl bg-white shadow-sm">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="data-table-head border-b border-brand-900/10">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-brand-900/80">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="data-table-body divide-y divide-slate-200/80">
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="data-table-row transition-colors hover:bg-brand-50/40">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-slate-600">
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
