// Shared TypeScript types used across the frontend.
//
// Every shape here mirrors a documented backend contract from the phonejaya
// FastAPI service (see /workspace/phonejaya/app/schemas/*.py). If the backend
// changes a field, this file is the single place that needs updating on the
// frontend — every API caller reads through the typed `Api` object in
// `lib/api/index.ts`, which reads through these types.

/** The six roles enforced by the backend's middleware guards. */
export type UserRole =
  | "owner"
  | "kepala_cabang"
  | "kasir"
  | "teknisi"
  | "kurir"
  | "influencer";

/** JWT payload subset actually used by the frontend. */
export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  cabang: string;
  foto_profil_url?: string | null;
}

/** Envelope every successful API response is wrapped in by the backend. */
export interface ApiEnvelope<TData> {
  success: true;
  message?: string;
  data: TData;
}

/** Envelope returned by list endpoints that support `skip`/`limit` paging —
 * `total` is the full match count so the UI can tell whether more pages exist. */
export interface PaginatedApiEnvelope<TData> extends ApiEnvelope<TData> {
  total: number;
  skip: number;
  limit: number;
}

/** Login response payload — matches `TokenResponse` on the backend. */
export interface LoginResponse {
  access_token: string;
  user: AuthenticatedUser;
}

// ─── Dashboard ───────────────────────────────────────────────────────────
export interface DashboardStats {
  unit: {
    total: number;
    tersedia: number;
    /** Legacy API field; the current backend returns sold. */
    terjual?: number;
    sold?: number;
    service: number;
  };
  keuangan: {
    /** Legacy API field; the current backend returns total_revenue. */
    total_omzet?: number;
    total_revenue?: number;
    total_profit: number;
    /** Legacy API field; the current backend returns profit_harian. */
    profit_hari_ini?: number;
    profit_harian?: number;
    total_transaksi: number;
    total_poin_dipakai?: number;
    total_poin_dapat?: number;
    biaya_poin_dipakai?: number;
  };
  recent_transaksi?: TransaksiSummary[];
}

export interface DashboardTrendPoint {
  tanggal: string;
  omzet: number;
  profit: number;
  jumlah: number;
}
export interface DashboardTrend {
  /** Legacy object-array format. */
  trend?: DashboardTrendPoint[];
  /** Current backend parallel-array format. */
  labels?: string[];
  revenue?: number[];
  profit?: number[];
  jumlah?: number[];
  hari?: number;
  periode?: { dari: string; sampai: string; hari: number };
}

// ─── Unit / Inventory ────────────────────────────────────────────────────
export type UnitStatus = "Tersedia" | "Sold" | "Booking" | "Service" | "Dalam Transfer" | "Ditolak";
export type UnitKondisi = "Mulus" | "Repair";
export interface Unit {
  id: string;
  unit_id: string;
  merk: string;
  tipe: string;
  storage: string;
  ram: string;
  warna: string;
  kelengkapan?: string;
  imei: string;
  imei2?: string;
  tipe_sim: string;
  keamanan: string;
  speaker: string;
  lcd: string;
  harga_modal?: number;
  harga_jual: number;
  kategori: string;
  kondisi: string;
  kondisi_hp: UnitKondisi;
  battery: number;
  battery_health: number;
  status: UnitStatus;
  cabang: string;
  catatan?: string;
  keluhan?: string;
  garansi_toko: number;
  foto_url?: string | null;
  created_at?: string;
  /** Pre-formatted "masuk stok" date string from the backend (`fmt_waktu(created_at)`) — used for the stock-aging indicator. */
  tgl_masuk?: string;
  tgl_terjual?: string | null;
}

// ─── Transaksi ───────────────────────────────────────────────────────────
export type TransaksiTipe = "unit" | "sparepart" | "gabungan";
export type CustomerTipe = "member" | "guest";
export interface SparepartItemInTransaksi {
  sp_id: string;
  nama: string;
  jumlah: number;
  harga: number;
}
export interface Transaksi {
  id: string;
  trx_id: string;
  tipe: TransaksiTipe;
  unit_id?: string | null;
  unit_label: string;
  kasir: string;
  harga_jual: number;
  harga_modal: number;
  profit: number;
  waktu: string;
  catatan?: string;
  garansi_hari: number;
  biaya_garansi: number;
  poin_dipakai: number;
  poin_dapat: number;
  cabang: string;
  customer_type: CustomerTipe;
  customer_nama?: string;
  customer_kontak?: string;
  sp_items?: SparepartItemInTransaksi[] | null;
  foto_serah_terima?: string | null;
}
/** Slim variant used in the dashboard's recent-transactions list. */
export type TransaksiSummary = Pick<Transaksi, "trx_id" | "unit_label" | "harga_jual" | "waktu" | "kasir" | "cabang">;

