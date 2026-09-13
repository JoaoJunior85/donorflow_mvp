const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const GET_CACHE_TTL = 60_000;
const getCache = new Map();
const pendingGets = new Map();

function getToken() {
  return localStorage.getItem('donorflow_token');
}

async function request(path, options = {}) {
  const method = options.method ?? 'GET';
  const isGet = method === 'GET';
  const token = getToken();
  const cacheKey = `${API_BASE}${path}::${token ?? 'anonymous'}`;
  const skipCache = Boolean(options.skipCache);
  const { skipCache: _skip, ...fetchOptions } = options;

  if (isGet && !skipCache) {
    const cached = getCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    if (pendingGets.has(cacheKey)) return pendingGets.get(cacheKey);
  }

  const headers = { 'Content-Type': 'application/json', ...fetchOptions.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchRequest = fetch(`${API_BASE}${path}`, { ...fetchOptions, headers })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      if (isGet && !skipCache) {
        getCache.set(cacheKey, { data, expiresAt: Date.now() + GET_CACHE_TTL });
      } else if (!isGet) {
        getCache.clear();
      }
      return data;
    })
    .finally(() => {
      if (isGet) pendingGets.delete(cacheKey);
    });

  if (isGet && !skipCache) pendingGets.set(cacheKey, fetchRequest);
  return fetchRequest;
}

export function notifyApp() {
  clearApiCache();
  window.dispatchEvent(new CustomEvent('donorflow:refresh-dashboard'));
}

export function clearApiCache() {
  getCache.clear();
  pendingGets.clear();
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  getDashboard: (options = {}) => request('/reports/dashboard', options),
  getProjectReport: (id, options = {}) => request(`/reports/projects/${id}`, options),
  getNotifications: () => request('/reports/notifications', { skipCache: true }),
  getAuditLogs: () => request('/reports/audit-logs'),
  getUsers: () => request('/reports/users'),
  getOrganizations: () => request('/reports/organizations'),
};

export function formatCurrency(amount, currency = 'USD') {
  return `${currency === 'USD' ? '$' : currency + ' '}${Number(amount).toLocaleString(undefined, {
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
