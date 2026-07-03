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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  opts.signal = controller.signal;

  let res;
  try {
    res = await fetch(fullPath, opts);
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new APIError(0, 'Request timeout (>15 detik). Server cold start, coba lagi.');
    }
    throw new APIError(0, 'Tidak dapat terhubung ke server. Periksa koneksi internet.');
  }
  clearTimeout(timer);

  let data = {};
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else {
    const txt = await res.text().catch(() => '');
    if (!res.ok) {
      if (res.status === 403 && txt.toLowerCase().includes('allowlist')) {
        throw new APIError(res.status, 'Backend terkunci (Vercel Deployment Protection aktif).');
      }
      throw new APIError(res.status, txt || `Server error (${res.status})`);
    }
  }

  if (!res.ok) {
    if (res.status === 401) { Token.clear(); window.location.reload(); }
    let msg = data?.detail || data?.message || `Terjadi kesalahan (${res.status})`;
    // FastAPI 422 validation returns detail as array of objects
    if (Array.isArray(msg)) {
      msg = msg.map(e => e?.msg || String(e)).join('; ');
    } else if (typeof msg === 'object') {
      msg = msg?.msg || msg?.message || JSON.stringify(msg);
    }
    throw new APIError(res.status, msg);
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(fullPath, {
      method: 'POST',
      headers: { ...(Token.get() ? { Authorization: `Bearer ${Token.get()}` } : {}) },
      body: fd,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new APIError(0, 'Upload timeout, coba lagi.');
    throw new APIError(0, 'Tidak dapat terhubung ke server.');
  }
  clearTimeout(timer);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = data?.detail || data?.message || 'Upload gagal';
    if (Array.isArray(msg)) {
      msg = msg.map(e => e?.msg || String(e)).join('; ');
    } else if (typeof msg === 'object') {
      msg = msg?.msg || msg?.message || JSON.stringify(msg);
    }
    throw new APIError(res.status, msg);
  }
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
    trend: (p = {})      => { const q = new URLSearchParams(p).toString(); return request('GET', `/dashboard/trend${q?`?${q}`:''}`) },
  },
  units: {
    list:          (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/units${q?`?${q}`:''}`) },
    create:        (b)      => request('POST', '/units', b),
    approveRepair: (id, b)  => request('POST', `/units/${id}/approve-repair`, b),
  },
  transaksi: {
    list:   (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/transaksi${q?`?${q}`:''}`) },
    create:          (b) => request('POST', '/transaksi', b),
    createSparepart: (b) => request('POST', '/transaksi/sparepart', b),
  },
  karyawan: {
    list:   (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/karyawan${q?`?${q}`:''}`) },
    create: (b)      => request('POST', '/karyawan', b),
    stats:  (id, p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/karyawan/${id}/stats${q?`?${q}`:''}`) },
    resetPassword: (id, b) => request('PATCH', `/karyawan/${id}/password`, b),
  },
  log: {
    list: (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/log${q?`?${q}`:''}`) },
  },
  service: {
    list:            (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/service${q?`?${q}`:''}`) },
    get:             (id)     => request('GET', `/service/${id}`),
    update:          (id, b)  => request('PUT', `/service/${id}`, b),
    pendingApproval: (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/service/pending-approval${q?`?${q}`:''}`) },
    addFotoUrl:      (id, url) => request('POST', `/service/${id}/foto`, { url }),
  },
  customers: {
    list:   (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/customers${q?`?${q}`:''}`) },
    create: (b)      => request('POST', '/customers', b),
  },
  sparepart: {
    list:       (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/sparepart${q?`?${q}`:''}`) },
    create:     (b)      => request('POST', '/sparepart', b),
    updateStok: (id, b)  => request('PATCH', `/sparepart/${id}/stok`, b),
  },
  cabang: {
    list:           ()       => request('GET',    '/cabang'),
    create:         (b)      => request('POST',   '/cabang', b),
    update:         (kode,b) => request('PATCH',  `/cabang/${kode}`, b),
    assignKepala:   (kode,b) => request('POST',   `/cabang/${kode}/kepala`, b),
    pecatKaryawan:  (id)     => request('DELETE', `/cabang/karyawan/${id}`),
  },
  requestSP: {
    list:    (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/request-sparepart${q?`?${q}`:''}`) },
    create:  (b)      => request('POST',  '/request-sparepart', b),
    respond: (id, b)  => request('PATCH', `/request-sparepart/${id}`, b),
  },
  transferStok: {
    list:         (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/transfer-stok${q?`?${q}`:''}`) },
    create:       (b)      => request('POST',  '/transfer-stok', b),
    respond:      (id, b)  => request('PATCH', `/transfer-stok/${id}`, b),
    notifCount:   ()       => request('GET', '/transfer-stok/notif/count'),
    notifPending: ()       => request('GET', '/transfer-stok/notif/pending'),
    cabangList:   ()       => request('GET',  '/transfer-stok/cabang-list'),
  },
};

window.API      = API;
window.Token    = Token;
window.APIError = APIError;
window.MEDIA_URL = BASE_URL.replace('/api/v1', '');