// ─── Service ─────────────────────────────────────────────────────────────
export type ServiceStatus = "Antrian" | "Proses" | "Menunggu_Sparepart" | "Selesai" | "Approved" | "Ditolak";
export interface ServiceTicket {
  id: string;
  service_id: string;
  unit_id: string;
  unit_label: string;
  nama_customer: string;
  kontak_customer: string;
  keluhan: string;
  catatan_kerusakan?: string;
  status: ServiceStatus;
  teknisi?: string;
  foto_urls?: string[];
  foto_before_urls?: string[];
  foto_after_urls?: string[];
  cabang: string;
  estimasi_selesai?: string | null;
  created_at: string;
  updated_at?: string;
  sparepart_items?: { sp_id: string; nama: string; jumlah: number; harga_modal: number; mulai_pakai?: string }[];
  /** Joined in at the route layer for GET /service (list) — for the "HP/IMEI" table column. */
  imei?: string;
  /** Joined in at the route layer from the underlying unit — for the "Foto" column. */
  unit_foto_url?: string | null;
}

/** Extra unit fields joined into GET /service/{id}/detail only (not on the
 * base ServiceTicket / list response) — for the read-only "Pilih HP" screen. */
export interface ServiceTicketDetail extends ServiceTicket {
  warna: string;
  kondisi: string;
  kelengkapan: string;
  imei: string;
  timeline: { event: string; waktu: string }[];
}

/** One row of GET /service/riwayat — ticket-centric completed-service
 * history, no time window (unlike Sparepart's "Riwayat Pemakaian"). */
export interface ServiceRiwayatItem {
  service_id: string;
  unit_label: string;
  imei: string;
  sparepart_items: { sp_id: string; nama: string; jumlah: number; harga_modal: number }[];
  harga_modal_total: number;
  selesai_at?: string | null;
  status: string;
}

// ─── Customer ────────────────────────────────────────────────────────────
export type CustomerStatus = "Pending" | "Verified" | "Rejected";
export interface Customer {
  id: string;
  nama: string;
  kontak: string;
  cabang: string;
  status: CustomerStatus;
  points: number;
  created_at?: string;
  rejected_at?: string | null;
  rejected_by?: string | null;
  rejected_reason?: string | null;
}

// ─── Sparepart ───────────────────────────────────────────────────────────
export type SparepartJenis = "repair" | "dijual" | "equipment";
export interface Sparepart {
  id: string;
  sp_id: string;
  nama: string;
  kategori: string;
  jenis: SparepartJenis;
  satuan: string;
  stok: number;
  /** Total sedang dipakai teknisi di tiket-tiket aktif — terpisah dari `stok`
   * (yang cuma sisa bebas). Bermakna untuk jenis "repair"; selalu 0 untuk
   * "dijual"/"equipment" karena keduanya tidak direservasi ke tiket. */
  dipakai: number;
  harga_beli: number;
  harga_jual: number;
  dimensi_str?: string;
  cabang: string;
  catatan?: string;
  product_link?: string;
}

/** One "Sedang Dipakai" row — a sparepart_items entry from an open (Proses) service ticket. */
export interface SparepartInUseItem {
  sp_id: string;
  nama: string;
  kategori: string;
  harga_modal: number;
  jumlah: number;
  service_id: string;
  unit_label: string;
  imei: string;
  teknisi: string;
  mulai_pakai?: string | null;
  /** Terisi cuma untuk baris "Riwayat Pemakaian" (dari GET
   * /sparepart/riwayat-pemakaian) — kosong untuk "Sedang Dipakai". */
  selesai_pakai?: string | null;
  cabang: string;
}

// ─── Notifikasi sparepart untuk teknisi ────────────────────────────────
export interface RequestSparepartNotifItem {
  req_id: string;
  nama_sp: string;
  jumlah: number;
  service_id?: string | null;
  unit_label?: string | null;
  status: string;
  /** Alasan KC — hanya terisi kalau status Ditolak. */
  catatan_kc?: string | null;
  /** When the sparepart actually became ready — the real event time, not when the bell first polled it. */
  diterima_at?: string | null;
  /** Real event time buat status Ditolak juga (diterima_at kosong di situ). */
  event_at?: string | null;
}

// ─── Cabang ──────────────────────────────────────────────────────────────
export interface Cabang {
  kode: string;
  nama: string;
  alamat?: string;
  telp?: string;
  aktif: boolean;
  /** IANA timezone of this branch (e.g. "Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"). */
  timezone?: string;
  kepala_username?: string;
}

