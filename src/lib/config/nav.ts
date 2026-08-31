// Sidebar navigation configuration, driven by role.
//
// Mirrors the NAV / PAGE_META / VIEWS objects from the legacy index.html.bak
// (approx. lines 804–966). Every page's URL path is derived from its `pageKey`
// — this frontend uses Next.js App Router segments, so a `pageKey` of
// "kurir-dashboard" maps directly to `/kurir-dashboard`.
//
// The role → allowed-pages relationship remains authoritative for both:
//   • which menu entries the sidebar shows (SidebarNavigation reads NAV[role]);
//   • whether `navigate()` (now the App Router's Link/push) is allowed to
//     enter a given route (checked in the (app) layout guard).
// Cross-referenced against every backend route guard while writing the fix
// for FBUG-021.
//
// Sidebar dropdown groups (added for the "global sidebar dropdown" IA pass):
// an entry can now optionally carry `children`, rendered as a two-level
// expand/collapse group on desktop. Two distinct shapes exist:
//   • a REAL page with tabs (e.g. Sparepart, Data Service, Laporan, Customer)
//     keeps its own `pageKey` and `href`; children are shortcuts into that
//     same page with a `?tab=`/`?status=`/`?filter=`/`?sort=` query string —
//     no new routes, no duplicated data-fetching.
//   • a PURE GROUP with no page of its own (e.g. "Stok", "COD" for kasir)
//     omits `pageKey`; its children are separate real pages/routes.
// isPageAllowedForRole() checks both the entry's own pageKey and every
// child's href pathname, so a route reachable only via a pure-group's
// children is still permission-checkable by pageKey elsewhere in the app.

import type { UserRole } from "../types";

/** One shortcut inside a sidebar dropdown group — links into an existing page/tab or a standalone route. */
export interface NavigationChild {
  /** Stable key for this child (used as the React list key + active-state match). */
  key: string;
  /** Label rendered under the parent group. */
  label: string;
  /** Full href, e.g. "/sparepart?tab=tersedia" or "/cod-jual". */
  href: string;
}

/** Human-readable label + underlying icon key for one sidebar entry (or dropdown group). */
export interface NavigationEntry {
  /**
   * URL segment. `/${pageKey}` is the App Router pathname.
   * Omitted for a "pure group" parent that has no page of its own — its
   * children are the only navigable routes (e.g. kasir's "COD" group).
   */
  pageKey?: string;
  /** Label rendered in the sidebar. */
  label: string;
  /** Icon key from `lib/icons/library.ts`. */
  iconName: string;
  /** Optional badge (e.g. NEW/BETA) — unused in current design but reserved. */
  badge?: string;
  /** Dropdown children — when present, this entry renders as an expand/collapse group on desktop. */
  children?: NavigationChild[];
}

/** Human-readable page title shown in the top header. */
export interface PageMetadata {
  title: string;
}

// ─── Per-role sidebar arrays ─────────────────────────────────────────────
// The order here is the exact order the sidebar renders. Preserve unless
// the product team decides otherwise.

const ownerNavigation: NavigationEntry[] = [
  { pageKey: "dashboard",           label: "Dashboard",          iconName: "dashboardSvg" },
  {
    label: "Stok", iconName: "stokSvg1",
    children: [
      { key: "stok-manajemen", label: "Manajemen Stok", href: "/stok" },
      { key: "stok-transfer", label: "Transfer Stok", href: "/transfer-stok" },
    ],
  },
  { pageKey: "transaksi",           label: "Transaksi",          iconName: "transaksiSvg" },
  { pageKey: "laporan", label: "Laporan", iconName: "laporanSvg" },
  { pageKey: "service", label: "Data Service", iconName: "settingSvg" },
  { pageKey: "sparepart", label: "Stok Sparepart", iconName: "stokSvg2" },
  { pageKey: "karyawan",            label: "Karyawan",           iconName: "karyawanSvg" },
  { pageKey: "cabang",              label: "Manajemen Cabang",   iconName: "stokSvg2" },
  { pageKey: "log",                 label: "Log Aktivitas",      iconName: "logSvg" },
  {
    // Pure group: owner is the only role with two monitor-type destinations
    // (Kurir + Influencer) — kepala_cabang only has Monitor Kurir, so that
    // role keeps it as a flat item instead of a one-child group (see below).
    label: "Monitor", iconName: "dashboardSvg",
    children: [
      { key: "monitor-service", label: "Monitor Service", href: "/monitor-service" },
      { key: "monitor-influencer", label: "Monitor Influencer", href: "/influencer-monitor" },
      { key: "monitor-kurir",      label: "Monitor Kurir",      href: "/kurir-monitoring" },
    ],
  },
  { pageKey: "customers", label: "Data Customer", iconName: "clientSvg" },
  { pageKey: "settings",            label: "Pengaturan",         iconName: "settingSvg" },
];

