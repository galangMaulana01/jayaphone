"use client";

import { Suspense, useMemo, useState } from "react";
import { Api } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { UnitDetailModal } from "@/components/ui/UnitDetailModal";
import { useToast } from "@/contexts/ToastContext";
import { useApiList } from "@/hooks/useApiList";
import { useUrlParam } from "@/hooks/useUrlParam";
import { formatRupiah } from "@/lib/utils/formatters";
import type { ServiceStatus, ServiceTicket, Unit } from "@/lib/types";

const TAB_KEYS = ["Tersedia", "Service"] as const;
type Tab = (typeof TAB_KEYS)[number];
const TABS: { key: Tab; label: string }[] = [
  { key: "Tersedia", label: "Unit Tersedia" },
  { key: "Service", label: "Sedang Di-Service" },
];

// Kasir-facing status labels/colors for the monitoring tab — deliberately NOT
// the same as ServiceStatusBadge (used by owner/kc/teknisi views). Backend
// "Selesai" means teknisi is done but a price hasn't been approved yet, so
// from a kasir's stock-monitoring point of view the unit still isn't sellable
// — labeling it "Menunggu Approval" (yellow, same tier as Menunggu Sparepart)
// is truer than "Selesai" (which would read as ready-to-sell). "Approved" and
// "Ditolak" are intentionally absent from this map: Approved has already
// graduated to the "Unit Tersedia" tab, and Ditolak is resolved/historical —
// keeping either here would just be noise for something kasir needs to watch.
const KASIR_MONITOR_STATUS: Partial<Record<ServiceStatus, { label: string; cls: string }>> = {
  Antrian: { label: "Menunggu Dikerjakan", cls: "badge-masuk" },
  Proses: { label: "Proses", cls: "badge-proses" },
  Menunggu_Sparepart: { label: "Menunggu Sparepart", cls: "badge-booking" },
  Selesai: { label: "Menunggu Approval", cls: "badge-booking" },
};

export default function StokKasirPage(): JSX.Element {
  return <Suspense fallback={null}><StokKasirPageInner /></Suspense>;
}

