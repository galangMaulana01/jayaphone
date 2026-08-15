"use client";

import { useState } from "react";
import { Api } from "@/lib/api";
import { CodStatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { useApiList } from "@/hooks/useApiList";
import { formatDateTimeShort, NOT_SET } from "@/lib/utils/formatters";
import type { CODRequest, CODStatus } from "@/lib/types";

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "menunggu_kurir", label: "Menunggu Kurir" },
  { value: "kurir_menuju_toko", label: "Menuju Toko" },
  { value: "barang_sudah_diambil", label: "Barang Diambil" },
  { value: "sedang_diantar", label: "Sedang Diantar" },
  { value: "terkirim", label: "Terkirim" },
  { value: "gagal", label: "Gagal" },
];

const STATUS_LABEL: Record<string, string> = {
  menunggu_kurir: "Menunggu Kurir",
  diterima: "Diterima",
  kurir_menuju_toko: "Menuju Toko",
  barang_sudah_diambil: "Barang Diambil",
  sedang_diantar: "Sedang Diantar",
  terkirim: "Terkirim",
  gagal: "Gagal",
};

export default function CodDeliveryPage(): JSX.Element {
  const cabangTz = useCabangTimezones();
  const [statusFilter, setStatusFilter] = useState("");

  // Read-only monitoring — creation already happens from Input Transaksi's
  // "Kirim via COD" checkbox, so this page has no create/edit actions, only
  // a view into where each delivery currently stands.
  const { items, loading, error, reload } = useApiList<CODRequest>(
    () => Api.cod.list({ type: "delivery", status: statusFilter || undefined }).then((r) => r.data ?? []),
    [statusFilter],
    "Gagal memuat data delivery",
  );

  return (
    <div className="jp-page">
      <div className="jp-page-header">
        <div>
          <h1 className="jp-page-title">Delivery</h1>
          <p className="text-sm text-jp-muted dark:text-jp-muted-dark">Pantau pengiriman transaksi yang dikirim lewat kurir COD</p>
        </div>
      </div>

      <div className="segmented-control">
        {STATUS_FILTER_OPTIONS.map((option) => (
          <button type="button" key={option.value || "all"} className={`filter-tab ${statusFilter === option.value ? "filter-tab-active" : ""}`} onClick={() => setStatusFilter(option.value)}>{option.label}</button>
        ))}
      </div>

      {loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <div className="table-wrap overflow-x-auto rounded-jp-md">
          <table className="w-full text-xs">
            <thead className="tbl-head border-b"><tr>{["Waktu", "Transaksi", "Alamat Pengiriman", "Kurir", "Status"].map((h) => <th key={h} className="px-5 py-3.5 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {items.length ? items.map((item) => (
                <tr key={item.cod_id} className="tbl-row">
                  <td className="whitespace-nowrap px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(item.created_at, resolveCabangTimezone(cabangTz, item.cabang))}</td>
                  <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{item.trx_id || NOT_SET}</td>
                  <td className="max-w-[240px] truncate px-5 py-4">{item.delivery_address || NOT_SET}</td>
                  <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{item.kurir_name || NOT_SET}</td>
                  <td className="px-5 py-4"><CodStatusBadge status={item.status as CODStatus}>{STATUS_LABEL[item.status] ?? item.status}</CodStatusBadge></td>
                </tr>
              )) : <tr><td colSpan={5}><EmptyState message="Belum ada pengiriman COD" iconName="truckSvg" /></td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
