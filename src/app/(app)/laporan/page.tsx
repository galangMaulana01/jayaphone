"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import type { DashboardStats, RequestSparepart, ServiceStatus, ServiceTicket, Transaksi } from "@/lib/types";
import { CabangFilter } from "@/components/ui/CabangFilter";
import { DateFilterBar } from "@/components/ui/DateFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ServiceStatusBadge } from "@/components/ui/Badge";
import { createDefaultDateFilter, toApiQueryParams, type DateFilterState } from "@/lib/utils/dateFilter";
import { useAuth } from "@/contexts/AuthContext";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { formatDateTimeShort } from "@/lib/utils/formatters";

type LaporanTab = "penjualan" | "sparepart" | "service" | "keuangan";
const TAB_LABEL: Record<LaporanTab, string> = { penjualan: "Penjualan", sparepart: "Sparepart", service: "Service", keuangan: "Keuangan" };

function money(value: number | undefined): string {
  return (value || 0).toLocaleString("id-ID");
}

export default function LaporanPage(): JSX.Element {
  const { user } = useAuth();
  const cabangTz = useCabangTimezones();
  // Historically this page was a single "Laporan Keuangan" view — bare
  // /laporan (no ?tab=) keeps showing that same tab so existing bookmarks
  // and links aren't disrupted. The sidebar's Penjualan/Sparepart/Service
  // children deep-link the other three explicitly.
  const [tab, setTab] = useState<LaporanTab>("keuangan");
  useEffect(() => {
    const initialTab = new URLSearchParams(window.location.search).get("tab");
    if (initialTab && (["penjualan", "sparepart", "service", "keuangan"] as string[]).includes(initialTab)) setTab(initialTab as LaporanTab);
  }, []);

  const [filter, setFilter] = useState<DateFilterState>(createDefaultDateFilter());
  const [branch, setBranch] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [items, setItems] = useState<Transaksi[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceTicket[]>([]);
  const [allRequests, setAllRequests] = useState<RequestSparepart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => ({ ...toApiQueryParams(filter), cabang: branch || undefined }), [filter, branch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsResult, transaksiResult, serviceResult, requestResult] = await Promise.all([
        Api.dashboard.stats(params),
        Api.transaksi.list({ ...params, limit: 200 }),
        Api.service.list({ ...params, limit: 200 }),
        Api.requestSparepart.list({}),
      ]);
      setStats(statsResult.data);
      setItems(transaksiResult.data || []);
      setServiceItems(serviceResult.data || []);
      setAllRequests(requestResult.data || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  }, [params]);
  useEffect(() => { void load(); }, [load]);

  // requestSparepart has no date_from/date_to param — filter the same period
  // client-side using its own created_at, same as every other tab on this page.
  const periodRequests = useMemo(() => {
    const { date_from, date_to } = toApiQueryParams(filter);
    return allRequests.filter((r) => {
      if (branch && r.cabang !== branch) return false;
      const requestDate = (r.created_at || "").slice(0, 10);
      return requestDate >= date_from && requestDate <= date_to;
    });
  }, [allRequests, filter, branch]);

  const k = (stats as (DashboardStats & { keuangan?: DashboardStats["keuangan"] & { total_revenue?: number; total_modal?: number } }) | null)?.keuangan;
  const revenue = k?.total_revenue ?? k?.total_omzet ?? 0;
  const modal = k?.total_modal ?? 0;
  const profit = k?.total_profit ?? 0;
  const poinDipakai = k?.total_poin_dipakai ?? 0;
  const poinDapat = k?.total_poin_dapat ?? 0;
  const biayaPoinDipakai = k?.biaya_poin_dipakai ?? poinDipakai * 1000;

  const cabangBreakdown = useMemo(() => {
    if (user?.role !== "owner") return [];
    const byCabang = new Map<string, { count: number; omzet: number }>();
    items.forEach((t) => {
      const entry = byCabang.get(t.cabang) ?? { count: 0, omzet: 0 };
      entry.count += 1;
      entry.omzet += t.harga_jual || 0;
      byCabang.set(t.cabang, entry);
    });
    return Array.from(byCabang.entries()).map(([cabang, v]) => ({ cabang, ...v })).sort((a, b) => b.omzet - a.omzet);
  }, [items, user?.role]);

  const serviceStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { Antrian: 0, Proses: 0, Selesai: 0, Approved: 0, Ditolak: 0 };
    serviceItems.forEach((s) => { counts[s.status] = (counts[s.status] ?? 0) + 1; });
    return counts;
  }, [serviceItems]);

  const sparepartTotals = useMemo(() => {
    const purchased = periodRequests.filter((r) => r.status === "Diterima" || r.status === "Digunakan");
    const totalNilaiPembelian = purchased.reduce((sum, r) => sum + (r.harga_beli_aktual ?? 0) * r.jumlah, 0);
    const jenisRepair = periodRequests.filter((r) => r.jenis !== "equipment").length;
    const jenisEquipment = periodRequests.filter((r) => r.jenis === "equipment").length;
    return { totalNilaiPembelian, jenisRepair, jenisEquipment, purchasedCount: purchased.length };
  }, [periodRequests]);

  return (
    <div className="jp-page">
      <div className="jp-page-header">
        <div>
          <h1 className="jp-page-title">Laporan</h1>
          <p className="text-sm text-jp-muted dark:text-jp-muted-dark">{TAB_LABEL[tab]}{user?.role === "kepala_cabang" ? " · Cabang " + user.cabang : ""}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <DateFilterBar currentFilterState={filter} onFilterStateChange={setFilter} />
          {user?.role === "owner" && <CabangFilter value={branch} onChange={setBranch} label="" className="min-w-[180px]" />}
        </div>
      </div>

      <div className="segmented-control">
        {(["penjualan", "sparepart", "service", "keuangan"] as LaporanTab[]).map((t) => (
          <button type="button" key={t} className={`filter-tab ${tab === t ? "filter-tab-active" : ""}`} onClick={() => setTab(t)}>{TAB_LABEL[t]}</button>
        ))}
      </div>

      {loading ? <LoadingSkeleton numberOfRows={6} /> : error ? <ErrorState message={error} onRetry={load} /> : (
        <>
          {tab === "penjualan" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="metric-card"><p className="label">Unit Terjual</p><p className="mt-1 jp-page-title">{items.length.toLocaleString("id-ID")}</p></div>
                <div className="metric-card"><p className="label">Total Omzet</p><p className="mt-1 jp-page-title font-mono">Rp {money(revenue)}</p></div>
              </div>
              {cabangBreakdown.length > 0 && (
                <div className="table-wrap overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="tbl-head"><tr>{["Cabang", "Unit Terjual", "Omzet"].map((h) => <th className="px-5 py-3 text-left" key={h}>{h}</th>)}</tr></thead>
                    <tbody>{cabangBreakdown.map((row) => <tr className="tbl-row" key={row.cabang}><td className="px-5 py-4 font-medium">{row.cabang}</td><td className="px-5 py-4">{row.count}</td><td className="whitespace-nowrap px-5 py-4 font-mono tabular-nums">Rp {money(row.omzet)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
              <div className="table-wrap overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="tbl-head"><tr>{["Unit", "Kasir", "Harga Jual", "Cabang", "Waktu"].map((h) => <th className="px-5 py-3 text-left" key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {items.length ? items.map((t) => (
                      <tr className="tbl-row" key={t.trx_id}>
                        <td className="px-5 py-4">{t.unit_label}</td>
                        <td className="px-5 py-4">{t.kasir}</td>
                        <td className="whitespace-nowrap px-5 py-4 tabular-nums">Rp {money(t.harga_jual)}</td>
                        <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{t.cabang}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(t.waktu, resolveCabangTimezone(cabangTz, t.cabang))}</td>
                      </tr>
                    )) : <tr><td colSpan={5}><EmptyState message="Belum ada penjualan pada periode ini" iconName="chartSvg" /></td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "sparepart" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="metric-card"><p className="label">Total Request</p><p className="mt-1 jp-page-title">{periodRequests.length.toLocaleString("id-ID")}</p></div>
                <div className="metric-card"><p className="label">Nilai Pembelian</p><p className="mt-1 jp-page-title font-mono">Rp {money(sparepartTotals.totalNilaiPembelian)}</p><p className="mt-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">{sparepartTotals.purchasedCount} request sudah dibeli</p></div>
                <div className="metric-card"><p className="label">Repair vs Equipment</p><p className="mt-1 jp-page-title">{sparepartTotals.jenisRepair} / {sparepartTotals.jenisEquipment}</p></div>
              </div>
              <div className="table-wrap overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="tbl-head"><tr>{["Request", "Nama", "Jenis", "Jumlah", "Harga Beli Aktual", "Status", "Tanggal"].map((h) => <th className="px-5 py-3 text-left" key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {periodRequests.length ? periodRequests.map((r) => (
                      <tr className="tbl-row" key={r.id}>
                        <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{r.req_id}</td>
                        <td className="px-5 py-4 font-medium">{r.nama_sp}</td>
                        <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{r.jenis === "equipment" ? "Equipment" : "Repair"}</td>
                        <td className="px-5 py-4">{r.jumlah}</td>
                        <td className="whitespace-nowrap px-5 py-4 font-mono tabular-nums">{r.harga_beli_aktual ? `Rp ${money(r.harga_beli_aktual)}` : "-"}</td>
                        <td className="px-5 py-4"><span className="badge badge-booking">{r.status}</span></td>
                        <td className="whitespace-nowrap px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{r.created_at ? formatDateTimeShort(r.created_at, resolveCabangTimezone(cabangTz, r.cabang)) : "-"}</td>
                      </tr>
                    )) : <tr><td colSpan={7}><EmptyState message="Belum ada request sparepart pada periode ini" iconName="packageSvg" /></td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "service" && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {(["Antrian", "Proses", "Selesai", "Approved", "Ditolak"] as const).map((statusKey) => (
                  <div className="metric-card" key={statusKey}><p className="label">{statusKey}</p><p className="mt-1 jp-page-title">{serviceStatusCounts[statusKey] ?? 0}</p></div>
                ))}
              </div>
              <div className="table-wrap overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="tbl-head"><tr>{["ID", "Unit", "Teknisi", "Status", "Masuk"].map((h) => <th className="px-5 py-3 text-left" key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {serviceItems.length ? serviceItems.map((s) => (
                      <tr className="tbl-row" key={s.service_id}>
                        <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{s.service_id}</td>
                        <td className="px-5 py-4">{s.unit_label}</td>
                        <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{s.teknisi || "-"}</td>
                        <td className="px-5 py-4"><ServiceStatusBadge status={s.status as ServiceStatus} /></td>
                        <td className="whitespace-nowrap px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(s.created_at, resolveCabangTimezone(cabangTz, s.cabang))}</td>
                      </tr>
                    )) : <tr><td colSpan={5}><EmptyState message="Belum ada data service pada periode ini" iconName="wrenchSvg" /></td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "keuangan" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.618fr_1fr_1fr]">
                <div className="metric-card"><p className="label">Total Revenue</p><p className="mt-1 jp-page-title">Rp {money(revenue)}</p></div>
                <div className="metric-card"><p className="label">Total Modal</p><p className="mt-1 jp-page-title">Rp {money(modal)}</p></div>
                <div className="metric-card"><p className="label">Gross Profit</p><p className="mt-1 jp-page-title font-mono text-jp-teal dark:text-jp-teal">Rp {money(profit)}</p></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="metric-card">
                  <p className="label">Pengeluaran Poin (Diskon)</p>
                  <p className="mt-1 jp-page-title font-mono text-jp-danger dark:text-jp-danger-dark">Rp {money(biayaPoinDipakai)}</p>
                  <p className="mt-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">{poinDipakai.toLocaleString("id-ID")} poin dipakai customer</p>
                </div>
                <div className="metric-card"><p className="label">Poin Didapat Customer</p><p className="mt-1 jp-page-title font-mono">{poinDapat.toLocaleString("id-ID")} poin</p></div>
              </div>
              <div className="table-wrap overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="tbl-head"><tr>{["TRX ID", "Unit", "Kasir", "Harga Jual", "Modal", "Profit", "Waktu"].map((h) => <th className="px-5 py-3 text-left" key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {items.length ? items.map((t) => (
                      <tr className="tbl-row" key={t.trx_id}>
                        <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{t.trx_id}</td>
                        <td className="px-5 py-4">{t.unit_label}</td>
                        <td className="px-5 py-4">{t.kasir}</td>
                        <td className="whitespace-nowrap px-5 py-4 tabular-nums">Rp {money(t.harga_jual)}</td>
                        <td className="whitespace-nowrap px-5 py-4 tabular-nums">Rp {money(t.harga_modal)}</td>
                        <td className="whitespace-nowrap px-5 py-4 font-mono"><span className={t.profit < 0 ? "text-jp-danger dark:text-jp-danger-dark" : "text-jp-teal dark:text-jp-teal"}>Rp {money(t.profit)}</span>{t.profit < 0 && <span className="badge badge-sold ml-2">Rugi</span>}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(t.waktu, resolveCabangTimezone(cabangTz, t.cabang))}</td>
                      </tr>
                    )) : <tr><td colSpan={7}><EmptyState message="Belum ada transaksi" iconName="chartSvg" /></td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
