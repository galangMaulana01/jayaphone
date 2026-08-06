// Typed namespace of every backend endpoint the app talks to.
//
// This is the modern replacement for the untyped `API.*` object exported at
// the bottom of the legacy main.js. Endpoint paths, HTTP methods, and body
// shapes are kept identical so the backend contract does not change; the
// wins are:
//   • every payload is now shape-checked at compile time via `lib/types`;
//   • the file is grouped by resource so the surface area is discoverable
//     without grepping;
//   • the previously-missing `kurirRejectBeli` method (FBUG-007) stays fixed.

import { deleteUploadedImage, requestJson, uploadImageFile, uploadImageFiles } from "./client";
import type {
  ApiEnvelope,
  ActivityLog,
  AuthenticatedUser,
  Cabang,
  CODRequest,
  CODStatus,
  Customer,
  DashboardStats,
  DashboardTrend,
  InfluencerCatalogItem,
  InfluencerDashboardStats,
  InfluencerSyncResponse,
  InfluencerVideo,
  Karyawan,
  KaryawanStats,
  KurirListItem,
  KurirMonitoringItem,
  LoginResponse,
  Platform,
  ServiceTicket,
  Sparepart,
  RequestSparepart,
  Transaksi,
  TransferStok,
  Unit,
  OwnerInfluencerDashboard,
  UploadedImage,
} from "../types";

/** Serialize any params object to a URL query string, skipping undefined/null. */
function buildQueryString(paramsObject: object | undefined): string {
  if (!paramsObject) return "";
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(paramsObject)) {
    if (value === undefined || value === null || value === "") continue;
    searchParams.append(key, String(value));
  }
  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
}

// ─── Auth ────────────────────────────────────────────────────────────────
const auth = {
  login: (username: string, password: string) =>
    requestJson<LoginResponse>("POST", "/auth/login", { username, password }, { suppressAuthReload: true }),
  me: () => requestJson<ApiEnvelope<AuthenticatedUser>>("GET", "/auth/me"),
  updateProfile: (payload: { foto_profil_url?: string | null; name?: string }) =>
    requestJson<ApiEnvelope<AuthenticatedUser>>("PATCH", "/auth/me/profile", payload),
  changePassword: (payload: { password_lama: string; password_baru: string; password_konfirmasi: string }) =>
    requestJson<ApiEnvelope<null>>("PATCH", "/auth/me/password", payload),
};

// ─── Dashboard ───────────────────────────────────────────────────────────
interface DashboardListParams {
  cabang?: string;
  date_from?: string;
  date_to?: string;
  hari?: number;
}
const dashboard = {
  stats: (params?: DashboardListParams) =>
    requestJson<ApiEnvelope<DashboardStats>>("GET", `/dashboard/stats${buildQueryString(params)}`),
  trend: (params?: DashboardListParams) =>
    requestJson<ApiEnvelope<DashboardTrend>>("GET", `/dashboard/trend${buildQueryString(params)}`),
};

// ─── Units ───────────────────────────────────────────────────────────────
interface UnitsListParams {
  cabang?: string;
  status?: string;
  q?: string;
  limit?: number;
}
const units = {
  list: (params?: UnitsListParams) =>
    requestJson<ApiEnvelope<Unit[]>>("GET", `/units${buildQueryString(params)}`),
  create: (body: Partial<Unit> & { sparepart_items?: { sp_id: string; jumlah: number; purchase_url?: string }[] }) =>
    requestJson<ApiEnvelope<Unit>>("POST", "/units", body),
  approveRepair: (unitId: string, body: { harga_jual: number }) =>
    requestJson<ApiEnvelope<Unit>>("POST", `/units/${unitId}/approve-repair`, body),
  detail: (unitId: string) => requestJson<ApiEnvelope<Unit>>("GET", `/units/${unitId}/detail`),
};

// ─── Transaksi ───────────────────────────────────────────────────────────
interface TransaksiListParams {
  cabang?: string;
  limit?: number;
  date_from?: string;
  date_to?: string;
}
export interface TransaksiCreatePayload {
  customer_type: "member" | "guest";
  unit_id?: string;
  imei?: string;
  catatan?: string;
  garansi_hari?: number;
  biaya_garansi?: number;
  customer_nama?: string;
  customer_kontak?: string;
  poin_dipakai?: number;
  sparepart_items?: { sp_id: string; jumlah: number }[];
  foto_serah_terima?: string | null;
}
const transaksi = {
  list: (params?: TransaksiListParams) =>
    requestJson<ApiEnvelope<Transaksi[]>>("GET", `/transaksi${buildQueryString(params)}`),
  create: (body: TransaksiCreatePayload) =>
    requestJson<ApiEnvelope<Transaksi>>("POST", "/transaksi", body),
  createSparepart: (body: { items: { sp_id: string; jumlah: number }[]; catatan?: string }) =>
    requestJson<ApiEnvelope<Transaksi>>("POST", "/transaksi/sparepart", body),
  detail: (trxId: string) =>
    requestJson<ApiEnvelope<Transaksi & { margin_pct: number }>>("GET", `/transaksi/${trxId}/detail`),
};

