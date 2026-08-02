# Migration Notes — Vanilla-JS SPA → Next.js + TypeScript + Tailwind

Generated: 2026-08-02 (migration commit)

## TL;DR

The old `index.html` + `main.js` + `svg.js` frontend is now scaffolded as a
proper Next.js 15 + TypeScript + Tailwind CSS project. Foundations
(API client, icons, types, auth, theme, toast, routing, sidebar, header,
notification polling) are **fully migrated**; three sample pages (Dashboard,
Stok, Settings) are **fully migrated as templates**; the remaining ~27
pages are **scaffolded as stubs** that point back at the exact function +
line range in `index.html.bak`, so a follow-up developer can continue
one page at a time without re-planning the architecture.

The originals are preserved as `index.html.bak`, `main.js.bak`, and
`svg.js.bak` for side-by-side comparison during future page migrations
(never delete these until the whole migration is signed off).

## How to run

```bash
npm install
npm run dev       # http://localhost:3000, points at the production backend by default
# override with:
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000 npm run dev
```

`npm run typecheck` runs a bare `tsc --noEmit`. `npm run build` will do a
production Next.js build.

## Directory layout

```
src/
├── app/                         Next.js App Router entrypoint
│   ├── layout.tsx               Root HTML shell + AppProviders
│   ├── page.tsx                 "/" — redirects to /login or role landing
│   ├── login/page.tsx           Public login form
│   ├── (app)/                   Protected route group (auth guard)
│   │   ├── layout.tsx           Sidebar + header + role-page gate
│   │   ├── dashboard/page.tsx   ✅ FULLY MIGRATED — template
│   │   ├── stok/page.tsx        ✅ FULLY MIGRATED — template
│   │   ├── settings/page.tsx    ✅ FULLY MIGRATED — template
│   │   └── <27 more pages>/     ⏳ STUBBED — see per-page TODO
│   ├── providers.tsx            <AppProviders> — client-only context tree
│   └── globals.css              Tailwind + legacy design-system classes
├── components/
│   ├── layout/                  Sidebar, AppHeader, UserAvatar, NotificationBell
│   └── ui/                      Modal, StatCard, LoadingSkeleton, ErrorState,
│                                EmptyState, Badge, DateFilterBar, InputField,
│                                MigrationPendingStub
├── contexts/                    AuthContext, ThemeContext, ToastContext
└── lib/
    ├── api/                     ✅ Full port of main.js — typed
    ├── config/nav.ts            Role→NAV, PAGE_META, landing pages
    ├── icons/                   ✅ Full port of svg.js as strings + <Icon>
    ├── types/                   TypeScript types for every backend contract
    └── utils/                   formatters, dateFilter, profilePhotoUrl (SSRF)
```

## What's fully migrated

- **API client (`lib/api`)** — every endpoint from the legacy `window.API`
  namespace is now a typed method on `Api.<resource>.<method>()`. Request
  timeout handling, 401-reload behavior, error message coalescing, and
  the FBUG-007 fix for `kurirRejectBeli` are all preserved. The token is
  still stored under `localStorage['jyp_token']` so an existing session
  from the legacy app remains valid on first load of the new one.
- **Icons (`lib/icons`)** — every `const xxxSvg` from `svg.js.bak` is
  re-exported plus aggregated into a lookup `iconLibrary` record. The
  `<Icon name="dashboardSvg" className="h-4 w-4" />` component wraps
  `dangerouslySetInnerHTML` in one place; consumers just pass the name.
- **Auth (`contexts/AuthContext`)** — session restore on mount via
  `/auth/me`, in-memory user cache, login/logout/refresh helpers.
  Consumed by everything under `(app)/layout.tsx`.
- **Theme (`contexts/ThemeContext`)** — dark/light toggle persisted to
  `localStorage['jyp_theme']`, same key as the legacy app.
- **Toast (`contexts/ToastContext`)** — `useToast().showToast(msg, variant)`
  fires transient notifications with the same 3.2s auto-dismiss and three
  variants (success/error/info) the legacy app used.
- **Sidebar** — reads `navigationByRole[user.role]` from `lib/config/nav.ts`
  and renders Next.js links. Same menus per role as the legacy NAV object.
- **Header** — page title, notification bell, theme toggle, avatar with
  dropdown (Pengaturan / Keluar).
- **NotificationBell** — polls `/service/pending-approval` for
  kasir/kepala_cabang/owner and `/transfer-stok/notif/{count,pending}`
  for owner/kepala_cabang every 30 seconds. Preserves the localStorage
  dedup set (`jyp_notif_seen`) and FBUG-014 role gate.
- **Route guards** — the (app) layout checks
  `isPageAllowedForRole(user.role, currentPageKey)` before rendering a
  page's children, mirroring the FBUG-021 defense-in-depth fix.
- **DateFilterBar** — the 7d/30d/90d/1y/custom filter chip row. Preset
  clicks emit explicit `date_from`/`date_to` (the FBUG-002 root-cause fix),
  not `hari`, so every page that uses it inherits the correct behaviour.
- **UI primitives** — LoadingSkeleton, ErrorState, EmptyState, StatCard,
  Badge (Unit/Service), Modal, LabelledInput/Textarea/Select. Every legacy
  helper (`badge()`, `emptyState()`, `errorState()`, `setLoading()`,
  `statCard()`, `finRow()`, etc.) has a first-class replacement.

## Sample pages (fully migrated — use as templates)

- **`/dashboard`** — role: owner / kepala_cabang. StatCards + date filter +
  recent-transaksi table. Chart.js line chart is deferred (see TODO in the
  file); raw trend data is displayed as a table in the interim.
