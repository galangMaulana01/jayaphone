const BASE_URL = window.BACKEND_URL || 'https://jayaphone.vercel.app';

var Token = {
  get: function() { return localStorage.getItem('jyp_token'); },
  set: function(t) { localStorage.setItem('jyp_token', t); },
  clear: function() { localStorage.removeItem('jyp_token'); },
  headers: function() {
    var h = { 'Content-Type': 'application/json' };
    var t = Token.get();
    if (t) h.Authorization = 'Bearer ' + t;
    return h;
  },
  // NOTE: For production, consider migrating to httpOnly cookie-based auth
  // to prevent XSS token theft. This requires backend changes to set/clear cookies.
};

// Store uploaded URLs per uploader id: window._uploads[id] = [url1, url2, ...]
window._uploads = window._uploads || {};

// ===== IMAGE UPLOADER COMPONENT =====
// Returns HTML string. Renders dropzone + preview grid.
// config: { id, maxFiles=1, required=false, label, capture, folder='jayaphone', helper }
function imageUploaderHTML(cfg) {
  var id = cfg.id;
  var max = cfg.maxFiles || 1;
  var required = cfg.required ? 'data-required="1"' : '';
  var folder = cfg.folder || 'jayaphone';
  var label = cfg.label || 'Upload Foto';
  var helper = cfg.helper || '';
  var multiple = max > 1 ? 'multiple' : '';
  window._uploads[id] = window._uploads[id] || [];

  var galleryId = 'iu-file-gallery-' + id;
  var cameraId = 'iu-file-camera-' + id;
  var multipleAttr = max > 1 ? 'multiple' : '';

  return '<div class="img-uploader" data-id="' + id + '" data-folder="' + folder + '" data-max="' + max + '">' +
    '<label class="label">' + (cfg.label || 'Upload Foto') + (cfg.required ? '<span class="text-red-400">*</span>' : '') + '</label>' +
    '<div class="space-y-2">' +
    '  <label for="iu-file-gallery-' + id + '" class="btn btn-ghost w-full justify-start">' +
    '    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 17"/></svg>' +
    '    <span>Pilih dari Galeri</span>' +
    '  </label>' +
    '  <input id="iu-file-gallery-' + id + '" type="file" accept="image/*" ' + multiple + ' class="hidden" onchange="iuHandleFiles(\'' + id + '\', this.files)" />' +
    '  <label for="iu-file-camera-' + id + '" class="btn btn-ghost w-full justify-start">' +
    '    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="12" r="4"/></svg>' +
    '    <span>Ambil Foto dengan Kamera</span>' +
    '  </label>' +
    '  <input id="iu-file-camera-' + id + '" type="file" accept="image/*" ' + multiple + ' class="hidden" onchange="iuHandleFiles(\'' + id + '\', this.files)" />' +
    '</div>' +
    (cfg.helper ? '<p class="text-[11px] dark:text-zinc-500 text-zinc-400 mt-1.5">' + cfg.helper + '</p>' : '') +
    '  <div class="iu-preview grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2" id="iu-preview-' + id + '"></div>' +
    '  <div class="iu-progress hidden mt-2"><div class="h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden"><div class="iu-bar h-full bg-[#4FD1C5] transition-all" style="width:0%"></div></div></div>' +
    '</div>';
}