// ─── Karyawan ────────────────────────────────────────────────────────────
const karyawan = {
  list: (params?: { cabang?: string }) =>
    requestJson<ApiEnvelope<Karyawan[]>>("GET", `/karyawan${buildQueryString(params)}`),
  create: (body: {
    nama: string;
    username: string;
    jabatan: string;
    cabang: string;
    gaji: number;
    password: string;
    foto_profil_url?: string | null;
  }) => requestJson<ApiEnvelope<Karyawan>>("POST", "/karyawan", body),
  stats: (karyawanId: string, params?: { date_from?: string; date_to?: string; hari?: number }) =>
    requestJson<ApiEnvelope<KaryawanStats>>("GET", `/karyawan/${karyawanId}/stats${buildQueryString(params)}`),
  resetPassword: (karyawanId: string, body: { password: string }) =>
    requestJson<ApiEnvelope<{ nama: string; username: string }>>("PATCH", `/karyawan/${karyawanId}/password`, body),
};

// ─── Activity Log ────────────────────────────────────────────────────────
interface LogListParams {
  cabang?: string;
  limit?: number;
  date_from?: string;
  date_to?: string;
  role_filter?: string;
}
const log = {
  list: (params?: LogListParams) =>
    requestJson<ApiEnvelope<ActivityLog[]>>("GET", `/log${buildQueryString(params)}`),
};

// ─── Service ─────────────────────────────────────────────────────────────
interface ServiceListParams {
  cabang?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}
export interface ServiceUpdatePayload {
  status?: string;
  catatan_kerusakan?: string;
  teknisi?: string;
  estimasi_selesai?: string;
  foto_before_urls?: string[];
  foto_after_urls?: string[];
  link_shopee?: string;
}
const service = {
  list: (params?: ServiceListParams) =>
    requestJson<ApiEnvelope<ServiceTicket[]>>("GET", `/service${buildQueryString(params)}`),
  get: (serviceId: string) =>
    requestJson<ApiEnvelope<ServiceTicket>>("GET", `/service/${serviceId}`),
  update: (serviceId: string, body: ServiceUpdatePayload) =>
    requestJson<ApiEnvelope<ServiceTicket>>("PUT", `/service/${serviceId}`, body),
  pendingApproval: (params?: { cabang?: string; limit?: number }) =>
    requestJson<ApiEnvelope<ServiceTicket[]>>("GET", `/service/pending-approval${buildQueryString(params)}`),
  detail: (serviceId: string) =>
    requestJson<ApiEnvelope<ServiceTicket & { timeline: { event: string; waktu: string }[] }>>(
      "GET",
      `/service/${serviceId}/detail`,
    ),
};

// ─── Customer ────────────────────────────────────────────────────────────
const customer = {
  list: (params?: { status?: string; q?: string }) =>
    requestJson<ApiEnvelope<Customer[]>>("GET", `/customers${buildQueryString(params)}`),
  create: (body: { nama: string; kontak: string; cabang: string }) =>
    requestJson<ApiEnvelope<Customer>>("POST", "/customers", body),
  approve: (customerId: string) =>
    requestJson<ApiEnvelope<Customer>>("PATCH", `/customers/${customerId}/approve`, { action: "approve" }),
  reject: (customerId: string, reason: string) =>
    requestJson<ApiEnvelope<Customer>>("PATCH", `/customers/${customerId}/reject`, { action: "reject", reason }),
  resubmit: (customerId: string) =>
    requestJson<ApiEnvelope<Customer>>("PATCH", `/customers/${customerId}/resubmit`, {}),
  pendingCount: () => requestJson<ApiEnvelope<{ count: number }>>("GET", "/customers/pending-count"),
};

// ─── Sparepart ───────────────────────────────────────────────────────────
const sparepart = {
  list: (params?: { cabang?: string; kategori?: string }) =>
    requestJson<ApiEnvelope<Sparepart[]>>("GET", `/sparepart${buildQueryString(params)}`),
  create: (body: Partial<Sparepart> & { nama: string; harga_jual: number; harga_beli: number; stok: number }) =>
    requestJson<ApiEnvelope<Sparepart>>("POST", "/sparepart", body),
  updateStok: (sparepartId: string, body: { delta: number; catatan?: string }) =>
    requestJson<ApiEnvelope<Sparepart>>("PATCH", `/sparepart/${sparepartId}/stok`, body),
};

