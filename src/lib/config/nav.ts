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

import type { UserRole } from "../types";

/** Human-readable label + underlying icon key for one sidebar entry. */
export interface NavigationEntry {
  /** URL segment. `/${pageKey}` is the App Router pathname. */
  pageKey: string;
  /** Label rendered in the sidebar. */
  label: string;
  /** Icon key from `lib/icons/library.ts`. */
  iconName: string;
  /** Optional badge (e.g. NEW/BETA) — unused in current design but reserved. */
  badge?: string;
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
  { pageKey: "stok",                label: "Manajemen Stok",     iconName: "stokSvg1" },
  { pageKey: "transfer-stok",       label: "Transfer Stok",      iconName: "stokSvg2" },
  { pageKey: "transaksi",           label: "Transaksi",          iconName: "transaksiSvg" },
  { pageKey: "laporan",             label: "Laporan",            iconName: "laporanSvg" },
  { pageKey: "service",             label: "Data Service",       iconName: "settingSvg" },
  { pageKey: "approval-repair",     label: "Approval Repair",    iconName: "settingSvg" },
  { pageKey: "sparepart",           label: "Sparepart",          iconName: "stokSvg2" },
  { pageKey: "request-sparepart",   label: "Request Sparepart",  iconName: "stokSvg2" },
  { pageKey: "karyawan",            label: "Karyawan",           iconName: "karyawanSvg" },
  { pageKey: "cabang",              label: "Manajemen Cabang",   iconName: "stokSvg2" },
  { pageKey: "log",                 label: "Log Aktivitas",      iconName: "logSvg" },
  { pageKey: "influencer-monitor",  label: "Monitor Influencer", iconName: "karyawanSvg" },
  { pageKey: "kurir-monitoring",    label: "Monitor Kurir",      iconName: "dashboardSvg" },
  { pageKey: "customers",           label: "Data Customer",      iconName: "clientSvg" },
  { pageKey: "settings",            label: "Pengaturan",         iconName: "settingSvg" },
];

const kepalaCabangNavigation: NavigationEntry[] = [
  { pageKey: "dashboard",           label: "Dashboard",          iconName: "dashboardSvg" },
  { pageKey: "stok",                label: "Manajemen Stok",     iconName: "stokSvg1" },
  { pageKey: "transfer-stok",       label: "Transfer Stok",      iconName: "stokSvg2" },
  { pageKey: "transaksi",           label: "Transaksi",          iconName: "transaksiSvg" },
  { pageKey: "laporan",             label: "Laporan",            iconName: "laporanSvg" },
  { pageKey: "service",             label: "Data Service",       iconName: "settingSvg" },
  { pageKey: "approval-repair",     label: "Approval Repair",    iconName: "settingSvg" },
  { pageKey: "sparepart",           label: "Sparepart",          iconName: "stokSvg2" },
  { pageKey: "request-sparepart",   label: "Request Sparepart",  iconName: "stokSvg2" },
  { pageKey: "karyawan",            label: "Karyawan",           iconName: "karyawanSvg" },
  { pageKey: "log",                 label: "Log Aktivitas",      iconName: "logSvg" },
  { pageKey: "kurir-monitoring",    label: "Monitor Kurir",      iconName: "dashboardSvg" },
  { pageKey: "customers",           label: "Data Customer",      iconName: "clientSvg" },
  { pageKey: "settings",            label: "Pengaturan",         iconName: "settingSvg" },
];

const kasirNavigation: NavigationEntry[] = [
  { pageKey: "stok-kasir",          label: "Cek Stok",           iconName: "stokSvg2" },
  { pageKey: "input-transaksi",     label: "Input Transaksi",    iconName: "transaksiSvg2" },
  { pageKey: "tambah-unit",         label: "Tambah Unit",        iconName: "tambahSvg" },
  { pageKey: "cod-beli",            label: "COD Beli",           iconName: "moneySvg" },
  { pageKey: "approval-cod",        label: "Approval COD",       iconName: "settingSvg" },
  { pageKey: "approval-repair",     label: "Approval Repair",    iconName: "settingSvg" },
  { pageKey: "sparepart",           label: "Sparepart",          iconName: "stokSvg2" },
  { pageKey: "approval-sparepart",  label: "Approval Sparepart", iconName: "settingSvg" },
  { pageKey: "customers",           label: "Data Customer",      iconName: "clientSvg" },
  { pageKey: "settings",            label: "Pengaturan",         iconName: "settingSvg" },
];

const teknisiNavigation: NavigationEntry[] = [
  { pageKey: "service-list",        label: "Data Service",       iconName: "settingSvg" },
  { pageKey: "sparepart",           label: "Sparepart",          iconName: "stokSvg2" },
  { pageKey: "request-sparepart",   label: "Request Sparepart",  iconName: "stokSvg2" },
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
  "approval-sparepart":   { title: "Approval Sparepart" },
  "sparepart":            { title: "Manajemen Sparepart" },
  "karyawan":             { title: "Karyawan" },
  "cabang":               { title: "Manajemen Cabang" },
  "log":                  { title: "Log Aktivitas" },
  "stok-kasir":           { title: "Cek Stok" },
  "input-transaksi":      { title: "Input Transaksi" },
  "tambah-unit":          { title: "Tambah Unit" },
  "customers":            { title: "Data Customer" },
  "cod-beli":             { title: "COD Beli" },
  "service-list":         { title: "Data Service" },
  "teknisi-log":          { title: "Log Aktivitas" },
  "request-sparepart":    { title: "Request Sparepart" },
  "influencer-dashboard": { title: "Dashboard Influencer" },
  "influencer-catalog":   { title: "Katalog Produk" },
  "influencer-videos":    { title: "Video Saya" },
  "influencer-log":       { title: "Log Aktivitas" },
  "influencer-monitor":   { title: "Monitor Influencer" },
  "kurir-dashboard":      { title: "Dashboard COD" },
  "kurir-log":            { title: "Log Aktivitas Kurir" },
  "kurir-monitoring":     { title: "Monitor Kurir" },
  "settings":             { title: "Pengaturan" },
};

/** Returns true if the role has permission to visit the given pageKey. */
export function isPageAllowedForRole(role: UserRole, pageKey: string): boolean {
  const allowedEntries = navigationByRole[role] ?? [];
  return allowedEntries.some((entry) => entry.pageKey === pageKey);
}
