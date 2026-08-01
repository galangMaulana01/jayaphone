# FRONTEND_BUG.md — Jayaphone Frontend

Generated: 2026-08-01 (Code-level audit session)

## Methodology

Audit scope per request: **logic and function only — styling/CSS explicitly out of scope.**
Checked three things across `index.html` (router + ~40 page-render functions, one big inline
script) and `main.js` (API client):

1. **UI ↔ logic mapping** — does every button/input/select have a working `onclick`/`onchange`
   handler that actually exists and does the right thing?
2. **Backend integration & role access** — does every `API.*` call match the real backend route
   (method, path, request-body fields), and is the 6-role (owner, kepala_cabang, kasir, teknisi,
   kurir, influencer) menu/action gating consistent with what the backend actually allows?
3. **State handling** — validation, loading state, success toast, error handling per action.

Cross-referenced against the **already-audited-and-fixed** backend at `/workspace/phonejaya`
(routes + schemas + services — same branch where all 22 backend bugs were just fixed). A few
findings below are the frontend's side of state-machine/schema changes made during that backend
fix pass — the backend is correct; the frontend wasn't updated to match.

**No code was changed in this pass — findings only, per instructions.**

---

## HIGH

### FBUG-001 — "Tambah Customer" is completely broken: missing required `cabang` field
- **Function:** `simpanCustomer` — `index.html:3726-3734`
- **Scenario:** The payload sent is `{ nama, kontak }` only:
  ```js
  await API.customers.create({ nama: document.getElementById('cu-nama').value, kontak: document.getElementById('cu-kontak').value });
  ```
  Backend `CustomerCreateRequest` requires `cabang: str` with no default (`app/schemas/customer.py`). Every single "Tambah Customer" submission — from kasir, kepala_cabang, or owner — gets a 422 from FastAPI before the route body even runs. This feature has never worked.
