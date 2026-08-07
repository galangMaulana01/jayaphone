"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroCard } from "@/components/ui/HeroCard";
import { CabangFilter } from "@/components/ui/CabangFilter";
import { DateFilterBar } from "@/components/ui/DateFilterBar";
import { createDefaultDateFilter, toApiQueryParams } from "@/lib/utils/dateFilter";
import { formatDateTimeShort, formatRupiah, formatRupiahCompact } from "@/lib/utils/formatters";
import type { DashboardStats, DashboardTrend, DashboardTrendPoint } from "@/lib/types";

const DashboardTrendChart = dynamic(
  () => import("./_components/DashboardTrendChart").then((module) => module.DashboardTrendChart),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded-jp-sm bg-jp-surface-subtle dark:bg-jp-surface-subtle-dark md:h-72" />,
  },
);

interface DashboardMetricCardProps {
  label: string;
  value: string | number;
  description: string;
  mono?: boolean;
}

function DashboardMetricCard({ label, value, description, mono = false }: DashboardMetricCardProps): JSX.Element {
  return (
    <section className="metric-card">
      <p className="text-[11px] font-medium text-jp-muted dark:text-jp-muted-dark">{label}</p>
      <p className={"mt-3 text-2xl font-semibold tracking-tight text-jp-text dark:text-jp-text-dark " + (mono ? "font-mono text-xl tabular-nums" : "tabular-nums")}>{value}</p>
      <p className="mt-2 text-[11px] text-jp-muted dark:text-jp-muted-dark">{description}</p>
    </section>
  );
}

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
  const [selectedCabangFilter, setSelectedCabangFilter] = useState<string>("");

  const isOwner = currentUser?.role === "owner";
  const filterQueryParams = useMemo(
    () => ({ ...toApiQueryParams(dateFilterState), cabang: isOwner && selectedCabangFilter ? selectedCabangFilter : undefined }),
    [dateFilterState, isOwner, selectedCabangFilter],
  );

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
      setDashboardTrend(trendResult.status === "fulfilled" ? normaliseTrendPoints(trendResult.value.data) : null);
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

  const cabangSuffix = currentUser?.role === "kepala_cabang" ? " — Cabang " + currentUser.cabang : "";
  const totalTerjual = dashboardStats?.unit.terjual ?? dashboardStats?.unit.sold ?? 0;
  const totalOmzet = dashboardStats?.keuangan.total_omzet ?? dashboardStats?.keuangan.total_revenue ?? 0;
  const recentTransaksi = dashboardStats?.recent_transaksi ?? [];

  return (
    <div className="jp-page">
      <header className="jp-page-header">
        <div>
          <h1 className="jp-page-title">Dashboard</h1>
          <p className="mt-2 text-sm text-jp-muted dark:text-jp-muted-dark">Kondisi operasional Jayaphone pada periode yang dipilih{cabangSuffix}.</p>
        </div>
        <div className="flex flex-col gap-2 self-start sm:flex-row sm:items-start lg:self-auto">
          <DateFilterBar currentFilterState={dateFilterState} onFilterStateChange={setDateFilterState} />
          {isOwner ? <CabangFilter value={selectedCabangFilter} onChange={setSelectedCabangFilter} label="" className="min-w-[180px]" /> : null}
        </div>
      </header>

      {isFetching ? (
        <LoadingSkeleton numberOfRows={6} />
      ) : fetchErrorMessage ? (
        <ErrorState message={fetchErrorMessage} onRetry={loadDashboardData} />
      ) : dashboardStats ? (
        <>
          {/* Omzet adalah satu-satunya hero solid di layar ini. */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.618fr)_minmax(260px,1fr)]">
            <div>
              <HeroCard
                label="Total Omzet"
                value={formatRupiahCompact(totalOmzet)}
                description={`${formatRupiah(totalOmzet)} pada periode yang dipilih`}
                mono
                footer={
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">Transaksi</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{dashboardStats.keuangan.total_transaksi.toLocaleString("id-ID")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">Unit Terjual</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{totalTerjual.toLocaleString("id-ID")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">Gross Profit</p>
                      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-white" title={formatRupiah(dashboardStats.keuangan.total_profit)}>{formatRupiahCompact(dashboardStats.keuangan.total_profit)}</p>
                    </div>
                  </div>
                }
              />
            </div>
            <DashboardMetricCard label="Stok Tersedia" value={dashboardStats.unit.tersedia.toLocaleString("id-ID")} description="Siap untuk transaksi" />
          </div>

          <section className="section-panel p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-jp-text dark:text-jp-text-dark">Penjualan harian</h2>
                <p className="mt-1 text-sm text-jp-muted dark:text-jp-muted-dark">Pergerakan omzet pada periode yang dipilih.</p>
              </div>
              <div className="font-mono text-xs text-jp-muted dark:text-jp-muted-dark">Omzet: {formatRupiah(totalOmzet)}</div>
            </div>
            <div className="mt-6">
              <DashboardTrendChart points={dashboardTrend ?? []} />
            </div>
          </section>

          <section className="table-wrap overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-jp-text dark:text-jp-text-dark">Transaksi terbaru</h2>
                <p className="mt-1 text-sm text-jp-muted dark:text-jp-muted-dark">Lima transaksi terakhir pada periode ini.</p>
              </div>
              <p className="font-mono text-xs text-jp-muted dark:text-jp-muted-dark">{recentTransaksi.length} data</p>
            </div>
            {recentTransaksi.length === 0 ? (
              <div className="border-t border-jp-border dark:border-jp-border-dark"><EmptyState message="Belum ada transaksi pada periode ini" iconName="transaksiSvg" /></div>
            ) : (
              <div className="overflow-x-auto border-t border-jp-border dark:border-jp-border-dark">
                <table className="w-full min-w-[760px] text-[13px]">
                  <thead className="text-left text-[11px] font-medium text-jp-muted dark:text-jp-muted-dark">
                    <tr>
                      <th className="px-5 py-3.5 font-medium sm:px-6">ID Transaksi</th>
                      <th className="px-5 py-3.5 font-medium">Kasir</th>
                      <th className="px-5 py-3.5 font-medium">Item</th>
                      <th className="px-5 py-3.5 text-right font-medium">Harga</th>
                      <th className="px-5 py-3.5 text-right font-medium">Waktu</th>
                      <th className="px-5 py-3.5 text-right font-medium sm:px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransaksi.map((transaksiEntry) => (
                      <tr key={transaksiEntry.trx_id} className="h-14 border-t border-jp-border/80 transition-colors hover:bg-jp-surface-subtle/70 dark:border-jp-border-dark dark:hover:bg-jp-surface-subtle-dark/60">
                        <td className="whitespace-nowrap px-5 font-mono text-[12px] text-jp-muted dark:text-jp-muted-dark sm:px-6">{transaksiEntry.trx_id}</td>
                        <td className="whitespace-nowrap px-5 text-jp-text dark:text-jp-text-dark">{transaksiEntry.kasir}</td>
                        <td className="max-w-[240px] truncate px-5 text-jp-text dark:text-jp-text-dark">{transaksiEntry.unit_label}</td>
                        <td className="whitespace-nowrap px-5 text-right font-mono text-[12px] font-medium tabular-nums text-jp-text dark:text-jp-text-dark">{formatRupiah(transaksiEntry.harga_jual)}</td>
                        <td className="whitespace-nowrap px-5 text-right text-[12px] text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(transaksiEntry.waktu)}</td>
                        <td className="whitespace-nowrap px-5 text-right sm:px-6"><span className="inline-flex rounded-full border border-jp-success/25 bg-jp-success/10 px-2 py-0.5 text-[10px] font-medium text-jp-success dark:text-jp-success-dark">Tercatat</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
