# FRONTEND_SAFE.md — Jayaphone Frontend

Generated: 2026-08-01 (Code-level audit session)

## Purpose

Functions/features read line-by-line during this audit and confirmed to have correct handler
wiring, correct API contracts (cross-checked against `/workspace/phonejaya`'s routes/schemas),
and correct loading/success/error state handling. Goal: future sessions don't need to re-verify
these from scratch. If you change any of the referenced functions, re-check the specific claim
below rather than trusting it blindly.

Scope note: styling/CSS was explicitly out of scope for this audit, so "safe" here means *logic*
is correct — visual polish was not evaluated either way.

---

## Core (routing, auth, session)

- **`doLogin`/`doLogout`** — `index.html:773-801`. Validates both fields before calling `API.auth.login`, shows spinner + disables button during the call, clears the error banner on retry, restores button state in `finally`. Logout stops notification polling, clears token/state, and resets the login form fields.
- **Session restore on load** — `index.html:7022-7032`. Checks `Token.get()`, calls `API.auth.me()`, and on any failure clears the token silently (user just sees the login page) rather than showing a raw error for a background restore attempt.
- **`request()` 401 handling** — `main.js:232-233`. Any 401 response clears the token and reloads the page, consistently across every API call, so a session that's actually expired never gets stuck showing stale authenticated UI.
- **NAV/VIEWS role menus** — `index.html:804-966`. Cross-checked every page listed in each of the 6 roles' `NAV[role]` arrays against the corresponding backend route guard for that page's primary API calls — no role has a menu entry for a page whose core action it isn't authorized for server-side. `navigate()` now also enforces this same `NAV[role]` membership check itself before rendering (fixed as FBUG-021, see below), on top of the backend's own enforcement.
- **`renderSettings`/`simpanProfil`/`gantiPassword`** — `index.html:3737-3862`. Password-change flow validates all fields non-empty, new/confirm match, and length ≥6 client-side before calling `API.auth.changePassword`; profile-photo update correctly re-fetches `/auth/me` and re-renders the avatar afterward. Both show spinner + disable button during the call and restore state in `finally`/`catch`.
- **Transfer-stok notification polling** — `index.html:6946-6972` (inside `NOTIF.poll`). Correctly gated to `role === 'kepala_cabang' || role === 'owner'`, matching the backend's `GET /transfer-stok/notif/count` guard exactly (recently tightened server-side to the same two roles).

## Owner / Kepala Cabang admin views

- **`renderStok`/`simpanUnit`** — "Tambah Unit" button correctly hidden when `STATE.user.role === 'owner'`; payload field names match `UnitCreateRequest`; branches correctly between Mulus (`harga_jual` required) and Repair (`keluhan` + `sparepart_items` required).
- **`renderCabang`/`simpanCabang`/`updateCabang`/`toggleAktifCabang`/`simpanKepalaCabang`** — every call maps 1:1 to `app/routes/cabang.py`, all owner-only server-side; page itself only appears in `NAV.owner`, not `kepala_cabang`. Client validates required fields and password length ≥6 before submission.
- **`renderTransferStok`/`renderTransferTable`/`simpanTransfer`** — "Transfer Baru" gated to kepala_cabang only, matching backend's `require_kepala_cabang_only` on `POST /transfer-stok`; payload shape matches `TransferStokCreateRequest` exactly.
- **`renderKaryawan`/`simpanKaryawan`/`simpanResetPassword`** — reset-password and "Pecat" actions gated to `role === 'owner'` only, matching `require_owner` on both corresponding backend endpoints. "Tambah Karyawan" available to both kepala_cabang and owner, matching `require_kepala_or_owner`.
- **`renderLog` + shared date-filter widget** (`renderDateFilter`/`setPresetFilter`/`applyCustomFilter`/`showCustomDateModal`) — all `onclick` targets resolve to real functions; cabang filter dropdown only rendered for owner, matching `GET /cabang` being owner-only.

## Kasir operational views

- **`simpanUnit`** payload mapping — confirmed correct (see Owner section; same function, kasir is the primary user).
- **`konfirmasiTransaksi`'s main (non-COD) error path** — on `API.transaksi.create` failure, the cart is preserved (not cleared) and the button re-enables with the server's error message as a toast — correct retry semantics. (The COD sub-step's separate validation-after-success issue was fixed as FBUG-005, see the "Fixed in this pass" section below.)
- **`tambahKeKeranjang`/`ubahJumlahKeranjang`/`renderKeranjang`** — stock cap enforced client-side against the fetched unit list, zero/negative quantity auto-removes the cart line, submitted `sparepart_items` shape matches `SparepartTrxItem` exactly.
- **`konfirmasiApproveRepair`** — payload matches `ApproveRepairRequest`; client blocks `harga_jual <= 0` before the call, matching the backend's own validation.
- **Sparepart/request-sparepart pages not exposed to kasir** — confirmed via `NAV.kasir` (no `sparepart` or `request-sparepart` entry) that the teknisi-only-creation and kepala_or_owner-only-management concerns in those pages never actually surface for the kasir role in normal use (the render function itself is now also role-gated directly — FBUG-017, see "Fixed in this pass" below).
- **`approveRequest`** (the *approve*, non-reject, path in approval-sparepart) — client blocks a falsy/zero `harga_jual` before calling the API, correctly matching the backend's positive-value requirement. (The *reject* path in the same file had its own bug, fixed as FBUG-004.)

## Teknisi / Kurir / COD views

- **Beli reject-at-`sudah_bertemu_penjual` UI gating** — the generic one-click `kurirReject` button is only ever rendered for `status === 'menunggu_kurir'`; at `sudah_bertemu_penjual` the UI correctly offers only the dedicated submit-beli/reject-beli modals, never a fallback to the generic reject. (The reject-beli modal's submit handler itself had a separate bug, fixed as FBUG-007 — the UI's decision about *which* action to offer at this status was always correct.)
- **`kurirUpdateStatus` never used to skip `submit-beli`** — grepped every call site inside `renderKurirDashboard`; `menunggu_approval_kasir` is only ever reached via `doSubmitBeli` → `API.cod.kurirSubmitBeli`, matching the backend's requirement (recently added server-side) that this transition can't happen through the generic status endpoint.
- **`renderKurirMonitoring` NAV gating** — appears only in `NAV.owner` and `NAV.kepala_cabang`, absent from kasir/teknisi/kurir/influencer, matching the backend's owner/KC-only guard on the monitoring endpoint.
- **COD status-string literals** — every status string passed by a kurir dashboard button (`kurir_menuju_lokasi`, `sudah_bertemu_penjual`, `kurir_menuju_toko`, `barang_sudah_diambil`, `sedang_diantar`, `terkirim`, `gagal`, `kurir_sedang_transaksi`, `transaksi_berhasil`) matches the backend's flow-table strings exactly — no typos found.
- **`renderCodBeli`/`submitCodBeli`** — payload matches `CODRequestCreate` for `type=beli`; required-field check on `product_name` present before submission.
- **`renderServiceTeknisi`/`filterServiceTeknisi`/`updateService`** — status transitions (`Antrian→Proses→Selesai/Ditolak`) gated client-side matching backend-valid transitions; before/after photo requirements enforced before calling `API.service.update`.

## Influencer views

- **`modalUploadVideo` platform dropdown** — offers only `tiktok` and `instagram`, no `facebook` (correctly matching the backend's `PlatformEnum`, which dropped Facebook support) and no `youtube` either (a safe subset, not a bug).
- **URL/platform mismatch handling** — no client-side host check exists on the video URL input, but a mismatched platform/URL pair is correctly rejected by the backend's (recently added) `_host_allowed` validator, and the resulting 422 detail message bubbles up through `request()`'s array-error handling as a readable toast — no crash, no silent failure.
- **`renderInfluencerCatalog` → `modalUploadVideo` unit_id pre-fill** — clicking a catalog item correctly threads `unit_id` through to the upload form's hidden/select field, and the submit handler reads it straight from the form into the payload — no data loss in the click-to-payload chain.
- **`influencer-monitor` NAV gating** — appears only in `NAV.owner`, absent from `kepala_cabang` and every other role, matching all three `/influencer/owner/*` routes being `require_owner`-gated.
- **Route liveness** — confirmed `API.ownerInfluencer.*` in `main.js` targets the live, registered `influencer.py` routes, not the dead/unregistered `owner_influencer.py` file (consistent with the backend audit's earlier finding that the latter is never imported in `app/main.py`).
- **Loading/error wiring** — all five influencer render functions call `setLoading(...)` before their fetch and `errorState(...)` on failure; the upload-video submit handler shows a spinner, disables the button, and resets it in `finally`.

---

## Fixed in this pass (2026-08-01) — moved from FRONTEND_BUG.md

All 21 findings from the original audit are fixed in code. Each entry below replaces its old
`FRONTEND_BUG.md` entry — the ID is kept for traceability back to commit history.

### High

- **FBUG-001 (Customer)** — `simpanCustomer` (`index.html`) now sends `cabang: STATE.user.cabang || 'JYP'` in the create payload, matching the required field on `CustomerCreateRequest`. Previously always 422'd.
- **FBUG-002 (Dashboard)** — `getDateFilterParams()` now always returns computed `date_from`/`date_to` (converting presets to explicit dates) instead of `{hari: N}` for preset tabs; `API.dashboard.stats` (`main.js`) now accepts a full params object instead of a bare cabang string; `renderDashboard` and `renderLaporan` both pass the date filter through. This single root-cause fix also resolved FBUG-009 and fixed the same latent date-filter no-op in `renderLog`, `renderServiceOwner`'s log tab, `renderTeknisiLog`, `renderKurirLog`, `renderKurirMonitoring`, and `renderInfluencerLog` — none of those were previously filtering by date either, since they all fed `hari` into endpoints that only understand `date_from`/`date_to`.
- **FBUG-003 (COD)** — `doApproveCod` now sends `garansi_toko`/`catatan` as top-level fields alongside `unit_data`, matching where `ApproveBeliRequest`/`approve_beli_cod()` actually read them from. Previously the kasir's edits were silently discarded and every approved unit got the default 7-day warranty.
- **FBUG-004 (Sparepart)** — `rejectRequest` now sends `harga_jual: 1` (a harmless placeholder — confirmed the value is never read on the backend's Ditolak path) instead of `0`, which the backend's unconditional `harga_jual > 0` validator always rejected. This is a frontend workaround for a backend validation quirk, not a backend fix.
- **FBUG-005 (Transaksi)** — the COD-delivery address is now validated *before* `API.transaksi.create()` is called, not after. If the COD sub-request itself fails after a successful sale, it now shows "Transaksi tersimpan, tapi gagal membuat COD Delivery..." instead of a frozen button and no feedback — the cart still clears and the receipt still opens since the sale did succeed.
- **FBUG-006 (Kurir/COD)** — added the missing `diterima→barang_akan_dijemput` and `barang_akan_dijemput→barang_sudah_diambil` action buttons in `renderKurirDashboard` for `type='jual'`, connecting the flow through to the already-working `barang_sudah_diambil→kurir_sedang_transaksi→transaksi_berhasil` steps. Also added terminal-state labels for `transaksi_berhasil`/`terkirim`/`gagal`/`ditolak` (previously fell through to a bare `-`).
- **FBUG-007 (Kurir/COD)** — added the missing `kurirRejectBeli(id, reason)` method to `API.cod` in `main.js`, calling `POST /cod/kurir/{id}/reject-beli`. Previously `doRejectCodBeliKurir` called a nonexistent method and always threw a `TypeError`.
- **FBUG-008 (Influencer)** — `filterInfluencerCatalog` now builds the search string from `merk`/`tipe`/`storage` and derives `needsContent` from `!has_video`, matching `CatalogItem`'s real fields (previously read nonexistent `product_name`/`needs_content`, crashing on every search keystroke and always mis-filtering).

### Medium

- **FBUG-009 (Transaksi/Laporan)** — resolved as a side effect of FBUG-002 (see above).
- **FBUG-010 (Customer)** — `renderCustomerTable` now shows the Aksi column and the "Ajukan Ulang" resubmit button for kasir/teknisi too (`canResubmit` check), matching `require_kasir_teknisi_or_owner` on `PATCH /customers/{id}/resubmit`. Approve/reject stays gated to `isKC` (kepala_cabang/owner only), matching that endpoint's stricter guard.
- **FBUG-011 (Transaksi)** — added the actual `#trx-garansi`/`#trx-biaya-garansi` input fields to `renderInputTransaksi` (previously read by `konfirmasiTransaksi` but never rendered, so always silently defaulted). Also wired `biaya_garansi` into the live price-breakdown preview (`hitungPoin()`), with a new breakdown row, so the estimate shown to the kasir matches what the backend will actually charge.
- **FBUG-012 (Kurir)** — `renderKurirMonitoring` now reads `cod_delivery`, `status_terkirim`, and `status_transaksi_berhasil` from the monitoring response (added to the summary cards, the per-kurir type breakdown, and the combined "Selesai" count) instead of only ever showing beli/jual stats. Also fixed an unrelated bug found while touching this function: `isOwner` checked `window.currentUser` (never set anywhere in the app) instead of `STATE.user`, so the owner-only cabang filter dropdown never appeared for actual owners.
- **FBUG-013 (Influencer)** — `filterOwnerInfluencerVideos` now calls `API.ownerInfluencer.listVideos({influencer_id, platform})` (the real, unfiltered endpoint) whenever a filter is actually selected, instead of only ever filtering the small "recent videos" slice from the dashboard summary. The no-filter case still uses the cheap dashboard slice with no extra request.
- **FBUG-014 (Core)** — `NOTIF.poll()` now only calls `API.service.pendingApproval` for `role in ['kasir', 'kepala_cabang', 'owner']` (previously excluded only `teknisi`, so kurir/influencer got a guaranteed 403 every 30 seconds for the life of the session).

### Low

- **FBUG-015 (Karyawan)** — `modalKaryawanStats`'s two `modalHeader(...)` calls now use a real template literal (`` `${starSvg} Statistik ${nama}` ``) instead of a single-quoted string with dead `${...}` syntax inside it.
- **FBUG-016 (Units)** — `simpanUnit` now validates IMEI against `^\d{14,16}$` (matching the backend's `imei_format` validator) before submitting, instead of only discovering a bad format via a 422 round-trip.
- **FBUG-017 (Sparepart)** — `renderSparepart` now hides the "+ Tambah Sparepart" button, the Aksi column header, and the per-row "Stok" button unless `STATE.user.role` is `kepala_cabang` or `owner`, matching the backend guards on `POST /sparepart` and `PATCH /sparepart/{id}/stok`.
- **FBUG-018 (Kurir)** — `doKurirInputStok` now calls `API.cod.kurirInputStok(...)` (`POST /cod/kurir/input-stok`, `require_kurir`) instead of `API.units.create(...)` (`POST /units`, which does **not** allow the `kurir` role and would have 403'd if this dead branch ever became reachable).
- **FBUG-019 (Influencer)** — removed the dead `<option value="facebook">` from both platform-filter dropdowns (`renderInfluencerVideos`, `renderInfluencerMonitor`) — Facebook was already removed from the backend's `PlatformEnum`.
- **FBUG-020 (Influencer)** — `renderInfluencerVideosList` now shows a small amber hint ("Metrik belum tersedia — bisa jadi masih menunggu sinkronisasi otomatis...") when a video's views/likes/comments are all exactly 0, instead of presenting that as a confident zero with no context.
- **FBUG-021 (Core)** — `navigate()` now checks the target page against `NAV[STATE.user.role]` before rendering, refusing with a clear "Akses Ditolak" message instead of silently attempting to render a page outside the current role's menu. This is defense-in-depth only (the backend already enforced every real access decision); to avoid regressing the two notification click-through paths (`approval-repair` for pending-service-approval, `transfer-stok` for pending-transfer alerts), `approval-repair` and `transfer-stok` were also added to `NAV.owner` — both pages' view functions already had working owner-specific code paths, they just weren't linked from the owner's sidebar menu.

---

## What this file does NOT cover

Everything listed in `FRONTEND_BUG.md` is explicitly **not** confirmed safe — treat those as open
findings. This audit focused on the specific concerns in the task (element↔handler wiring, role
access, and validation/loading/success/error state) — it did not exhaustively check every single
one of the ~40 render functions' every code path, nor any visual/CSS concern (out of scope per the
task), nor whether the app behaves correctly on very old browsers (uses `getUserMedia`,
`AbortController`, `DataTransfer` — all modern-browser-only, untested here as that wasn't asked for).
