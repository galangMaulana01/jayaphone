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
    terjual: number;
    service: number;
  };
  keuangan: {
    total_omzet: number;
    total_profit: number;
    profit_hari_ini: number;
    total_transaksi: number;
  };
  recent_transaksi: TransaksiSummary[];
}

export interface DashboardTrendPoint {
  tanggal: string;
  omzet: number;
  profit: number;
  jumlah: number;
}
export interface DashboardTrend {
  trend: DashboardTrendPoint[];
  periode: { dari: string; sampai: string; hari: number };
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
  imei: string;
  imei2?: string;
  tipe_sim: string;
  keamanan: string;
  speaker: string;
  lcd: string;
  harga_modal?: number;
  harga_jual: number;
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
export type TransaksiSummary = Pick<Transaksi, "trx_id" | "unit_label" | "harga_jual" | "waktu" | "kasir">;

// ─── Service ─────────────────────────────────────────────────────────────
export type ServiceStatus = "Antrian" | "Proses" | "Selesai" | "Approved" | "Ditolak";
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
  sparepart_items?: { sp_id: string; jumlah: number }[];
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
export interface Sparepart {
  id: string;
  sp_id: string;
  nama: string;
  kategori: string;
  satuan: string;
  stok: number;
  harga_beli: number;
  harga_jual: number;
  dimensi_str?: string;
  cabang: string;
  catatan?: string;
  product_link?: string;
}

// ─── Cabang ──────────────────────────────────────────────────────────────
export interface Cabang {
  kode: string;
  nama: string;
  alamat?: string;
  telp?: string;
  aktif: boolean;
  kepala_username?: string;
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
  action: string;
  target?: string;
  cabang?: string;
  timestamp: string;
}