// Handle file selection -> upload via BACKEND -> render preview
async function iuHandleFiles(id, files) {
  var box = document.querySelector('.img-uploader[data-id="' + id + '"]');
  var max = parseInt(box.dataset.max);
  var folder = box.dataset.folder;
  var preview = document.getElementById('iu-preview-' + id);
  var progress = box.querySelector('.iu-progress');
  var bar = box.querySelector('.iu-bar');
  var existing = window._uploads[id] || [];

  var remaining = max - existing.length;
  if (remaining <= 0) {
    showToast('Maksimal ' + max + ' foto', 'error');
    return;
  }
  var toUpload = Array.from(files).slice(0, remaining);

  progress.classList.remove('hidden');
  for (var i = 0; i < toUpload.length; i++) {
    var file = toUpload[i];
    if (!file.type.startsWith('image/')) { showToast('File harus gambar', 'error'); continue; }
    bar.style.width = '10%';
    try {
      // Upload via backend
      var result = await uploadFile('/upload/image', file);
      var url = result.secure_url;
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
  var preview = document.getElementById('iu-preview-' + id);
  if (!preview) return;
  var urls = window._uploads[id] || [];
  preview.innerHTML = urls.map(function(u, i) {
    return (
      '<div class="relative rounded-lg overflow-hidden border dark:border-zinc-700 border-zinc-200 group">' +
      '  <img src="' + u + '" class="w-full h-20 object-cover" onclick="window.open(\'' + u + '\')"/>' +
      '  <button type="button" onclick="iuRemovePhoto(\'' + id + '\', ' + i + ')" class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>' +
      '</div>'
    );
  }).join('');
}

function iuRemovePhoto(id, idx) {
  if (!window._uploads[id]) return;
  window._uploads[id].splice(idx, 1);
  iuRenderPreview(id);
}

// Image gallery HTML for detail views
function imageGalleryHTML(urls, opts) {
  opts = opts || {};
  if (!urls || !urls.length) {
    return '<div class="flex items-center justify-center h-48 rounded-xl dark:bg-zinc-800/50 bg-zinc-100 text-xs dark:text-zinc-500 text-zinc-400">Tidak ada foto</div>';
  }
  var main = urls[0];
  var thumbs = urls.map(function(u, i) {
    return '<img src="' + u + '" onclick="iuSetMain(\'' + (opts.target || 'iu-main') + '\', \'' + u + '\')" class="w-14 h-14 rounded-lg object-cover cursor-pointer border dark:border-zinc-700 border-zinc-200 hover:border-[#4FD1C5] transition-colors"/>';
  }).join('');
  return (
    '<img id="' + (opts.target || 'iu-main') + '" src="' + main + '" class="w-full h-64 object-contain rounded-xl dark:bg-zinc-800/50 bg-zinc-100 cursor-zoom-in" onclick="window.open(\'' + main + '\')"/>' +
    (urls.length > 1 ? '<div class="flex gap-2 mt-2 flex-wrap">' + thumbs + '</div>' : '')
  );
}

function iuSetMain(targetId, url) {
  var el = document.getElementById(targetId);
  if (el) el.src = url;
}

async function request(method, path, body) {
  var opts = { method: method, headers: Token.headers() };
  if (body) opts.body = JSON.stringify(body);

  var fullPath = BASE_URL + path;
  if (BASE_URL.startsWith('http') && !BASE_URL.includes('/api/v1')) {
    fullPath = BASE_URL + '/api/v1' + path;
  }

  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, 30000);
  var opts2 = Object.assign({}, opts, { signal: controller.signal });

  var res;
  try {
    res = await fetch(fullPath, opts2);
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new APIError(0, 'Request timeout (>30 detik). Server cold start, coba lagi.');
    }
    throw new APIError(0, 'Tidak dapat terhubung ke server. Periksa koneksi internet.');
  }
  clearTimeout(timer);

  var data = {};
  var contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(function() { return {}; });
  } else {
    var txt = await res.text().catch(function() { return ''; });
    if (!res.ok) {
      if (res.status === 403 && txt.toLowerCase().includes('allowlist')) {
        throw new APIError(res.status, 'Backend terkunci (Vercel Deployment Protection aktif).');
      }
      throw new APIError(res.status, txt || 'Server error (' + res.status + ')');
    }
  }

  if (!res.ok) {
    if (res.status === 401) { Token.clear(); window.location.reload(); }
    var msg = data.detail || data.message || 'Terjadi kesalahan (' + res.status + ')';
    if (Array.isArray(msg)) {
      msg = msg.map(function(e) { return e.msg || String(e); }).join('; ');
    } else if (typeof msg === 'object') {
      msg = msg.msg || msg.message || JSON.stringify(msg);
    }
    throw new APIError(res.status, msg);
  }
  return data;
}

