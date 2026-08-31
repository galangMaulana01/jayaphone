"use client";
// Riwayat COD Kurir — final-state history (selesai / ditolak / gagal / terkirim /
// transaksi_berhasil) derived from the live kurir dashboard payload. This is the
// operational "what is done" queue, deliberately separate from the audit/event
// Log Aktivitas (kurir-log). Actions are not exposed here because these tasks
// are terminal — mutating them again is out of contract.
import { useMemo, useState } from "react";
import { Api } from "@/lib/api";
import { useApiList } from "@/hooks/useApiList";
import type { CODRequest, CODStatus } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { CodStatusBadge } from "@/components/ui/Badge";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { formatDateTimeShort, NOT_SET } from "@/lib/utils/formatters";

const labels: Record<string, string> = {
  menunggu_kurir: "Menunggu kurir", diterima: "Diterima", kurir_menuju_lokasi: "Menuju lokasi penjual",
  sudah_bertemu_penjual: "Sudah bertemu", barang_akan_dijemput: "Akan dijemput", barang_sudah_diambil: "Barang diambil",
  kurir_menuju_toko: "Menuju toko", sedang_diantar: "Sedang diantar", terkirim: "Terkirim",
  kurir_sedang_transaksi: "Sedang transaksi", transaksi_berhasil: "Transaksi berhasil",
  menunggu_approval_kasir: "Menunggu approval", selesai: "Selesai", ditolak: "Ditolak",
  gagal: "Gagal", input_stok: "Input stok", processing_approval: "Diproses",
};
// Terminal states that belong in the "Riwayat COD" history queue.
const TERMINAL: CODStatus[] = ["selesai", "ditolak", "gagal", "terkirim", "transaksi_berhasil"];

export default function KurirHistoryPage(): JSX.Element {
  const cabangTz = useCabangTimezones();
  const [typeFilter, setTypeFilter] = useState("");
  const { items, loading, error, reload: load } = useApiList<CODRequest>(
    () => Api.cod.kurirDashboard({}).then((r) => r.data ?? []),
    [],
    "Gagal memuat riwayat COD",
  );
  const history = useMemo(() => items.filter((item) => TERMINAL.includes(item.status) && (!typeFilter || item.type === typeFilter)), [items, typeFilter]);
  const detail = (item: CODRequest): string => item.product_name || item.trx_id || item.items?.map((x) => x.nama).join(", ") || "COD";

  return (
    <div className="jp-page kurir-history">
      <div className="jp-page-header">
        <div>
          <h1 className="jp-page-title">Riwayat COD</h1>
          <p className="text-sm text-jp-muted dark:text-jp-muted-dark">Tugas COD yang sudah selesai, terkirim, atau ditolak.</p>
        </div>
        <select className="field-control w-full sm:w-auto" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="">Semua Tipe</option>
          <option value="beli">Beli</option>
          <option value="jual">Jual</option>
          <option value="delivery">Delivery</option>
        </select>
      </div>

      {loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={load} /> : (
        <>
          {/* Mobile: stacked cards so status/time never require horizontal scroll. */}
          <div className="md:hidden space-y-3">
            {history.length ? history.map((item) => (
              <div key={item.id} className="panel rounded-jp-md p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="badge">{item.type}</span>
                  <span className="text-[10px] text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(item.updated_at || item.created_at, resolveCabangTimezone(cabangTz, item.cabang))}</span>
                </div>
                <p className="text-sm font-medium">{detail(item)}</p>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-jp-muted dark:text-jp-muted-dark">{item.location || item.delivery_address || item.cabang || NOT_SET}</span>
                  <CodStatusBadge status={item.status}>{labels[item.status] || item.status}</CodStatusBadge>
                </div>
                {item.note ? <p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">Catatan: {item.note}</p> : null}
              </div>
            )) : <EmptyState message="Belum ada riwayat COD" iconName="checkCircleSvg" />}
          </div>

          {/* Desktop: table with the same header contract as the dashboard. */}
          <div className="hidden md:block table-wrap overflow-x-auto rounded-jp-md">
            <table className="w-full text-xs">
              <thead className="tbl-head">
                <tr>{["Waktu", "Tipe", "Detail", "Lokasi / Cabang", "Status"].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Status" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {history.length ? history.map((item) => (
                  <tr key={item.id} className="tbl-row">
                    <td className="whitespace-nowrap px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(item.updated_at || item.created_at, resolveCabangTimezone(cabangTz, item.cabang))}</td>
                    <td className="px-5 py-4"><span className="badge">{item.type}</span></td>
                    <td className="px-5 py-4 font-medium">{detail(item)}</td>
                    <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{item.location || item.delivery_address || item.cabang || NOT_SET}</td>
                    <td className="tbl-action-col px-5 py-4"><CodStatusBadge status={item.status}>{labels[item.status] || item.status}</CodStatusBadge></td>
                  </tr>
                )) : <tr><td colSpan={5}><EmptyState message="Belum ada riwayat COD" iconName="checkCircleSvg" /></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
