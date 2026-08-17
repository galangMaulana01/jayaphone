"use client";

import { Suspense } from "react";
import { Api } from "@/lib/api";
import { CodStatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { useApiList } from "@/hooks/useApiList";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDateTimeShort, formatRupiah, NOT_SET } from "@/lib/utils/formatters";
import type { CODRequest, CODStatus, CODType } from "@/lib/types";

// Merges what used to be 3 separate views (COD Beli's "Monitoring" tab, COD
// Jual's "Monitoring" tab, and the standalone "Delivery" page/group) into
// one table with a Tipe filter — client feedback was that checking 3
// different places for "where's my order" was one too many. Status
// vocabulary is genuinely different per type (see STATUS_LABEL below), so
// the status filter only appears once a specific Tipe is selected.
const TYPE_VALUES = ["", "beli", "jual", "delivery"] as const;
type TypeFilter = (typeof TYPE_VALUES)[number];
const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "beli", label: "Beli" },
  { value: "jual", label: "Jual" },
  { value: "delivery", label: "Delivery" },
];

const STATUS_FILTER_OPTIONS: Record<Exclude<TypeFilter, "">, { value: string; label: string }[]> = {
  beli: [
    { value: "", label: "Semua" },
    { value: "menunggu_kurir", label: "Menunggu Kurir" },
    { value: "kurir_menuju_lokasi", label: "Menuju Lokasi" },
    { value: "sudah_bertemu_penjual", label: "Sudah Bertemu" },
    { value: "menunggu_approval_kasir", label: "Menunggu Approval" },
    { value: "processing_approval", label: "Diproses" },
    { value: "selesai", label: "Selesai" },
    { value: "ditolak", label: "Ditolak" },
  ],
  jual: [
    { value: "", label: "Semua" },
    { value: "menunggu_kurir", label: "Menunggu Kurir" },
    { value: "barang_akan_dijemput", label: "Akan Dijemput" },
    { value: "barang_sudah_diambil", label: "Barang Diambil" },
    { value: "kurir_sedang_transaksi", label: "Sedang Transaksi" },
    { value: "transaksi_berhasil", label: "Berhasil" },
    { value: "gagal", label: "Gagal" },
    { value: "ditolak", label: "Ditolak" },
  ],
  delivery: [
    { value: "", label: "Semua" },
    { value: "menunggu_kurir", label: "Menunggu Kurir" },
    { value: "kurir_menuju_toko", label: "Menuju Toko" },
    { value: "barang_sudah_diambil", label: "Barang Diambil" },
    { value: "sedang_diantar", label: "Sedang Diantar" },
    { value: "terkirim", label: "Terkirim" },
    { value: "gagal", label: "Gagal" },
  ],
};

// Each COD type runs its own status machine (see cod_service.py's
// COD_BELI_FLOW/COD_JUAL_FLOW/COD_DELIVERY_FLOW) — same status string can
// mean different things, so the label lookup is keyed by type first.
const STATUS_LABEL: Record<CODType, Record<string, string>> = {
  beli: {
    menunggu_kurir: "Menunggu Kurir", diterima: "Diterima", kurir_menuju_lokasi: "Menuju Lokasi",
    sudah_bertemu_penjual: "Sudah Bertemu", menunggu_approval_kasir: "Menunggu Approval",
    processing_approval: "Diproses", selesai: "Selesai", ditolak: "Ditolak",
  },
  jual: {
    menunggu_kurir: "Menunggu Kurir", diterima: "Diterima", barang_akan_dijemput: "Akan Dijemput",
    barang_sudah_diambil: "Barang Diambil", kurir_sedang_transaksi: "Sedang Transaksi",
    transaksi_berhasil: "Berhasil", gagal: "Gagal", ditolak: "Ditolak",
  },
  delivery: {
    menunggu_kurir: "Menunggu Kurir", diterima: "Diterima", kurir_menuju_toko: "Menuju Toko",
    barang_sudah_diambil: "Barang Diambil", sedang_diantar: "Sedang Diantar",
    terkirim: "Terkirim", gagal: "Gagal",
  },
};

const TYPE_BADGE_LABEL: Record<CODType, string> = { beli: "Beli", jual: "Jual", delivery: "Delivery" };

export default function CodMonitoringPage(): JSX.Element {
  return <Suspense fallback={null}><CodMonitoringPageInner /></Suspense>;
}