- **Fix direction (not applied):** add `cabang: STATE.user.cabang` (or the owner's selected cabang) to the payload.

### FBUG-002 — Dashboard stat cards ignore the date filter
- **Function:** `renderDashboard` — `index.html:1097-1100`
- **Scenario:** `API.dashboard.stats(_dashCabangFilter)` is called with only a cabang argument; `main.js:340` confirms `stats()` never accepts `date_from`/`date_to`/`hari` even though the backend endpoint supports date filtering. Only `API.dashboard.trend(...)` gets the date-filter params. Result: switching the date-filter tabs (7/30/90 hari, 1 tahun, custom) visibly changes the trend chart but the Total Unit / Stok Tersedia / Total Terjual / Gross Profit cards and the financial summary panel silently keep showing all-time totals — misleading for the exact decision-making these cards exist for.

### FBUG-003 — `doApproveCod` silently discards the kasir's warranty/note edits, corrupting the created unit
- **Function:** `doApproveCod` + `collectUnitFormData` — `index.html:6632-6647`, `6823-6844`
- **Scenario:** `collectUnitFormData()` packs `garansi_toko` and `catatan` **inside** the `unit_data` object, but `doApproveCod` sends `API.cod.approve(codId, { harga_jual, unit_data })` — no top-level `garansi_toko`/`catatan`. Backend `ApproveBeliRequest` and `approve_beli_cod()` only ever read those two fields from the **top level** of the request, defaulting to `garansi_toko: 7` and an auto-generated `catatan` when absent (they never look inside `unit_data`). A kasir who sets "Garansi Toko = 30 hari" and writes a custom note on approval gets a unit silently saved with 7-day warranty and a generic note — no error, no indication the input was dropped.

### FBUG-004 — "Tolak" (reject) on a sparepart request always fails
- **Function:** `rejectRequest` (approval-sparepart) — `index.html:4760-4781`
- **Scenario:** Calls `API.requestSP.approve(req_id, { harga_jual: 0, status: 'Ditolak', catatan: alasan })`. Backend's `harga_jual_positive` validator on `RequestSparepartApproveRequest` raises whenever `harga_jual <= 0`, **regardless of `status`**. Every reject click 422s. Kasir has no working way to reject a sparepart request through this page.

### FBUG-005 — Sale + COD sub-flow: validation runs *after* the sale is already committed, using an uncaught `return`
- **Function:** `konfirmasiTransaksi` — `index.html:3251-3337`
- **Scenario:**
  ```js
  const res = await API.transaksi.create(payload);           // line 3314 — sale ALREADY committed, stock decremented
  ...
  if (!alamat) { showToast('Alamat pengiriman wajib diisi', 'error'); return; }   // line 3321
  ```
  This `return` is a bare exit inside the `try` block, so the surrounding `catch`/`finally` never runs to reset UI state. If the kasir forgot to fill the COD delivery address, the sale has already succeeded server-side, but the button stays stuck on "Memproses...", the cart is never cleared, and no confirmation/receipt modal opens. A kasir seeing a frozen screen may reload and resubmit the same cart — risking a duplicate sale and a second stock deduction for what already went through once.

### FBUG-006 — COD "jual" (courier-sells) flow gets permanently stuck right after acceptance
- **Function:** `renderKurirDashboard` action-button logic — `index.html:~6150-6180`
- **Scenario:** The button ternary chain wires actions for `diterima→kurir_menuju_lokasi` (beli) and `diterima→kurir_menuju_toko` (delivery), but has **no case at all** for `diterima` when `cod.type === 'jual'`, nor for the next step `barang_akan_dijemput` (any type). `barang_akan_dijemput` only appears in a label/color lookup map, never in an `onclick`. Once a kurir accepts a "jual" COD, the Aksi column falls through to the default `-` forever — the entire courier-sells flow is unusable past the first step.

### FBUG-007 — Kurir's dedicated "reject after meeting seller" action is 100% broken
- **Function:** `doRejectCodBeliKurir` — `index.html:6818`
- **Scenario:** Calls `API.cod.kurirRejectBeli(codId, reason)` — **this method does not exist** in `main.js`'s `API.cod` object (confirmed: only `create, list, detail, kurirDashboard, kurirList, kurirAccept, kurirReject, kurirUpdateStatus, kurirInputStok, kurirSubmitBeli, approve, reject, kurirLog, kurirMonitoring` are defined; no `kurirRejectBeli`). Clicking "Tolak" in the reject-beli modal throws `TypeError: API.cod.kurirRejectBeli is not a function`, caught and shown as an opaque error toast. The very endpoint the backend was just patched to *require* at this stage (`POST /cod/kurir/{id}/reject-beli`, mandatory reason) has **no working client binding at all** — a kurir cannot reject a beli-COD after meeting the seller through any working path in this UI.

### FBUG-008 — Influencer catalog search/filter crashes and silently mis-filters
- **Function:** `filterInfluencerCatalog` — `index.html:5646-5658`
- **Scenario:**
  ```js
  const matchQ = !q || i.product_name.toLowerCase().includes(q) || i.unit_id.toLowerCase().includes(q);
  if (filter === 'naked') matchFilter = i.needs_content;
  else if (filter === 'has-content') matchFilter = !i.needs_content;
  ```
  Catalog items (`CatalogItem` schema) have `merk`/`tipe`/`storage`/`has_video` — there is no `product_name` or `needs_content` field. Typing in the search box throws `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`, aborting the filter and leaving the list stuck. The "Needs Content" filter always evaluates to `undefined` → always excludes everything; "Has Content" always evaluates to `true` → always shows everything, including items that still need a video. Compare to the correct logic already used two functions away in `renderInfluencerCatalogList:5673` (`const needsContent = !item.has_video;`) — this function just wasn't updated to match.

---

## MEDIUM

### FBUG-009 — Preset date-filter tabs (7/30/90 hari, 1 tahun) are no-ops on Transaksi & Laporan
- **Functions:** `renderTransaksi:1733-1735`, `renderLaporan:1809-1817`
- **Scenario:** `getDateFilterParams()` returns `{ hari: N }` for preset tabs, but the backend `GET /transaksi` route only declares `date_from`/`date_to` query params — FastAPI silently drops the unrecognized `hari`, so the list always returns the newest N rows with no date filtering at all. Only the "Custom" range option (which sets `date_from`/`date_to` directly) actually filters. The preset tabs visibly highlight as selected but change nothing.

### FBUG-010 — Customer "Ajukan Ulang" (resubmit) hidden from roles the backend explicitly allows
- **Function:** `renderCustomerTable` — `index.html:3595-3636`
- **Scenario:** The entire Aksi column, including resubmit for Rejected rows, is gated behind `isKC = role==='kepala_cabang'||role==='owner'`. Backend `PATCH /customers/{id}/resubmit` uses `require_kasir_teknisi_or_owner` (kasir, teknisi, kepala_cabang, owner). A kasir whose own customer submission was rejected has no UI path to fix and resubmit it, despite being authorized server-side to do exactly that.

### FBUG-011 — Input Transaksi has no fields for `garansi_hari`/`biaya_garansi` even though the code reads them
- **Function:** `renderInputTransaksi` / `konfirmasiTransaksi` — `index.html:2884-3089`, `3255-3256`
- **Scenario:** `konfirmasiTransaksi` reads `document.getElementById('trx-garansi')` and `document.getElementById('trx-biaya-garansi')`, but no such elements exist anywhere in the rendered cart template (confirmed via grep — only these two reference lines exist in the whole file). Both silently resolve to `null`, so every sale defaults to `garansi_hari: 7`, `biaya_garansi: 0` — kasir has no way to sell a paid warranty upgrade even though the backend and the transaction schema both support it.

### FBUG-012 — Kurir monitoring dashboard drops all "jual"/"delivery" completion stats
- **Function:** `renderKurirMonitoring` — `index.html:6322-6463`
- **Scenario:** The backend aggregation (already fixed) returns `cod_delivery`, `status_terkirim`, and `status_transaksi_berhasil`, but this render function only ever reads `cod_beli`, `cod_jual`, `status_selesai`, `status_gagal`, `status_ditolak`, etc. — never the three fields above. A courier who exclusively does deliveries shows `Beli: 0` / `Jual: 0` with no delivery count anywhere, and the "Selesai"/success-rate figures only sum the beli-only `status_selesai`, so a kurir with 50 completed deliveries or jual-sales appears to have completed nothing in this owner/KC-facing view.

### FBUG-013 — Owner's influencer-video filter silently queries the wrong (truncated) dataset
- **Function:** `renderInfluencerMonitor` / its filter handler — `index.html:5911-6027`
- **Scenario:** The influencer/platform filter dropdowns only ever filter `dash.recent_videos` — a small "recent" slice from `GET /influencer/owner/dashboard`. `API.ownerInfluencer.listVideos()` (which hits the real, unfiltered `GET /influencer/owner/videos` list) exists in `main.js` but is never called anywhere in `index.html`. Picking a specific influencer with plenty of videos not in the "recent" slice shows "Tidak ada video" even though matching videos genuinely exist.

### FBUG-014 — Notification polling hits an endpoint kurir/influencer are never allowed to call
- **Function:** `NOTIF.poll()` — `index.html:6920-6944`
- **Scenario:** `if (!role || role === 'teknisi') return;` only excludes teknisi before calling `API.service.pendingApproval(...)`. Backend `GET /service/pending-approval` is gated to `require_kasir_teknisi_or_owner` (owner, kepala_cabang, kasir, teknisi) — **kurir and influencer are not on that list**. Every 30 seconds, for the entire session, any logged-in kurir or influencer silently gets a 403 from this call (swallowed by the empty `catch`). Harmless to data, but it's a real, deterministic, always-failing network call firing continuously for 2 of the 6 roles.

---

## LOW

### FBUG-015 — Karyawan-stats modal title shows the literal text `${starSvg}` instead of the icon
- **Functions:** `modalKaryawanStats:2223`, `_applyKarCustomDate:2398`
- **Scenario:** `modalHeader('${starSvg} Statistik ' + nama)` — the `${starSvg}` sits inside a single-quoted string, so it's never interpolated; `modalHeader` receives the literal 12-character text. Cosmetic (not a CSS/styling issue — it's a template-literal nesting bug), but renders broken-looking text every time this modal opens.