// ─── Cabang ──────────────────────────────────────────────────────────────
const cabang = {
  list: () => requestJson<ApiEnvelope<Cabang[]>>("GET", "/cabang"),
  create: (body: { nama: string; kode: string; alamat?: string; telp?: string }) =>
    requestJson<ApiEnvelope<Cabang>>("POST", "/cabang", body),
  update: (kode: string, body: Partial<Cabang>) =>
    requestJson<ApiEnvelope<Cabang>>("PATCH", `/cabang/${kode}`, body),
  assignKepala: (
    kode: string,
    body: { username: string; nama: string; password: string; foto_profil_url?: string | null },
  ) => requestJson<ApiEnvelope<Karyawan>>("POST", `/cabang/${kode}/kepala`, body),
  pecatKaryawan: (karyawanId: string) =>
    requestJson<ApiEnvelope<null>>("DELETE", `/cabang/karyawan/${karyawanId}`),
};

// ─── Request Sparepart ───────────────────────────────────────────────────
const requestSparepart = {
  list: (params?: { status?: string }) =>
    requestJson<ApiEnvelope<RequestSparepart[]>>("GET", `/request-sparepart${buildQueryString(params)}`),
  create: (body: {
    tipe: string;
    service_id?: string;
    sp_id?: string;
    nama_sp: string;
    jumlah: number;
    keterangan?: string;
    cabang: string;
    product_link?: string;
  }) => requestJson<ApiEnvelope<RequestSparepart>>("POST", "/request-sparepart", body),
  respond: (reqId: string, body: { status: string; estimasi_tiba?: string; catatan?: string }) =>
    requestJson<ApiEnvelope<RequestSparepart>>("PATCH", `/request-sparepart/${reqId}/respond`, body),
  approve: (reqId: string, body: { harga_jual: number; status: string; catatan?: string }) =>
    requestJson<ApiEnvelope<RequestSparepart>>("PATCH", `/request-sparepart/${reqId}/approve`, body),
};

// ─── Transfer Stok ───────────────────────────────────────────────────────
const transferStok = {
  list: (params?: { status?: string; limit?: number }) =>
    requestJson<ApiEnvelope<TransferStok[]>>("GET", `/transfer-stok${buildQueryString(params)}`),
  create: (body: { cabang_tujuan: string; unit_ids: { unit_id: string }[]; catatan?: string }) =>
    requestJson<ApiEnvelope<TransferStok>>("POST", "/transfer-stok", body),
  respond: (transferId: string, body: { status: string; catatan?: string }) =>
    requestJson<ApiEnvelope<TransferStok>>("PATCH", `/transfer-stok/${transferId}`, body),
  notifCount: () =>
    requestJson<ApiEnvelope<{ count: number }>>("GET", "/transfer-stok/notif/count"),
  notifPending: () =>
    requestJson<ApiEnvelope<TransferStok[]>>("GET", "/transfer-stok/notif/pending"),
  cabangList: () =>
    requestJson<ApiEnvelope<{ kode: string; nama: string }[]>>("GET", "/transfer-stok/cabang-list"),
};

// ─── COD ─────────────────────────────────────────────────────────────────
export interface CODCreatePayload {
  type: "beli" | "jual" | "delivery";
  location?: string;
  wa_number?: string;
  screenshot_url?: string;
  note?: string;
  kurir_id?: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  product_name?: string;
  offer_price?: number;
  product_link?: string;
  trx_id?: string;
  delivery_address?: string;
  wa_customer?: string;
  items?: { sp_id: string; jumlah: number; nama?: string }[];
}
const cod = {
  create: (body: CODCreatePayload) =>
    requestJson<ApiEnvelope<CODRequest>>("POST", "/cod", body),
  list: (params?: { status?: string; type?: string; date_from?: string; date_to?: string; limit?: number }) =>
    requestJson<ApiEnvelope<CODRequest[]>>("GET", `/cod${buildQueryString(params)}`),
  detail: (codId: string) =>
    requestJson<ApiEnvelope<CODRequest>>("GET", `/cod/${codId}`),
  kurirDashboard: (params?: { status?: string; type?: string }) =>
    requestJson<ApiEnvelope<CODRequest[]>>("GET", `/cod/kurir/dashboard${buildQueryString(params)}`),
  kurirList: (params?: Record<string, string>) =>
    requestJson<ApiEnvelope<KurirListItem[]>>("GET", `/cod/kurir-list${buildQueryString(params)}`),
  kurirAccept: (codId: string) =>
    requestJson<ApiEnvelope<CODRequest>>("POST", `/cod/kurir/${codId}/accept`),
  kurirReject: (codId: string) =>
    requestJson<ApiEnvelope<CODRequest>>("POST", `/cod/kurir/${codId}/reject`),
  /** Dedicated reject-beli endpoint — FBUG-007 fixed the missing binding here. */
  kurirRejectBeli: (codId: string, reason: string) =>
    requestJson<ApiEnvelope<CODRequest>>("POST", `/cod/kurir/${codId}/reject-beli`, { reason }),
  kurirUpdateStatus: (codId: string, status: CODStatus, note?: string) =>
    requestJson<ApiEnvelope<CODRequest>>("POST", `/cod/kurir/${codId}/status`, { status, note }),
  kurirInputStok: (body: Partial<Unit> & { imei: string; merk: string; tipe: string }) =>
    requestJson<ApiEnvelope<{ unit_id: string }>>("POST", "/cod/kurir/input-stok", body),
  kurirSubmitBeli: (codId: string, body: { deal_price: number; unit_data: Partial<Unit> }) =>
    requestJson<ApiEnvelope<CODRequest>>("POST", `/cod/kurir/${codId}/submit-beli`, body),
  approve: (codId: string, body: { harga_jual: number; unit_data: Partial<Unit>; garansi_toko?: number; catatan?: string }) =>
    requestJson<ApiEnvelope<CODRequest>>("POST", `/cod/${codId}/approve`, body),
  reject: (codId: string, reason: string) =>
    requestJson<ApiEnvelope<CODRequest>>("POST", `/cod/${codId}/reject`, { reason }),
  kurirLog: (params?: { date_from?: string; date_to?: string; action?: string; limit?: number }) =>
    requestJson<ApiEnvelope<ActivityLog[]>>("GET", `/cod/kurir/log${buildQueryString(params)}`),
  kurirMonitoring: (params?: { cabang?: string; date_from?: string; date_to?: string }) =>
    requestJson<ApiEnvelope<KurirMonitoringItem[]>>("GET", `/cod/kurir/monitoring${buildQueryString(params)}`),
};

