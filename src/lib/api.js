const normalizeApiUrl = (value) => {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const API_URL = normalizeApiUrl(
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined'
    ? (['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:5000/api' : window.location.origin)
    : '')
);

export const SOCKET_URL = API_URL ? API_URL.replace(/\/api$/, '') : '';

export async function apiFetch(path, options = {}) {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured. Add your Render backend URL ending with /api.');
  }

  const response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload?.error
      ? payload.error
      : (typeof payload === 'string' && payload) || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

export function authHeaders(token, extra = {}) {
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}