### FBUG-016 — No client-side IMEI format check before submit
- **Function:** `simpanUnit` — `index.html:1665-1726`
- **Scenario:** Backend requires 14-16 digits when IMEI isn't `"-"` (`UnitCreateRequest.imei_format`); frontend validates other required fields but not IMEI format, so a malformed IMEI is only caught after a round trip, surfacing as a raw 422 toast instead of an inline field error.

### FBUG-017 — `renderSparepart`'s create/stok-adjust buttons have no client role gate
- **Function:** `renderSparepart` — `index.html:4207-4258`
- **Scenario:** `POST /sparepart` and `PATCH /sparepart/{id}/stok` are `kepala_or_owner`-only server-side, but this render function doesn't check role before showing "+ Tambah Sparepart"/"Stok" buttons. Not currently reachable by kasir since `NAV.kasir` has no `sparepart` entry, but the function itself is unguarded if ever reached directly (e.g. `navigate('sparepart')` from the console) — would just 403 on submit, no security impact, just a latent inconsistency.

### FBUG-018 — Dead kurir action branch uses the wrong API call if ever reached
- **Function:** `renderKurirDashboard`, `sudah_bertemu_penjual && type !== 'beli'` branch — `index.html:6164-6165`
- **Scenario:** `sudah_bertemu_penjual` only exists in the beli flow, so this branch (for jual/delivery) is unreachable in practice. If it ever became reachable, it calls `API.units.create(...)` (generic unit creation, no `cod_id` link) instead of the purpose-built `API.cod.kurirInputStok`. Dead code today, but a landmine if the state machine ever changes.

