'use strict';

const BASE_URL = window.BACKEND_URL || 'https://jayaphone.vercel.app';

// ═══ CLOUDINARY CONFIG ═══
// Upload langsung dari frontend (unsigned preset).
// Ganti nilai ini sesuai akun Cloudinary lo.
const CLOUDINARY_CLOUD_NAME = 'jayaphone';
const CLOUDINARY_UPLOAD_PRESET = 'jayaphone_unsigned';
const CLOUDINARY_BASE = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Upload 1 file ke Cloudinary, return secure_url
async function uploadToCloudinary(file, folder = 'jayaphone') {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  fd.append('folder', folder);
  // Auto-optimize: resize max 1200px, WebP, quality auto
  fd.append('transformation', 'f_auto,q_auto,w_1200');

  const res = await fetch(CLOUDINARY_BASE, { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new APIError(res.status, data?.error?.message || 'Upload gambar gagal');
  }
  return data.secure_url;
}

// Store uploaded URLs per uploader id: window._uploads[id] = [url1, url2, ...]
window._uploads = window._uploads || {};

// ═══ IMAGE UPLOADER COMPONENT ═══
// Returns HTML string. Renders dropzone + preview grid.
// config: { id, maxFiles=1, required=false, label, capture, folder='jayaphone', helper }
function imageUploaderHTML(cfg) {
  const id = cfg.id;
  const max = cfg.maxFiles || 1;
  const required = cfg.required ? 'data-required="1"' : '';
  const capture = cfg.capture ? `capture="${cfg.capture}"` : '';
  const folder = cfg.folder || 'jayaphone';
  const label = cfg.label || 'Upload Foto';
  const helper = cfg.helper || '';
  const multiple = max > 1 ? 'multiple' : '';
  window._uploads[id] = window._uploads[id] || [];

  return `
  <div class="img-uploader" data-id="${id}" data-folder="${folder}" data-max="${max}">
    <label class="label">${label} ${cfg.required ? '<span class="text-red-400">*</span>' : ''}</label>
    <div class="iu-dropzone flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed dark:border-zinc-700 border-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
         onclick="document.getElementById('iu-file-${id}').click()">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:text-zinc-500 text-zinc-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <span class="text-[11px] dark:text-zinc-500 text-zinc-400">${max > 1 ? `Pilih hingga ${max} foto` : 'Ambil / pilih foto'}</span>
    </div>
    <input id="iu-file-${id}" type="file" accept="image/*" ${capture} ${multiple} class="hidden" onchange="iuHandleFiles('${id}', this.files)" />
    ${helper ? `<p class="text-[11px] dark:text-zinc-500 text-zinc-400 mt-1.5">${helper}</p>` : ''}
    <div class="iu-preview grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2" id="iu-preview-${id}"></div>
    <div class="iu-progress hidden mt-2"><div class="h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden"><div class="iu-bar h-full bg-[#4FD1C5] transition-all" style="width:0%"></div></div></div>
  </div>`;
}

// Handle file selection → upload to Cloudinary → render preview
async function iuHandleFiles(id, files) {
  const box = document.querySelector(`.img-uploader[data-id="${id}"]`);
  const max = parseInt(box.dataset.max);
  const folder = box.dataset.folder;
  const preview = document.getElementById(`iu-preview-${id}`);
  const progress = box.querySelector('.iu-progress');
  const bar = box.querySelector('.iu-bar');
  const existing = window._uploads[id] || [];

  const remaining = max - existing.length;
  if (remaining <= 0) {
    showToast(`Maksimal ${max} foto`, 'error');
    return;
  }
  const toUpload = Array.from(files).slice(0, remaining);

  progress.classList.remove('hidden');
  for (const file of toUpload) {
    if (!file.type.startsWith('image/')) { showToast('File harus gambar', 'error'); continue; }
    bar.style.width = '10%';
    try {
      const url = await uploadToCloudinary(file, folder);
      bar.style.width = '100%';
      window._uploads[id] = window._uploads[id] || [];
      window._uploads[id].push(url);
      iuRenderPreview(id);
    } catch (e) {
      showToast(e.message || 'Upload gagal', 'error');
    }
  }
  progress.classList.add('hidden');
  bar.style.width = '0%';
}

function iuRenderPreview(id) {
  const preview = document.getElementById(`iu-preview-${id}`);
  if (!preview) return;
  const urls = window._uploads[id] || [];
  preview.innerHTML = urls.map((u, i) => `
    <div class="relative rounded-lg overflow-hidden border dark:border-zinc-700 border-zinc-200 group">
      <img src="${u}" class="w-full h-20 object-cover" onclick="window.open('${u}')"/>
      <button type="button" onclick="iuRemovePhoto('${id}', ${i})" class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
    </div>`).join('');
}

function iuRemovePhoto(id, idx) {
  if (!window._uploads[id]) return;
  window._uploads[id].splice(idx, 1);
  iuRenderPreview(id);
}

// Image gallery HTML for detail views
function imageGalleryHTML(urls, opts = {}) {
  if (!urls || !urls.length) {
    return `<div class="flex items-center justify-center h-48 rounded-xl dark:bg-zinc-800/50 bg-zinc-100 text-xs dark:text-zinc-500 text-zinc-400">Tidak ada foto</div>`;
  }
  const main = urls[0];
  const thumbs = urls.map((u, i) => `
    <img src="${u}" onclick="iuSetMain('${opts.target||'iu-main'}', '${u}')" class="w-14 h-14 rounded-lg object-cover cursor-pointer border dark:border-zinc-700 border-zinc-200 hover:border-[#4FD1C5] transition-colors"/>`).join('');
  return `
    <img id="${opts.target||'iu-main'}" src="${main}" class="w-full h-64 object-contain rounded-xl dark:bg-zinc-800/50 bg-zinc-100 cursor-zoom-in" onclick="window.open('${main}')"/>
    ${urls.length > 1 ? `<div class="flex gap-2 mt-2 flex-wrap">${thumbs}</div>` : ''}`;
}

function iuSetMain(targetId, url) {
  const el = document.getElementById(targetId);
  if (el) el.src = url;
}

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
    detail:        (id)     => request('GET', `/units/${id}/detail`),
  },
  transaksi: {
    list:   (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/transaksi${q?`?${q}`:''}`) },
    create:          (b) => request('POST', '/transaksi', b),
    createSparepart: (b) => request('POST', '/transaksi/sparepart', b),
    detail:          (id) => request('GET', `/transaksi/${id}/detail`),
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
    detail:          (id)     => request('GET', `/service/${id}/detail`),
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
  influencer: {
    dashboard: (hari = 90) => request('GET', `/influencer/dashboard/stats?hari=${hari}`),
    catalog:   (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/influencer/catalog${q?`?${q}`:''}`) },
    createVideo: (b) => request('POST', '/influencer/videos', b),
    listVideos:  (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/influencer/videos${q?`?${q}`:''}`) },
    listLog:     (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/influencer/log${q?`?${q}`:''}`) },
    sync: () => request('POST', '/influencer/sync'),
  },
  ownerInfluencer: {
    dashboard: () => request('GET', '/influencer/owner/dashboard'),
    listVideos: (p = {}) => { const q = new URLSearchParams(p).toString(); return request('GET', `/influencer/owner/videos${q?`?${q}`:''}`) },
    listInfluencers: () => request('GET', '/influencer/owner/influencers'),
  },
};

window.API      = API;
window.Token    = Token;
window.APIError = APIError;
window.MEDIA_URL = BASE_URL.replace('/api/v1', '');