function CodMonitoringPageInner(): JSX.Element {
  const cabangTz = useCabangTimezones();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const rawType = searchParams.get("type");
  const typeFilter = (rawType && (TYPE_VALUES as readonly string[]).includes(rawType) ? rawType : "") as TypeFilter;
  const statusOptions = typeFilter ? STATUS_FILTER_OPTIONS[typeFilter] : [];
  const rawStatus = searchParams.get("status");
  const statusFilter = rawStatus && statusOptions.some((o) => o.value === rawStatus) ? rawStatus : "";

  // Switching Tipe always resets Status too — the two params are coupled
  // (each type has its own status vocabulary), so a single combined push
  // avoids the second setter's stale-snapshot overwriting the first (see
  // useUrlParam's per-hook closure — two independent setValue calls in the
  // same handler would race on the same searchParams snapshot).
  const setTypeFilter = (nextType: TypeFilter) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextType) nextParams.set("type", nextType); else nextParams.delete("type");
    nextParams.delete("status");
    const queryString = nextParams.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };
  const setStatusFilter = (nextStatus: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextStatus) nextParams.set("status", nextStatus); else nextParams.delete("status");
    const queryString = nextParams.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  const { items, loading, error, reload } = useApiList<CODRequest>(
    () => Api.cod.list({ type: typeFilter || undefined, status: statusFilter || undefined }).then((r) => r.data ?? []),
    [typeFilter, statusFilter],
    "Gagal memuat monitoring COD",
  );

  return (
    <div className="jp-page">
      <div className="jp-page-header">
        <div>
          <h1 className="jp-page-title">Monitoring COD</h1>
          <p className="text-sm text-jp-muted dark:text-jp-muted-dark">Pantau posisi semua order COD Beli, Jual, dan Delivery di satu tempat.</p>
        </div>
      </div>

      <div className="segmented-control">
        {TYPE_OPTIONS.map((option) => (
          <button type="button" key={option.value || "all"} className={`filter-tab ${typeFilter === option.value ? "filter-tab-active" : ""}`} onClick={() => setTypeFilter(option.value)}>{option.label}</button>
        ))}
      </div>
      {statusOptions.length > 0 && (
        // Always visible (not md:hidden) — unlike the old per-type tabs, this
        // page has no sidebar status shortcuts to fall back on for desktop,
        // so the in-page filter is the only way to narrow by status there.
        <div className="segmented-control">
          {statusOptions.map((option) => (
            <button type="button" key={option.value || "all"} className={`filter-tab ${statusFilter === option.value ? "filter-tab-active" : ""}`} onClick={() => setStatusFilter(option.value)}>{option.label}</button>
          ))}
        </div>
      )}

      {loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <div className="table-wrap overflow-x-auto rounded-jp-md">
          <table className="w-full text-xs">
            <thead className="tbl-head border-b"><tr>{["Waktu", "Tipe", "Produk", "Lokasi / Alamat", "Kurir", "Harga", "Status"].map((h) => <th key={h} className="px-5 py-3.5 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {items.length ? items.map((item) => (
                <tr key={item.cod_id} className="tbl-row">
                  <td className="whitespace-nowrap px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(item.created_at, resolveCabangTimezone(cabangTz, item.cabang))}</td>
                  <td className="px-5 py-4"><span className="badge badge-booking">{TYPE_BADGE_LABEL[item.type]}</span></td>
                  <td className="px-5 py-4 font-medium">{item.product_name || NOT_SET}</td>
                  <td className="max-w-[220px] px-5 py-4 text-jp-muted dark:text-jp-muted-dark">
                    <p className="truncate">{(item.type === "beli" ? item.location : item.delivery_address) || NOT_SET}</p>
                    {item.type === "delivery" && item.trx_id && <p className="font-mono text-[10px]">{item.trx_id}</p>}
                  </td>
                  <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{item.kurir_name || NOT_SET}</td>
                  <td className="px-5 py-4 font-mono">{formatRupiah(item.deal_price ?? item.offer_price ?? 0)}</td>
                  <td className="px-5 py-4"><CodStatusBadge status={item.status as CODStatus}>{STATUS_LABEL[item.type]?.[item.status] ?? item.status}</CodStatusBadge></td>
                </tr>
              )) : <tr><td colSpan={7}><EmptyState message="Belum ada order COD" iconName="truckSvg" /></td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