/** kode->timezone lookup entry, from GET /cabang/timezones (open to every role). */
export interface CabangTimezoneEntry {
  kode: string;
  timezone: string;
}

// ─── Karyawan ────────────────────────────────────────────────────────────
export interface Karyawan {
  id: string;
  nama: string;
  username: string;
  jabatan: string;
  cabang: string;
  gaji: number;
  aktif: boolean;
  bergabung: string;
  foto_profil_url?: string | null;
}

// ─── Employee statistics ───────────────────────────────────────────────
export interface KaryawanStatsPeriod { dari: string; sampai: string; }
export interface KasirKaryawanStats {
  jumlah_transaksi: number;
  rata_per_hari: number;
  total_omzet: number;
  total_profit: number;
  trend_harian: Array<{ tanggal: string; omzet: number; jumlah_transaksi?: number }>;
}
export interface TeknisiKaryawanStats {
  total_service: number;
  jumlah_selesai: number;
  rata_selesai_per_hari: number;
  status_breakdown: Record<string, number>;
  trend_harian: Array<{ tanggal: string; selesai: number; total?: number }>;
}
export interface KaryawanStats {
  periode: KaryawanStatsPeriod;
  kasir: KasirKaryawanStats;
  teknisi: TeknisiKaryawanStats;
}

// ─── Sparepart requests ────────────────────────────────────────────────
// Alur (diagram "WORKFLOW SERVICE & REQUEST SPAREPART"):
// Pending -> [KC approve harga, terkunci di harga_disetujui] -> Menunggu_Pembelian
// -> [Kasir catat pembelian] -> Menunggu_Barang (atau langsung Diterima kalau barang_di_tangan)
// -> [Kasir konfirmasi barang sampai] -> Diterima (ditahan buat tiket ini, badge FE
//    "Sparepart Tersedia") -> [Teknisi konfirmasi "Gunakan Sparepart"] -> Digunakan
// Ditolak bisa terjadi di titik KC review.
export type RequestSparepartStatus =
  | "Pending" | "Disetujui" | "Menunggu_Pembelian" | "Dibeli"
  | "Menunggu_Barang" | "Diterima" | "Digunakan" | "Ditolak" | string;
export type RequestSparepartJenis = "repair" | "equipment";
export interface RequestSparepart {
  id: string;
  /** The human-readable business ID (e.g. "JYP-REQ-002") — every PATCH
   * /request-sparepart/{req_id}/... route matches on THIS field, not `id`
   * (the Mongo _id). Always use req_id, not id, when calling respond()/beli()/terima(). */
  req_id: string;
  tipe: string;
  jenis?: RequestSparepartJenis;
  service_id?: string | null;
  sp_id?: string | null;
  nama_sp: string;
  jumlah: number;
  harga_diajukan?: number | null;
  alasan?: string | null;
  keterangan?: string | null;
  cabang: string;
  status: RequestSparepartStatus;
  harga_disetujui?: number | null;
  supplier?: string | null;
  harga_beli_aktual?: number | null;
  bukti_url?: string | null;
  catatan_beli?: string | null;
  dibeli_oleh?: string | null;
  dibeli_at?: string | null;
  tanggal_terima?: string | null;
  diterima_oleh?: string | null;
  diterima_at?: string | null;
  estimasi_tiba?: string | null;
  catatan?: string | null;
  catatan_kc?: string | null;
  disetujui_oleh_kc?: string | null;
  disetujui_at_kc?: string | null;
  dibuat_oleh?: string | null;
  created_at?: string;
  updated_at?: string;
  product_link?: string | null;
  /** Foto unit yang di-input kasir waktu Tambah Unit — snapshot diambil saat
   * request dibuat, jadi kepala cabang/teknisi/kasir bisa lihat request ini
   * buat HP yang mana tanpa buka tiket servisnya. */
  unit_foto_snapshot?: string | null;
  /** Legacy (flow lama) — dipertahankan untuk data historis. */
  harga_jual?: number | null;
}

// ─── Courier monitoring ────────────────────────────────────────────────
export interface KurirMonitoringItem {
  kurir_id: string;
  kurir_name: string;
  cabang: string;
  total_cod: number;
  cod_beli: number;
  cod_jual: number;
  cod_delivery?: number;
  status_menunggu: number;
  status_diterima: number;
  status_proses: number;
  status_selesai: number;
  status_transaksi_berhasil?: number;
  status_terkirim?: number;
  status_ditolak: number;
  status_gagal: number;
  total_offer_price?: number;
  total_transaksi_price?: number;
  success_rate: number;
  last_activity?: string | null;
}

