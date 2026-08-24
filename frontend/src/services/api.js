const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('donorflow_token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/me'),
  getRecipients: () => request('/recipients'),

  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (body) => request('/projects', { method: 'POST', body: JSON.stringify(body) }),
  fundProject: (id, amount) =>
    request(`/projects/${id}/fund`, { method: 'POST', body: JSON.stringify({ amount }) }),
  createSubWallet: (id, body) =>
    request(`/projects/${id}/sub-wallets`, { method: 'POST', body: JSON.stringify(body) }),
  assignRecipient: (id, recipientId) =>
    request(`/projects/${id}/assign-recipient`, {
      method: 'PATCH',
      body: JSON.stringify({ recipientId }),
    }),

  getPayees: () => request('/payments/payees'),
  createPayee: (body) => request('/payments/payees', { method: 'POST', body: JSON.stringify(body) }),
  verifyPayee: (id, status) =>
    request(`/payments/payees/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getPaymentRequests: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/payments/requests${qs ? `?${qs}` : ''}`);
  },
  getPaymentRequest: (id) => request(`/payments/requests/${id}`),
  createPaymentRequest: (body) =>
    request('/payments/requests', { method: 'POST', body: JSON.stringify(body) }),
  approvePaymentRequest: (id, body) =>
    request(`/payments/requests/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }),

  getTransactions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/payments/transactions${qs ? `?${qs}` : ''}`);
  },

  getDashboard: () => request('/reports/dashboard'),
  getProjectReport: (id) => request(`/reports/projects/${id}`),
  getAuditLogs: () => request('/reports/audit-logs'),
  getUsers: () => request('/reports/users'),
  getOrganizations: () => request('/reports/organizations'),
};

export function formatCurrency(amount, currency = 'ZMW') {
  return `${currency === 'ZMW' ? 'K' : currency + ' '}${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function statusColor(status) {
  const map = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-blue-100 text-blue-800',
    completed: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    frozen: 'bg-purple-100 text-purple-800',
    active: 'bg-emerald-100 text-emerald-800',
    draft: 'bg-slate-100 text-slate-700',
    verified: 'bg-emerald-100 text-emerald-800',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}
