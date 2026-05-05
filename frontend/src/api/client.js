// Thin fetch wrapper that injects the auth token

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('ccc_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  baseUrl: BASE_URL,
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  delete: (p) => request(p, { method: 'DELETE' }),
  // Public (no auth header)
  postPublic: (p, body) => request(p, { method: 'POST', body, auth: false }),
};
