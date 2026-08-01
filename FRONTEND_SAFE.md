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
- **NAV/VIEWS role menus** — `index.html:804-966`. Cross-checked every page listed in each of the 6 roles' `NAV[role]` arrays against the corresponding backend route guard for that page's primary API calls — no role has a menu entry for a page whose core action it isn't authorized for server-side (the one gap, `navigate()` having no client-side gate of its own beyond menu visibility, is tracked as FBUG-021 — informational, not exploitable, since the backend enforces everything server-side).
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
- **`konfirmasiTransaksi`'s main (non-COD) error path** — on `API.transaksi.create` failure, the cart is preserved (not cleared) and the button re-enables with the server's error message as a toast — correct retry semantics. (The COD sub-step's *separate* validation-after-success bug is tracked as FBUG-005 — this note is specifically about the main try/catch working correctly.)
- **`tambahKeKeranjang`/`ubahJumlahKeranjang`/`renderKeranjang`** — stock cap enforced client-side against the fetched unit list, zero/negative quantity auto-removes the cart line, submitted `sparepart_items` shape matches `SparepartTrxItem` exactly.
- **`konfirmasiApproveRepair`** — payload matches `ApproveRepairRequest`; client blocks `harga_jual <= 0` before the call, matching the backend's own validation.
- **Sparepart/request-sparepart pages not exposed to kasir** — confirmed via `NAV.kasir` (no `sparepart` or `request-sparepart` entry) that the teknisi-only-creation and kepala_or_owner-only-management concerns in those pages never actually surface for the kasir role in normal use (see FBUG-017 for the latent non-issue if reached directly).
- **`approveRequest`** (the *approve*, non-reject, path in approval-sparepart) — client blocks a falsy/zero `harga_jual` before calling the API, correctly matching the backend's positive-value requirement. (Contrast with the *reject* path in the same file, FBUG-004, which is broken.)

## Teknisi / Kurir / COD views

- **Beli reject-at-`sudah_bertemu_penjual` UI gating** — the generic one-click `kurirReject` button is only ever rendered for `status === 'menunggu_kurir'`; at `sudah_bertemu_penjual` the UI correctly offers only the dedicated submit-beli/reject-beli modals, never a fallback to the generic reject. (The reject-beli modal's *submit handler* is separately broken — FBUG-007 — but the UI's decision about *which* action to offer at this status is correct.)
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

## What this file does NOT cover

Everything listed in `FRONTEND_BUG.md` is explicitly **not** confirmed safe — treat those as open
findings. This audit focused on the specific concerns in the task (element↔handler wiring, role
access, and validation/loading/success/error state) — it did not exhaustively check every single
one of the ~40 render functions' every code path, nor any visual/CSS concern (out of scope per the
task), nor whether the app behaves correctly on very old browsers (uses `getUserMedia`,
`AbortController`, `DataTransfer` — all modern-browser-only, untested here as that wasn't asked for).