async function uploadFile(path, file) {
  var fd = new FormData();
  fd.append('file', file);
  var fullPath = BASE_URL + path;
  if (BASE_URL.startsWith('http') && !BASE_URL.includes('/api/v1')) {
    fullPath = BASE_URL + '/api/v1' + path;
  }
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, 60000);
  var res;
  try {
    res = await fetch(fullPath, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + Token.get() },
      body: fd,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new APIError(0, 'Upload timeout, coba lagi.');
    throw new APIError(0, 'Tidak dapat terhubung ke server.');
  }
  clearTimeout(timer);
  var data = await res.json().catch(function() { return {}; });
  if (!res.ok) {
    var msg = data.detail || data.message || 'Upload gagal';
    if (Array.isArray(msg)) msg = msg.map(function(e) { return e.msg || String(e); }).join('; ');
    else if (typeof msg === 'object') msg = msg.msg || msg.message || JSON.stringify(msg);
    throw new APIError(res.status, msg);
  }
  return data.data || data;
}

async function uploadFiles(path, files, uploadType, options) {
  uploadType = uploadType || 'general';
  options = options || {};
  if (!files.length) throw new APIError(400, 'Tidak ada file');
  if (files.length > 10) throw new APIError(400, 'Maksimal 10 file per request');

  var fd = new FormData();
  for (var i = 0; i < files.length; i++) {
    fd.append('files', files[i]);
  }
  fd.append('upload_type', uploadType);

  if (options.folder) fd.append('folder', options.folder);
  if (options.tags) fd.append('tags', options.tags);
  if (options.contextKey) fd.append('context_key', options.contextKey);
  if (options.contextValue) fd.append('context_value', options.contextValue);

  var fullPath = BASE_URL + path;
  if (BASE_URL.startsWith('http') && !BASE_URL.includes('/api/v1')) {
    fullPath = BASE_URL + '/api/v1' + path;
  }
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, 120000); // 2 min for multi-upload

  try {
    var res = await fetch(fullPath, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + Token.get() },
      body: fd,
      signal: controller.signal,
    });
    clearTimeout(timer);

    var data = await res.json().catch(function() { return {}; });
    if (!res.ok) {
      var msg = data.detail || data.message || 'Upload gagal';
      if (Array.isArray(msg)) msg = msg.map(function(e) { return e.msg || String(e); }).join('; ');
      else if (typeof msg === 'object') msg = msg.msg || msg.message || JSON.stringify(msg);
      throw new APIError(res.status, msg);
    }
    return data.data || data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new APIError(0, 'Upload timeout, coba lagi.');
    throw err;
  }
}

function APIError(status, message) {
  Error.call(this);
  this.message = message;
  this.status = status;
}

