const normalizeApiUrl = (value) => {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (trimmed.includes('.supabase.co')) {
    console.warn(
      '⚠️ [SecureChain Warning] VITE_API_URL is configured to a Supabase domain (' + trimmed + '). ' +
      'Supabase is your database/storage layer, not your Express backend server. ' +
      'VITE_API_URL must point to your deployed Render/Railway Node.js server (e.g., https://your-backend.onrender.com/api).'
    );
  }
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
    throw new Error('VITE_API_URL is not configured. Set your Render backend URL ending with /api.');
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, options);
  } catch (netErr) {
    throw new Error(`Unable to reach backend server at ${API_URL}. If deployed on Render free tier, it may be waking up from sleep (allow 40-50s) or check your CORS and service status. Details: ${netErr.message}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    let message = typeof payload === 'object' && payload?.error
      ? payload.error
      : (typeof payload === 'string' && payload) || `Request failed (${response.status})`;
    
    if (response.status === 404 && typeof payload === 'string' && payload.includes('<!DOCTYPE html>')) {
      message = `Backend endpoint not found on ${API_URL}. Please ensure your backend web service is deployed and running Express.`;
    }
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
