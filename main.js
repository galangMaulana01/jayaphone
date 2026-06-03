'use strict';

const BASE_URL = window.BACKEND_URL || 'https://jayaphone.vercel.app';

const Token = {
  get:     ()  => localStorage.getItem('jyp_token'),
  set:     (t) => localStorage.setItem('jyp_token', t),
  clear:   ()  => localStorage.removeItem('jyp_token'),
  headers: ()  => ({
    'Content-Type': 'application/json',
    ...(Token.get() ? { Authorization: `Bearer ${Token.get()}` } : {}),
  }),
};

async function request(method, path, body = null) {
  const opts = { method, headers: Token.headers() };
  if (body) opts.body = JSON.stringify(body);

  let fullPath = `${BASE_URL}${path}`;
  if (BASE_URL.startsWith('http') && !BASE_URL.includes('/api/v1')) {
    fullPath = `${BASE_URL}/api/v1${path}`;
  }

  let res;
  try {
    res = await fetch(fullPath, opts);
  } catch {
    throw new APIError(0, 'Tidak dapat terhubung ke server. Periksa koneksi internet.');
  }

  // Coba parse JSON, fallback ke text (misal Vercel Protection 403 return plain text)
  let data = {};
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else {
    const txt = await res.text().catch(() => '');
    if (!res.ok) {
      if (res.status === 403 && txt.toLowerCase().includes('allowlist')) {
        throw new APIError(res.status, 'Backend terkunci (Vercel Deployment Protection). Aktifkan di Vercel Dashboard → Settings → Deployment Protection → Disable.');
      }
      throw new APIError(res.status, txt || `Server error (${res.status})`);
    }
  }

  if (!res.ok) {
    if (res.status === 401) { Token.clear(); window.location.reload(); }
    throw new APIError(res.status, data?.detail || data?.message || `Terjadi kesalahan (${res.status})`);
  }
  return data;
}

async function uploadFile(path, file) {
  const fd = new FormData();
  fd.append('file', file);

  let fullPath = `${BASE_URL}${path}`;
  if (BASE_URL.startsWith('http') && !BASE_URL.includes('/api/v1')) {
    fullPath = `${BASE_URL}/api/v1${path}`;
  }

  let res;
  try {
    res = await fetch(fullPath, {
      method: 'POST',
      headers: { ...(Token.get() ? { Authorization: `Bearer ${Token.get()}` } : {}) },
      body: fd,
    });
  } catch {
    throw new APIError(0, 'Tidak dapat terhubung ke server.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new APIError(res.status, data?.detail || data?.message || 'Upload gagal');
  return data;
}

class APIError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const API = {
  auth: {
    login: (u, p) => request('POST', '/auth/login', { username: u, password: p }),
    me:    ()     => request('GET',  '/auth/me'),
  },
  dashboard: {
    stats: (cabang = '') => request('GET', `/dashboard/stats${cabang ? `?cabang=${cabang}` : ''}`),
  },
  units: {
    list:          (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/units${q?`?${q}`:''}`) },
    create:        (b)      => request('POST', '/units', b),
    // PUT /units/{id} TIDAK ADA di backend. Unit immutable setelah diposting.
    approveRepair: (id, b)  => request('POST', `/units/${id}/approve-repair`, b),
  },
  transaksi: {
    list:   (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/transaksi${q?`?${q}`:''}`) },
    create: (b)      => request('POST', '/transaksi', b),
  },
  karyawan: {
    list:   (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/karyawan${q?`?${q}`:''}`) },
    create: (b)      => request('POST', '/karyawan', b),
  },
  log: {
    list: (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/log${q?`?${q}`:''}`) },
  },
  service: {
    list:            (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/service${q?`?${q}`:''}`) },
    get:             (id)     => request('GET', `/service/${id}`),
    // POST /service manual TIDAK ADA — service dibuat otomatis saat unit kondisi_hp=Repair
    update:          (id, b)  => request('PUT', `/service/${id}`, b),
    pendingApproval: (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/service/pending-approval${q?`?${q}`:''}`) },
    // Backend foto endpoint terima JSON {url: string}, bukan FormData
    addFotoUrl:      (id, url) => request('POST', `/service/${id}/foto`, { url }),
  },
  customers: {
    list:   (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/customers${q?`?${q}`:''}`) },
    create: (b)      => request('POST', '/customers', b),
  },
};

window.API      = API;
window.Token    = Token;
window.APIError = APIError;

window.MEDIA_URL = BASE_URL.replace('/api/v1', '');