var API = {
  auth: {
    login: function(u, p) { return request('POST', '/auth/login', { username: u, password: p }); },
    me: function() { return request('GET', '/auth/me'); },
  },
  dashboard: {
    stats: function(cabang) { return request('GET', '/dashboard/stats' + (cabang ? '?cabang=' + cabang : '')); },
    trend: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/dashboard/trend' + (q ? '?' + q : '')); },
  },
  units: {
    list: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/units' + (q ? '?' + q : '')); },
    create: function(b) { return request('POST', '/units', b); },
    approveRepair: function(id, b) { return request('POST', '/units/' + id + '/approve-repair', b); },
    detail: function(id) { return request('GET', '/units/' + id + '/detail'); },
  },
  transaksi: {
    list: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/transaksi' + (q ? '?' + q : '')); },
    create: function(b) { return request('POST', '/transaksi', b); },
    createSparepart: function(b) { return request('POST', '/transaksi/sparepart', b); },
    detail: function(id) { return request('GET', '/transaksi/' + id + '/detail'); },
  },
  karyawan: {
    list: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/karyawan' + (q ? '?' + q : '')); },
    create: function(b) { return request('POST', '/karyawan', b); },
    stats: function(id, p) { var q = new URLSearchParams(p).toString(); return request('GET', '/karyawan/' + id + '/stats' + (q ? '?' + q : '')); },
    resetPassword: function(id, b) { return request('PATCH', '/karyawan/' + id + '/password', b); },
  },
  log: {
    list: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/log' + (q ? '?' + q : '')); },
  },
  service: {
    list: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/service' + (q ? '?' + q : '')); },
    get: function(id) { return request('GET', '/service/' + id); },
    update: function(id, b) { return request('PUT', '/service/' + id, b); },
    pendingApproval: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/service/pending-approval' + (q ? '?' + q : '')); },
    detail: function(id) { return request('GET', '/service/' + id + '/detail'); },
  },
  customers: {
    list: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/customers' + (q ? '?' + q : '')); },
    create: function(b) { return request('POST', '/customers', b); },
  },
  sparepart: {
    list: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/sparepart' + (q ? '?' + q : '')); },
    create: function(b) { return request('POST', '/sparepart', b); },
    updateStok: function(id, b) { return request('PATCH', '/sparepart/' + id + '/stok', b); },
  },
  cabang: {
    list: function() { return request('GET', '/cabang'); },
    create: function(b) { return request('POST', '/cabang', b); },
    update: function(kode, b) { return request('PATCH', '/cabang/' + kode, b); },
    assignKepala: function(kode, b) { return request('POST', '/cabang/' + kode + '/kepala', b); },
    pecatKaryawan: function(id) { return request('DELETE', '/cabang/karyawan/' + id); },
  },
  requestSP: {
    list: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/request-sparepart' + (q ? '?' + q : '')); },
    create: function(b) { return request('POST', '/request-sparepart', b); },
    respond: function(id, b) { return request('PATCH', '/request-sparepart/' + id, b); },
  },
  transferStok: {
    list: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/transfer-stok' + (q ? '?' + q : '')); },
    create: function(b) { return request('POST', '/transfer-stok', b); },
    respond: function(id, b) { return request('PATCH', '/transfer-stok/' + id, b); },
    notifCount: function() { return request('GET', '/transfer-stok/notif/count'); },
    notifPending: function() { return request('GET', '/transfer-stok/notif/pending'); },
    cabangList: function() { return request('GET', '/transfer-stok/cabang-list'); },
  },
  influencer: {
    dashboard: function(hari, platform) { var q = 'hari=' + (hari || 90); if (platform) q += '&platform=' + platform; return request('GET', '/influencer/dashboard/stats?' + q); },
    catalog: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/influencer/catalog' + (q ? '?' + q : '')); },
    createVideo: function(b) { return request('POST', '/influencer/videos', b); },
    listVideos: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/influencer/videos' + (q ? '?' + q : '')); },
    listLog: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/influencer/log' + (q ? '?' + q : '')); },
    sync: function() { return request('POST', '/influencer/sync'); },
  },
  ownerInfluencer: {
    dashboard: function() { return request('GET', '/influencer/owner/dashboard'); },
    listVideos: function(p) { var q = new URLSearchParams(p).toString(); return request('GET', '/influencer/owner/videos' + (q ? '?' + q : '')); },
    listInfluencers: function() { return request('GET', '/influencer/owner/influencers'); },
  },
  upload: {
    image: function(file) { return uploadFile('/upload/image', file); },
    images: function(files, uploadType, options) { return uploadFiles('/upload/images', files, uploadType, options); },
    delete: function(publicId) { return uploadFile('/upload/image', new Blob([publicId], {type: 'application/json'})); },
  },
};

window.API = API;
window.Token = Token;
window.APIError = APIError;
window.MEDIA_URL = BASE_URL.replace('/api/v1', '');