- **`/stok`** — role: owner / kepala_cabang / kasir / teknisi. Search +
  status filter + card grid. Includes cabang filter placeholder (TODO)
  and role-gated "Tambah Unit" / "Transfer Stok" buttons.
- **`/settings`** — every role. Read-only profile info + change-password
  form. Refresh button hooked to `refreshCurrentUser`.

Copy any of these as your starting template for the remaining pages —
they cover the three most common shapes: dashboard with metrics, list
page with filters, and form-heavy profile view.

## Stubbed pages (still to migrate)

Every entry in NAV that isn't in the "fully migrated" list above renders
`<MigrationPendingStub>` with a pointer to the original render function.
Complete list:

| Route | Legacy fn | Approx. lines in `index.html.bak` |
|-------|-----------|-------------------|
| `/transaksi` | `renderTransaksi` | 1729–1804 |
| `/laporan` | `renderLaporan` | 1805–1868 |
| `/service` | `renderServiceOwner` | 1869–2036 |
| `/approval-repair` | `renderApprovalRepair` | 4052–4206 |
| `/karyawan` | `renderKaryawan` | 2037–2402 |
| `/cabang` | `renderCabang` | 5323–5497 |
| `/log` | `renderLog` | 2403–2455 |
| `/influencer-monitor` | `renderInfluencerMonitor` | 5970–6094 |
| `/kurir-monitoring` | `renderKurirMonitoring` | 6388–6551 |
| `/customers` | `renderCustomers` | 3567–3736 |
| `/stok-kasir` | `renderStokKasir` | 2456–2874 |
| `/input-transaksi` | `renderInputTransaksi` | 2890–3089 |
| `/tambah-unit` | `renderTambahUnit` | 3555–3566 |
| `/cod-beli` | `renderCodBeli` | 6556–6620 |
| `/approval-cod` | `renderApprovalCod` | 6541–6555 |
| `/approval-sparepart` | `renderApprovalSparepart` | 4787–4856 |
| `/sparepart` | `renderSparepart` | 4265–4338 |
| `/request-sparepart` | `renderRequestSparepart` | 4339–4786 |
| `/transfer-stok` | `renderTransferStok` | 4937–5322 |
| `/service-list` | `renderServiceTeknisi` | 3865–4009 |
| `/teknisi-log` | `renderTeknisiLog` | 4010–4051 |
| `/influencer-dashboard` | `renderInfluencerDashboard` | 5503–5608 |
| `/influencer-catalog` | `renderInfluencerCatalog` | 5609–5761 |
| `/influencer-videos` | `renderInfluencerVideos` | 5762–5854 |
| `/influencer-log` | `renderInfluencerLog` | 5855–5911 |
| `/kurir-dashboard` | `renderKurirDashboard` | 6096–6285 |
| `/kurir-log` | `renderKurirLog` | 6279–6321 |

## Known limitations / TODOs

1. **Chart.js not integrated yet.** `react-chartjs-2` is listed in
   `package.json` but no page renders a chart. `Dashboard` shows the
   trend as a table for now; the same pattern (raw data → chart) applies
   to Laporan and Monitor Kurir.
2. **ImageUploader** — the legacy `imageUploaderHTML()` + `iuOpenCamera()`
   flow (drag-drop + live camera capture) has not been ported. Settings
   page currently shows a placeholder note; the `/upload/image` endpoint
   is already exposed via `Api.upload.image(file)`.
3. **Modals inside pages** — the primitive `<Modal>` exists; per-page
   modals (Tambah Unit, Approve COD, Reset Password, etc.) have to be
   built page-by-page during migration.
4. **Cabang filter for owner** — the legacy `renderCabangFilter()`
   dropdown that fetches `GET /cabang` and caches it in `_cabangFilterCache`
   isn't reimplemented yet. Two pages that use it (`/dashboard`, `/stok`)
   currently omit the dropdown with a TODO.
5. **Type strictness** — most endpoint responses are typed via `lib/types`,
   but a few less-common endpoints (`Api.karyawan.stats`,
   `Api.requestSparepart.list`, `Api.cod.kurirMonitoring`,
   `Api.influencer.sync`) still return `unknown` and need dedicated types
   as their pages get migrated. Callers must narrow at usage.
6. **No unit tests yet.** Add tests alongside each page migration; the
   validation-only helpers in `lib/utils/*` and the `Api.*` methods are
   the easiest starting points (pure functions, no React).

## Suggested migration order for the remaining pages

Batch by shared complexity:

1. **Simple list pages** first — small, learn the pattern:
   `stok-kasir`, `teknisi-log`, `influencer-log`, `kurir-log`.
2. **List + filter pages** — mostly duplicating `/stok`'s pattern:
   `transaksi`, `laporan`, `service`, `service-list`, `customers`,
   `sparepart`, `karyawan`, `influencer-videos`, `influencer-catalog`.
3. **Approval flows** — introduce first-class modals:
   `approval-repair`, `approval-sparepart`, `approval-cod`.
4. **Form-heavy input pages** — the hardest, migrate last:
   `input-transaksi`, `tambah-unit`, `cod-beli`, `request-sparepart`,
   `transfer-stok`, `kurir-dashboard` (state-machine buttons).
5. **Owner/KC monitoring dashboards** — need chart integration:
   `dashboard` chart, `laporan` full breakdown,
   `kurir-monitoring`, `influencer-monitor`,
   `influencer-dashboard`, `kurir-dashboard`.

## Cross-check with legacy files

The original files are on disk as:

- `index.html.bak` (7184 lines)
- `main.js.bak` (448 lines)
- `svg.js.bak` (37 KB)

When migrating a stub page, always start by reading the corresponding
render function in `index.html.bak`. The stub component points at the
exact function name and approximate line range so you can jump straight
to it.
