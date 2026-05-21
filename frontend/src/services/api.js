const BASE = 'http://localhost:3001/api';

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const api = {
  get: (url) =>
    fetch(`${BASE}${url}`, { headers: headers() })
      .then(async (r) => ({ ok: r.ok, data: await r.json() })), // Estructura compatible

  post: (url, body) =>
    fetch(`${BASE}${url}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) })
      .then(async (r) => ({ ok: r.ok, data: await r.json() })),

  put: (url, body) =>
    fetch(`${BASE}${url}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) })
      .then(async (r) => ({ ok: r.ok, data: await r.json() })),

  delete: (url) =>
    fetch(`${BASE}${url}`, { method: 'DELETE', headers: headers() })
      .then((r) => ({ ok: r.ok })), // Para el delete solo nos importa si fue OK
};