### FBUG-019 — Dead "Facebook" option in influencer platform filters
- **Functions:** `renderInfluencerVideos:5780`, `renderInfluencerMonitor:6002`
- **Scenario:** Both filter dropdowns list a Facebook option; Facebook was removed from the backend's `PlatformEnum` entirely, so this filter permanently returns 0 results. Harmless (filter-only, not the creation form, which correctly omits Facebook) but dead and mildly confusing.

### FBUG-020 — No "still syncing" indicator for influencer video metrics
- **Function:** `renderInfluencerVideosList` — `index.html:5806-5850`
- **Scenario:** A freshly-submitted video with a failed/still-pending metrics fetch (best-effort on the backend, can legitimately take a while or fail) renders identically to a video that genuinely got 0 views/likes/comments — no "syncing…" state, no manual retry exposed to the influencer (the retry endpoint `API.influencer.sync()` exists but is `require_owner`-gated server-side anyway, so wiring it into the influencer UI wouldn't even work without a backend change too).

### FBUG-021 — Frontend page routing has no role gate beyond menu visibility (informational, not a security issue)
- **Function:** `navigate()` — `index.html:968-989`
- **Scenario:** `navigate(page)` looks up `VIEWS[page]` and renders it unconditionally — the only thing that stops a kasir from reaching an owner-only page is that the button for it doesn't appear in their sidebar (`NAV[role]`). Anyone opening devtools and calling `navigate('karyawan')` from the console will see the page attempt to render. **Not exploitable as a security bug** — every backend endpoint these pages call enforces its own role/cabang check (verified in the backend audit), so the worst case is a confusing UI state or a 403 toast, never unauthorized data access. Noting it because it means the frontend has zero defense-in-depth of its own; all access control is 100% the backend's job.

---

## Summary table

| ID | Severity | Area | One-line |
|----|----------|------|----------|
| FBUG-001 | High | Customer | Tambah Customer missing `cabang`, always 422s |
| FBUG-002 | High | Dashboard | Stat cards ignore date filter |
| FBUG-003 | High | COD | Approve COD drops kasir's garansi/catatan edits |
| FBUG-004 | High | Sparepart | Reject sparepart request always fails (harga_jual=0) |
| FBUG-005 | High | Transaksi | Post-success validation via uncaught `return`, risk of duplicate sale |
| FBUG-006 | High | COD/Kurir | "Jual" courier flow stuck right after acceptance |
| FBUG-007 | High | COD/Kurir | kurirRejectBeli — method doesn't exist, reject-beli 100% broken |
| FBUG-008 | High | Influencer | Catalog search/filter crashes + always wrong results |
| FBUG-009 | Medium | Transaksi/Laporan | Preset date tabs are no-ops (only Custom works) |
| FBUG-010 | Medium | Customer | Resubmit hidden from kasir/teknisi despite backend allowing it |
| FBUG-011 | Medium | Transaksi | No UI for garansi_hari/biaya_garansi, always defaults |
| FBUG-012 | Medium | Kurir | Monitoring drops jual/delivery completion stats |
| FBUG-013 | Medium | Influencer | Owner video filter queries wrong/truncated dataset |
| FBUG-014 | Medium | Core | Notif polling always-403s for kurir/influencer every 30s |
| FBUG-015 | Low | Karyawan | Modal title shows literal `${starSvg}` text |
| FBUG-016 | Low | Units | No client IMEI format check |
| FBUG-017 | Low | Sparepart | Create/stok buttons unguarded client-side (unreachable today) |
| FBUG-018 | Low | Kurir | Dead branch would use wrong API call if reached |
| FBUG-019 | Low | Influencer | Dead Facebook filter option |
| FBUG-020 | Low | Influencer | No syncing-state indicator for pending metrics |
| FBUG-021 | Low | Core | No client-side route gate (informational — backend is authoritative) |

**No fixes were applied in this pass, per instructions.**
