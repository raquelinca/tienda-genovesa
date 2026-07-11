const BASE = 'http://localhost:3001/api';

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

const parseJson = (r) => r.json();

export const api = {
  get: (url) =>
    fetch(`${BASE}${url}`, { headers: headers() })
    .then(parseJson)
    .catch(() => ({ ok: false, mensaje: 'Error de conexión' })),
  post: (url, body) =>
    fetch(`${BASE}${url}`, { method:'POST', headers:headers(), body:JSON.stringify(body) })
    .then(parseJson)
    .catch(() => ({ ok: false, mensaje: 'Error de conexión' })),
  put: (url, body) =>
    fetch(`${BASE}${url}`, { method:'PUT', headers:headers(), body:JSON.stringify(body) })
    .then(parseJson)
    .catch(() => ({ ok: false, mensaje: 'Error de conexión' })),
  delete: (url) =>
    fetch(`${BASE}${url}`, { method:'DELETE', headers:headers() })
    .then(parseJson)
    .catch(() => ({ ok: false, mensaje: 'Error de conexión' })),
};