// Sync response shape is backend-version dependent; keep unknown extension fields until the sync page is migrated.
export interface InfluencerSyncResponse {
  synced?: number;
  message?: string;
  [key: string]: unknown;
}

// ─── Influencer dashboards ─────────────────────────────────────────────
export interface InfluencerDashboardStats {
  total_video: number;
  total_views: number;
  total_likes: number;
  produk_dipromosikan: number;
  trend_views: Array<{ tanggal?: string; minggu?: string; periode?: string; views: number }>;
  top_videos: Array<{ unit_label: string; platform: Platform; views: number; likes: number; video_id?: string }>;
}
export interface OwnerInfluencerDashboard {
  total_influencers: number;
  total_videos: number;
  total_views: number;
  total_likes: number;
  by_cabang: Array<{ cabang: string; video_count: number; views: number; likes: number; influencer_count: number }>;
  top_influencers: Array<{ influencer_id?: string; name?: string; influencer_name?: string; cabang: string; views?: number; likes?: number; total_views?: number; total_likes?: number; video_count?: number; total_video?: number; produk_dipromosikan?: number }>;
}

// ─── Transfer Stok ───────────────────────────────────────────────────────
export type TransferStokStatus = "Pending" | "Diterima" | "Ditolak" | "Processing";
export interface TransferStokUnit {
  unit_id_asal: string;
  unit_id_baru?: string | null;
}
export interface TransferStok {
  id: string;
  transfer_id: string;
  cabang_asal: string;
  cabang_tujuan: string;
  units: TransferStokUnit[];
  jumlah: number;
  status: TransferStokStatus;
  catatan?: string;
  /** Catatan yang diisi cabang tujuan saat merespon (wajib kalau Ditolak) — sebelumnya direkam backend tapi tidak pernah ditampilkan di manapun. */
  catatan_respon?: string;
  direspon_oleh?: string;
  created_at: string;
  created_by: string;
}

// ─── COD ─────────────────────────────────────────────────────────────────
export type CODType = "beli" | "jual" | "delivery";
export type CODStatus =
  | "menunggu_kurir"
  | "diterima"
  | "kurir_menuju_lokasi"
  | "sudah_bertemu_penjual"
  | "input_stok"
  | "menunggu_approval_kasir"
  | "processing_approval"
  | "selesai"
  | "ditolak"
  | "barang_akan_dijemput"
  | "barang_sudah_diambil"
  | "kurir_sedang_transaksi"
  | "transaksi_berhasil"
  | "gagal"
  | "kurir_menuju_toko"
  | "sedang_diantar"
  | "terkirim";

export interface CODRequest {
  id: string;
  cod_id: string;
  type: CODType;
  status: CODStatus;
  cabang: string;
  kurir_id?: string | null;
  kurir_name?: string | null;
  location?: string;
  wa_number?: string;
  screenshot_url?: string | null;
  note?: string;
  offer_price?: number;
  product_name?: string;
  product_link?: string;
  trx_id?: string;
  delivery_address?: string;
  wa_customer?: string;
  items?: { sp_id: string; jumlah: number; nama: string }[];
  deal_price?: number;
  created_at: string;
  updated_at?: string;
  status_history?: {
    status: CODStatus;
    by: string;
    by_name: string;
    at: string;
    note?: string;
  }[];
}

export interface KurirListItem {
  kurir_id: string;
  kurir_name: string;
  cabang: string;
}

// ─── Influencer ──────────────────────────────────────────────────────────
export type Platform = "tiktok" | "instagram" | "youtube";
export interface InfluencerVideo {
  id: string;
  video_id: string;
  influencer_id: string;
  influencer_name: string;
  cabang: string;
  unit_id?: string | null;
  unit_label: string;
  platform: Platform;
  url: string;
  views: number;
  likes: number;
  comments: number;
  description?: string;
  thumbnail_url?: string;
  uploaded_at: string;
  updated_at: string;
}
export interface InfluencerCatalogItem {
  unit_id: string;
  merk: string;
  tipe: string;
  storage: string;
  warna: string;
  harga_jual: number;
  kategori: string;
  has_video: boolean;
  videos_count: number;
  video_id?: string | null;
}

// ─── Upload ──────────────────────────────────────────────────────────────
export interface UploadedImage {
  secure_url: string;
  public_id?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  folder?: string;
}

// ─── Log ─────────────────────────────────────────────────────────────────
export interface ActivityLog {
  id: string;
  user: string;
  action?: string;
  aksi?: string;
  target?: string;
  detail?: string;
  cabang?: string;
  timestamp?: string;
  waktu?: string;
}