const kepalaCabangNavigation: NavigationEntry[] = [
  { pageKey: "dashboard",           label: "Dashboard",          iconName: "dashboardSvg" },
  {
    label: "Stok", iconName: "stokSvg1",
    children: [
      { key: "stok-manajemen", label: "Manajemen Stok", href: "/stok" },
      { key: "stok-transfer", label: "Transfer Stok", href: "/transfer-stok" },
    ],
  },
  { pageKey: "transaksi",           label: "Transaksi",          iconName: "transaksiSvg" },
  { pageKey: "laporan", label: "Laporan", iconName: "laporanSvg" },
  { pageKey: "service", label: "Data Service", iconName: "settingSvg" },
  { pageKey: "sparepart", label: "Stok Sparepart", iconName: "stokSvg2" },
  { pageKey: "karyawan",            label: "Karyawan",           iconName: "karyawanSvg" },
  { pageKey: "log",                 label: "Log Aktivitas",      iconName: "logSvg" },
  { pageKey: "kurir-monitoring",    label: "Monitor Kurir",      iconName: "dashboardSvg" },
  { pageKey: "customers", label: "Data Customer", iconName: "clientSvg" },
  { pageKey: "settings",            label: "Pengaturan",         iconName: "settingSvg" },
];

const kasirNavigation: NavigationEntry[] = [
  { pageKey: "stok-kasir",          label: "Cek Stok",           iconName: "stokSvg2" },
  { pageKey: "input-transaksi",     label: "Input Transaksi",    iconName: "transaksiSvg2" },
  { pageKey: "tambah-unit",         label: "Tambah Unit",        iconName: "tambahSvg" },
  {
    label: "COD", iconName: "moneySvg",
    children: [
      { key: "cod-beli",     label: "COD Beli",     href: "/cod-beli" },
      { key: "cod-monitoring", label: "Monitoring COD", href: "/cod-monitoring" },
      { key: "cod-jual",     label: "COD Jual",     href: "/cod-jual" },
      { key: "cod-delivery", label: "Delivery",     href: "/cod-delivery" },
    ],
  },
  {
    // Pure group: both children are still genuinely standalone approval
    // queues for kasir (no domain page to fold either into — kasir has no
    // "Data Service" nav item at all, unlike owner/kc where repair-approval
    // already lives as a Data Service tab). Grouping here is purely to stop
    // "Approval X" / "Approval Y" from reading as two unrelated root items
    // when they're the same mental job (approve pending items).
    label: "Approval", iconName: "settingSvg",
    children: [
      { key: "approval-cod",    label: "Approval COD",    href: "/approval-cod" },
      { key: "approval-repair", label: "Approval Repair", href: "/approval-repair" },
    ],
  },
  {
    pageKey: "sparepart", label: "Sparepart", iconName: "stokSvg2",
    children: [
      { key: "sparepart-tersedia",  label: "Tersedia",       href: "/sparepart?tab=tersedia" },
      { key: "sparepart-dipakai",   label: "Sedang Dipakai", href: "/sparepart?tab=sedang_dipakai" },
      { key: "sparepart-dijual",    label: "Untuk Dijual",   href: "/sparepart?tab=untuk_dijual" },
      { key: "sparepart-riwayat",   label: "Riwayat",        href: "/sparepart?tab=riwayat" },
    ],
  },
  { pageKey: "customers", label: "Data Customer", iconName: "clientSvg" },
  { pageKey: "settings",            label: "Pengaturan",         iconName: "settingSvg" },
];

const teknisiNavigation: NavigationEntry[] = [
  { pageKey: "service-list",        label: "Data Service",       iconName: "settingSvg" },
  {
    pageKey: "sparepart", label: "Sparepart", iconName: "stokSvg2",
    children: [
      { key: "sparepart-tersedia",  label: "Tersedia",       href: "/sparepart?tab=tersedia" },
      { key: "sparepart-dipakai",   label: "Sedang Dipakai", href: "/sparepart?tab=sedang_dipakai" },
      { key: "sparepart-dijual",    label: "Untuk Dijual",   href: "/sparepart?tab=untuk_dijual" },
      { key: "sparepart-riwayat",   label: "Riwayat",        href: "/sparepart?tab=riwayat" },
    ],
  },
  { pageKey: "teknisi-log",         label: "Log Aktivitas",      iconName: "logSvg" },
  { pageKey: "settings",            label: "Pengaturan",         iconName: "settingSvg" },
];

