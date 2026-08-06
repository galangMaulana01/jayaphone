"use client";

// Dashboard page — the landing page for owner and kepala_cabang.
//
// Migrated from `renderDashboard()` in index.html.bak (approx. lines 1090–1315).
// The heavy chart wiring is deferred (see TODO markers) so this file focuses
// on the layout + the four summary stat cards + the recent-transactions
// table. All financial data respects the date filter — FBUG-002 fix on the
// original code turned this into the canonical example of how a page should
// consume `getDateFilterParams()`.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/ui/StatCard";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { DateFilterBar } from "@/components/ui/DateFilterBar";
import { createDefaultDateFilter, toApiQueryParams } from "@/lib/utils/dateFilter";
import { formatDateTimeShort, formatRupiah } from "@/lib/utils/formatters";
import type { DashboardStats, DashboardTrend, DashboardTrendPoint } from "@/lib/types";

function normaliseTrendPoints(trendResponse: DashboardTrend): DashboardTrendPoint[] {
  if (Array.isArray(trendResponse.trend)) return trendResponse.trend;
  const labels = Array.isArray(trendResponse.labels) ? trendResponse.labels : [];
  const revenue = Array.isArray(trendResponse.revenue) ? trendResponse.revenue : [];
  const profit = Array.isArray(trendResponse.profit) ? trendResponse.profit : [];
  const jumlah = Array.isArray(trendResponse.jumlah) ? trendResponse.jumlah : [];
  return labels.map((tanggal, index) => ({
    tanggal,
    omzet: revenue[index] ?? 0,
    profit: profit[index] ?? 0,
    jumlah: jumlah[index] ?? 0,
  }));
}

export default function DashboardPage(): JSX.Element {
  const { user: currentUser } = useAuth();
  const [dateFilterState, setDateFilterState] = useState(createDefaultDateFilter);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [dashboardTrend, setDashboardTrend] = useState<DashboardTrendPoint[] | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [fetchErrorMessage, setFetchErrorMessage] = useState<string>("");

  const filterQueryParams = useMemo(() => toApiQueryParams(dateFilterState), [dateFilterState]);

  const loadDashboardData = useCallback(async (): Promise<void> => {
    setIsFetching(true);
    setFetchErrorMessage("");
    try {
      const [statsResult, trendResult] = await Promise.allSettled([
        Api.dashboard.stats(filterQueryParams),
        Api.dashboard.trend(filterQueryParams),
      ]);
      if (statsResult.status === "rejected") {
        const message = statsResult.reason instanceof ApiError ? statsResult.reason.message : "Gagal memuat dashboard";
        throw new Error(message);
      }
      setDashboardStats(statsResult.value.data);
      setDashboardTrend(
        trendResult.status === "fulfilled" ? normaliseTrendPoints(trendResult.value.data) : null,
      );
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Gagal memuat dashboard";
      setFetchErrorMessage(message);
    } finally {
      setIsFetching(false);
    }
  }, [filterQueryParams]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const cabangSuffix =
    currentUser?.role === "kepala_cabang" ? ` — Cabang ${currentUser.cabang}` : "";
  const totalTerjual = dashboardStats?.unit.terjual ?? dashboardStats?.unit.sold ?? 0;
  const totalOmzet = dashboardStats?.keuangan.total_omzet ?? dashboardStats?.keuangan.total_revenue ?? 0;
  const profitHariIni = dashboardStats?.keuangan.profit_hari_ini ?? dashboardStats?.keuangan.profit_harian ?? 0;
  const recentTransaksi = dashboardStats?.recent_transaksi ?? [];

  return (
    <div className="space-y-6">
      {cabangSuffix && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Dashboard{cabangSuffix}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <DateFilterBar
          currentFilterState={dateFilterState}
          onFilterStateChange={setDateFilterState}
        />
      </div>

      {isFetching ? (
        <LoadingSkeleton numberOfRows={6} />
      ) : fetchErrorMessage ? (
        <ErrorState message={fetchErrorMessage} onRetry={loadDashboardData} />
      ) : dashboardStats ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Unit" value={dashboardStats.unit.total} subtitle="Semua status" accent="blue" />
            <StatCard label="Stok Tersedia" value={dashboardStats.unit.tersedia} subtitle="Siap dijual" accent="green" />
            <StatCard label="Total Terjual" value={totalTerjual} subtitle="Sesuai filter" accent="orange" />
            <StatCard label="Gross Profit" value={formatRupiah(dashboardStats.keuangan.total_profit)} subtitle="Sesuai filter" accent="profit" />
          </div>

          <div className="card p-5">
            <h2 className="mb-4 text-sm font-semibold">Ringkasan Keuangan</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Total Omzet</p>
                <p className="mt-1 text-lg font-bold">{formatRupiah(totalOmzet)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Profit Hari Ini</p>
                <p className="mt-1 text-lg font-bold">{formatRupiah(profitHariIni)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Total Transaksi</p>
                <p className="mt-1 text-lg font-bold">{dashboardStats.keuangan.total_transaksi}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Total Profit</p>
                <p className="mt-1 text-lg font-bold text-brand-teal">{formatRupiah(dashboardStats.keuangan.total_profit)}</p>
              </div>
            </div>
          </div>

          {/* TODO: chart. The legacy code used Chart.js to render dashboardTrend.trend as a
              line chart. Migration to react-chartjs-2 is queued for a follow-up commit —
              raw data is already available in `dashboardTrend` and honours the date filter. */}
          {dashboardTrend && (
            <div className="card p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Trend Harian
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Chart Chart.js belum di-porting; sementara ditampilkan sebagai tabel ringkas.
              </p>
              <div className="mt-3 max-h-64 overflow-y-auto text-xs">
                <table className="w-full">
                  <thead className="tbl-head">
                    <tr>
                      <th className="py-2 text-left">Tanggal</th>
                      <th className="py-2 text-right">Omzet</th>
                      <th className="py-2 text-right">Profit</th>
                      <th className="py-2 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardTrend.map((trendPoint) => (
                      <tr key={trendPoint.tanggal} className="tbl-row">
                        <td className="py-1.5">{trendPoint.tanggal}</td>
                        <td className="py-1.5 text-right">{formatRupiah(trendPoint.omzet)}</td>
                        <td className="py-1.5 text-right">{formatRupiah(trendPoint.profit)}</td>
                        <td className="py-1.5 text-right">{trendPoint.jumlah}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h2 className="mb-4 text-sm font-semibold">Transaksi Terbaru</h2>
            {recentTransaksi.length === 0 ? (
              <EmptyState message="Belum ada transaksi" iconName="transaksiSvg" />
            ) : (
              <table className="w-full text-xs">
                <thead className="tbl-head">
                  <tr>
                    <th className="py-2 text-left">TRX ID</th>
                    <th className="py-2 text-left">Kasir</th>
                    <th className="py-2 text-left">Item</th>
                    <th className="py-2 text-right">Harga</th>
                    <th className="py-2 text-right">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransaksi.map((transaksiEntry) => (
                    <tr key={transaksiEntry.trx_id} className="tbl-row">
                      <td className="py-2 font-mono">{transaksiEntry.trx_id}</td>
                      <td className="py-2">{transaksiEntry.kasir}</td>
                      <td className="py-2">{transaksiEntry.unit_label}</td>
                      <td className="py-2 text-right font-medium">{formatRupiah(transaksiEntry.harga_jual)}</td>
                      <td className="py-2 text-right text-zinc-400 dark:text-zinc-500">
                        {formatDateTimeShort(transaksiEntry.waktu)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