function StokKasirPageInner(): JSX.Element {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Unit | null>(null);
  // Deep-link support: the sidebar's "Sedang Di-Service" shortcut lands here
  // with ?tab=Service applied — the query param IS the state, same pattern as
  // every other page converted to sidebar-group navigation this round.
  const [tab, setTab] = useUrlParam<Tab>("tab", TAB_KEYS, "Tersedia");

  const { items, loading, error, reload: load } = useApiList<Unit>(
    () => (tab === "Tersedia" ? Api.units.list({ status: "Tersedia" }).then((r) => r.data ?? []) : Promise.resolve([])),
    [tab], "Gagal memuat stok kasir",
  );
  const visible = useMemo(() => items.filter((u) => `${u.merk} ${u.tipe} ${u.unit_id} ${u.imei}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  // No single backend status filter covers "still in service" — fetched
  // unfiltered (kasir's own cabang only, enforced server-side) and narrowed
  // to the 4 in-flight statuses client-side via KASIR_MONITOR_STATUS.
  const { items: serviceItems, loading: serviceLoading, error: serviceError, reload: reloadService } = useApiList<ServiceTicket>(
    () => (tab === "Service" ? Api.service.list({ limit: 200 }).then((r) => r.data ?? []) : Promise.resolve([])),
    [tab], "Gagal memuat data service",
  );
  const visibleService = useMemo(
    () => serviceItems
      .filter((s) => s.status in KASIR_MONITOR_STATUS)
      .filter((s) => `${s.unit_label} ${s.imei ?? ""} ${s.teknisi ?? ""} ${s.keluhan}`.toLowerCase().includes(query.toLowerCase())),
    [serviceItems, query],
  );

  const openDetail = async (id: string) => { try { setSelected((await Api.units.detail(id)).data); } catch (e) { showToast(e instanceof Error ? e.message : "Detail unit gagal", "error"); } };

  return (
    <div className="jp-page">
      <div>
        <h1 className="jp-page-title">Stok Kasir</h1>
        <p className="text-sm text-jp-muted dark:text-jp-muted-dark">
          {tab === "Tersedia" ? "Unit tersedia untuk transaksi penjualan" : "Unit yang masih di-service — pantau statusnya di sini"}
        </p>
      </div>

      {/* Desktop relies on the sidebar's "Cek Stok" children (identical tabs,
          see nav.ts) as the single navigation for this switch — this row
          would be a pure duplicate there. Mobile keeps it since the sidebar
          isn't visible without opening the drawer. */}
      <div className="segmented-control md:hidden">
        {TABS.map((t) => <button type="button" key={t.key} className={`filter-tab ${tab === t.key ? "filter-tab-active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      <input className="field-control w-full max-w-xl" placeholder={tab === "Tersedia" ? "Cari merk, tipe, ID, IMEI..." : "Cari HP, IMEI, teknisi..."} value={query} onChange={(e) => setQuery(e.target.value)} />

      {tab === "Tersedia" ? (
        loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={load} /> : (
          <div className="table-wrap overflow-x-auto rounded-jp-md">
            <table className="w-full text-xs">
              <thead className="tbl-head border-b"><tr>{["Foto", "ID", "Perangkat", "Spesifikasi", "IMEI", "Harga Jual", "Battery", "Aksi"].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>
                {visible.length ? visible.map((u) => (
                  <tr key={u.unit_id} className="tbl-row">
                    <td className="px-5 py-4">{u.foto_url ? <img src={u.foto_url} alt={u.unit_id} className="h-10 w-10 rounded-jp-sm object-cover" /> : <span className="text-jp-muted dark:text-jp-muted-dark">-</span>}</td>
                    <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{u.unit_id}</td>
                    <td className="px-5 py-4"><p className="font-medium">{u.merk}</p><p className="text-[10px] text-jp-muted dark:text-jp-muted-dark">{u.tipe}</p></td>
                    <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{u.storage}/{u.ram} · {u.warna}<br />{u.kondisi}</td>
                    <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{u.imei}</td>
                    <td className="px-5 py-4 font-semibold font-mono text-jp-text dark:text-jp-text-dark">{formatRupiah(u.harga_jual)}</td>
                    <td className="px-5 py-4">{u.battery}%</td>
                    <td className="tbl-action-col px-5 py-4"><button type="button" className="btn-ghost" onClick={() => void openDetail(u.unit_id)}>Detail</button></td>
                  </tr>
                )) : <tr><td colSpan={8}><EmptyState message="Tidak ada unit tersedia" iconName="packageSvg" /></td></tr>}
              </tbody>
            </table>
          </div>
        )
      ) : (
        serviceLoading ? <LoadingSkeleton numberOfRows={5} /> : serviceError ? <ErrorState message={serviceError} onRetry={reloadService} /> : (
          <div className="table-wrap overflow-x-auto rounded-jp-md">
            <table className="w-full text-xs">
              <thead className="tbl-head border-b"><tr>{["Foto", "HP", "IMEI", "Kerusakan", "Teknisi", "Status"].map((h) => <th key={h} className="px-5 py-3.5 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {visibleService.length ? visibleService.map((s) => {
                  const st = KASIR_MONITOR_STATUS[s.status];
                  return (
                    <tr key={s.service_id} className="tbl-row">
                      <td className="px-5 py-4">{s.unit_foto_url ? <img src={s.unit_foto_url} alt={s.unit_id} className="h-10 w-10 rounded-jp-sm object-cover" /> : <span className="text-jp-muted dark:text-jp-muted-dark">-</span>}</td>
                      <td className="px-5 py-4 font-medium">{s.unit_label}</td>
                      <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{s.imei || "-"}</td>
                      <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{s.keluhan}</td>
                      <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{s.teknisi || "-"}</td>
                      <td className="px-5 py-4">{st && <span className={`badge ${st.cls}`}>{st.label}</span>}</td>
                    </tr>
                  );
                }) : <tr><td colSpan={6}><EmptyState message="Tidak ada unit sedang di-service" iconName="wrenchSvg" /></td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}

      <UnitDetailModal unit={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
