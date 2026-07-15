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
    '  <button type="button" class="btn btn-ghost w-full justify-start" onclick="document.getElementById(\'iu-file-gallery-' + id + '\').click()">' +
    '    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 17"/></svg>' +
    '    <span>Pilih dari Galeri</span>' +
    '  </button>' +
    '  <input id="iu-file-gallery-' + id + '" type="file" accept="image/*" ' + multiple + ' class="hidden" onchange="iuHandleFiles(\'' + id + '\', this.files)" />' +
    '  <button type="button" class="btn btn-ghost w-full justify-start" onclick="document.getElementById(\'iu-file-camera-' + id + '\').click()">' +
    '    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="12" r="4"/></svg>' +
    '    <span>Ambil Foto dengan Kamera</span>' +
    '  </button>' +
    '  <input id="iu-file-camera-' + id + '" type="file" accept="image/*" capture="environment" ' + multiple + ' class="hidden" onchange="iuHandleFiles(\'' + id + '\', this.files)" />' +
    '</div>' +
    (helper ? '<p class="text-[11px] dark:text-zinc-500 text-zinc-400 mt-1.5">' + helper + '</p>' : '') +
    '  <div class="iu-preview grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2" id="iu-preview-' + id + '"></div>' +
    '  <div class="iu-progress hidden mt-2"><div class="h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden"><div class="iu-bar h-full bg-[#4FD1C5] transition-all" style="width:0%"></div></div></div>' +
    '</div>';
}

window._uploads = window._uploads || {};

async function iuHandleFiles(id, files) {
  var box = document.querySelector('.img-uploader[data-id="' + id + '"]');
  var max = parseInt(box.dataset.max);
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
    return '<div class="relative rounded-lg overflow-hidden border dark:border-zinc-700 border-zinc-200 group">' +
      '  <img src="' + u + '" class="w-full h-20 object-cover" onclick="window.open(\'' + u + '\')"/>' +
      '  <button type="button" onclick="iuRemovePhoto(\'' + id + '\', ' + i + ')" class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>' +
      '</div>';
  }).join('');
}

function iuRemovePhoto(id, idx) {
  if (!window._uploads[id]) return;
  window._uploads[id].splice(idx, 1);
  iuRenderPreview(id);
}

