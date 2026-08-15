// Small badge component — the legacy helpers `badge(status)` and
// `badgeService(status)` used a class-name lookup off a status string.
// This TS port centralizes that mapping and exposes two typed variants.

import type { ReactNode } from "react";
import type { CODStatus, ServiceStatus, UnitStatus } from "@/lib/types";

const unitStatusClass: Record<UnitStatus, string> = {
  "Tersedia": "badge-tersedia",
  "Sold": "badge-sold",
  "Booking": "badge-booking",
  "Service": "badge-service",
  "Dalam Transfer": "badge-booking",
  "Ditolak": "badge-sold",
};

const serviceStatusClass: Record<ServiceStatus, string> = {
  "Antrian": "badge-masuk",
  "Proses": "badge-proses",
  "Menunggu_Sparepart": "badge-booking",
  "Selesai": "badge-selesai",
  "Approved": "badge-diambil",
  "Ditolak": "badge-sold",
};

const serviceStatusLabel: Record<ServiceStatus, string> = {
  "Antrian": "Antrian",
  "Proses": "Proses",
  "Menunggu_Sparepart": "Menunggu Sparepart",
  "Selesai": "Selesai",
  "Approved": "Approved",
  "Ditolak": "Ditolak",
};

export function UnitStatusBadge({ status }: { status: UnitStatus }): JSX.Element {
  return <span className={`badge ${unitStatusClass[status] ?? "badge-service"}`}>{status}</span>;
}

export function ServiceStatusBadge({ status }: { status: ServiceStatus }): JSX.Element {
  return <span className={`badge ${serviceStatusClass[status] ?? "badge-masuk"}`}>{serviceStatusLabel[status] ?? status}</span>;
}

// COD (kurir) lifecycle — beli/jual/delivery all share the same CODStatus
// union, so one mapping covers every kurir card/row regardless of type.
// Four semantic tiers, reusing the exact classes already established above:
//   booking (yellow)  — waiting on someone else (kurir belum accept, kasir belum approve)
//   proses  (neutral) — kurir sedang aktif mengerjakan tahap ini
//   tersedia (green)  — tahap akhir yang berhasil
//   sold    (red)     — ditolak/gagal
const codStatusClass: Record<CODStatus, string> = {
  "menunggu_kurir": "badge-booking",
  "menunggu_approval_kasir": "badge-booking",
  "processing_approval": "badge-booking",
  "diterima": "badge-proses",
  "kurir_menuju_lokasi": "badge-proses",
  "sudah_bertemu_penjual": "badge-proses",
  "input_stok": "badge-proses",
  "barang_akan_dijemput": "badge-proses",
  "barang_sudah_diambil": "badge-proses",
  "kurir_sedang_transaksi": "badge-proses",
  "kurir_menuju_toko": "badge-proses",
  "sedang_diantar": "badge-proses",
  "selesai": "badge-tersedia",
  "transaksi_berhasil": "badge-tersedia",
  "terkirim": "badge-tersedia",
  "ditolak": "badge-sold",
  "gagal": "badge-sold",
};

/** Text stays caller-supplied (kurir-dashboard already has its own Indonesian label map) — this only decides the color. */
export function CodStatusBadge({ status, children }: { status: CODStatus; children: ReactNode }): JSX.Element {
  return <span className={`badge ${codStatusClass[status] ?? "badge-proses"}`}>{children}</span>;
}