const influencerNavigation: NavigationEntry[] = [
  { pageKey: "influencer-dashboard", label: "Dashboard",         iconName: "dashboardSvg" },
  { pageKey: "influencer-catalog",   label: "Katalog Produk",    iconName: "stokSvg1" },
  { pageKey: "influencer-videos",    label: "Video Saya",        iconName: "transaksiSvg" },
  { pageKey: "influencer-log",       label: "Log Aktivitas",     iconName: "logSvg" },
  { pageKey: "settings",             label: "Pengaturan",        iconName: "settingSvg" },
];

const kurirNavigation: NavigationEntry[] = [
  { pageKey: "kurir-dashboard",     label: "Dashboard COD",      iconName: "dashboardSvg" },
  { pageKey: "kurir-history",       label: "Riwayat COD",        iconName: "transaksiSvg" },
  { pageKey: "kurir-log",           label: "Log Aktivitas",      iconName: "logSvg" },
  { pageKey: "settings",            label: "Pengaturan",         iconName: "settingSvg" },
];

export const navigationByRole: Record<UserRole, NavigationEntry[]> = {
  owner: ownerNavigation,
  kepala_cabang: kepalaCabangNavigation,
  kasir: kasirNavigation,
  teknisi: teknisiNavigation,
  kurir: kurirNavigation,
  influencer: influencerNavigation,
};

/** Which page each role lands on after a fresh login. */
export const landingPageByRole: Record<UserRole, string> = {
  owner: "dashboard",
  kepala_cabang: "dashboard",
  kasir: "stok-kasir",
  teknisi: "service-list",
  kurir: "kurir-dashboard",
  influencer: "influencer-dashboard",
};

/** Human-readable page titles for every known pageKey (used by the header). */
export const pageMetadataByKey: Record<string, PageMetadata> = {
  "dashboard":            { title: "Dashboard" },
  "stok":                 { title: "Manajemen Stok" },
  "transfer-stok":        { title: "Transfer Stok Antar Cabang" },
  "transaksi":            { title: "Transaksi" },
  "laporan":              { title: "Laporan Keuangan" },
  "service":              { title: "Data Service" },
  "approval-repair":      { title: "Approval Repair" },
  "approval-cod":         { title: "Approval COD Beli" },
  "sparepart":            { title: "Manajemen Sparepart" },
  "karyawan":             { title: "Karyawan" },
  "cabang":               { title: "Manajemen Cabang" },
  "log":                  { title: "Log Aktivitas" },
  "stok-kasir":           { title: "Cek Stok" },
  "input-transaksi":      { title: "Input Transaksi" },
  "tambah-unit":          { title: "Tambah Unit" },
  "customers":            { title: "Data Customer" },
  "cod-beli":             { title: "COD Beli" },
  "cod-monitoring":       { title: "Monitoring COD" },
  "cod-jual":             { title: "COD Jual" },
  "cod-delivery":         { title: "Delivery" },
  "service-list":         { title: "Data Service" },
  "teknisi-log":          { title: "Log Aktivitas" },
  "influencer-dashboard": { title: "Dashboard Influencer" },
  "influencer-catalog":   { title: "Katalog Produk" },
  "influencer-videos":    { title: "Video Saya" },
  "influencer-log":       { title: "Log Aktivitas" },
  "influencer-monitor":   { title: "Monitor Influencer" },
  "monitor-service":      { title: "Monitor Service" },
  "kurir-dashboard":      { title: "Dashboard COD" },
  "kurir-history":        { title: "Riwayat COD" },
  "kurir-log":            { title: "Log Aktivitas Kurir" },
  "kurir-monitoring":     { title: "Monitor Kurir" },
  "settings":             { title: "Pengaturan" },
};

/** Strips the query string off a child href, e.g. "/sparepart?tab=x" -> "sparepart". */
function pageKeyFromHref(href: string): string {
  const pathname = href.split("?")[0] ?? href;
  return pathname.replace(/^\//, "");
}

/** Returns true if the role has permission to visit the given pageKey. */
export function isPageAllowedForRole(role: UserRole, pageKey: string): boolean {
  const allowedEntries = navigationByRole[role] ?? [];
  return allowedEntries.some((entry) => {
    if (entry.pageKey === pageKey) return true;
    return (entry.children ?? []).some((child) => pageKeyFromHref(child.href) === pageKey);
  });
}