// ─── Influencer ──────────────────────────────────────────────────────────
const influencer = {
  dashboard: (hari?: number, platform?: Platform) =>
    requestJson<ApiEnvelope<InfluencerDashboardStats>>(
      "GET",
      `/influencer/dashboard/stats${buildQueryString({ hari: hari ?? 90, platform })}`,
    ),
  catalog: (params?: { kategori?: string; q?: string }) =>
    requestJson<ApiEnvelope<InfluencerCatalogItem[]>>("GET", `/influencer/catalog${buildQueryString(params)}`),
  createVideo: (body: { unit_id?: string | null; platform: Platform; url: string; product_id?: string }) =>
    requestJson<ApiEnvelope<InfluencerVideo>>("POST", "/influencer/videos", body),
  listVideos: (params?: { platform?: Platform; date_from?: string; date_to?: string; limit?: number }) =>
    requestJson<ApiEnvelope<InfluencerVideo[]>>("GET", `/influencer/videos${buildQueryString(params)}`),
  listLog: (params?: { date_from?: string; date_to?: string; platform?: Platform }) =>
    requestJson<ApiEnvelope<ActivityLog[]>>("GET", `/influencer/log${buildQueryString(params)}`),
  sync: () => requestJson<ApiEnvelope<InfluencerSyncResponse>>("POST", "/influencer/sync"),
};

const ownerInfluencer = {
  dashboard: () => requestJson<ApiEnvelope<OwnerInfluencerDashboard>>("GET", "/influencer/owner/dashboard"),
  listVideos: (params?: { cabang?: string; influencer_id?: string; platform?: Platform; date_from?: string; date_to?: string; limit?: number }) =>
    requestJson<ApiEnvelope<InfluencerVideo[]>>("GET", `/influencer/owner/videos${buildQueryString(params)}`),
  listInfluencers: () =>
    requestJson<ApiEnvelope<{ influencer_id: string; name: string; cabang: string }[]>>(
      "GET",
      "/influencer/owner/influencers",
    ),
};

// ─── Upload ──────────────────────────────────────────────────────────────
const upload = {
  image: (file: File) => uploadImageFile("/upload/image", file) as Promise<UploadedImage>,
  images: (
    files: File[],
    uploadType?: string,
    extras?: { folder?: string; tags?: string; contextKey?: string; contextValue?: string },
  ) => uploadImageFiles("/upload/images", files, uploadType, extras) as Promise<{ uploaded: UploadedImage[]; errors: unknown[] }>,
  delete: (publicId: string) => deleteUploadedImage(publicId),
};

/**
 * Single object exported to consumer code — mirrors the shape of the legacy
 * `window.API` namespace so migration in a page's render function is mostly
 * a matter of `API.units.list(...)` → `Api.units.list(...)`.
 */
export const Api = {
  auth,
  dashboard,
  units,
  transaksi,
  karyawan,
  log,
  service,
  customer,
  sparepart,
  cabang,
  requestSparepart,
  transferStok,
  cod,
  influencer,
  ownerInfluencer,
  upload,
};

export { ApiError } from "./client";
export type { UserRole, AuthenticatedUser } from "../types";
