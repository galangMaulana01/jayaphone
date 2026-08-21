"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { CabangFilter } from "@/components/ui/CabangFilter";
import { DateFilterBar } from "@/components/ui/DateFilterBar";
import { createDefaultDateFilter, toApiQueryParams } from "@/lib/utils/dateFilter";
import { formatDateTimeShort, formatRupiah, formatRupiahCompact } from "@/lib/utils/formatters";
import type { DashboardStats, DashboardTrend, DashboardTrendPoint } from "@/lib/types";

const DashboardTrendChart = dynamic(
  () => import("./_components/DashboardTrendChart").then((module) => module.DashboardTrendChart),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-[18px] bg-white/10 md:h-72" /> },
);

interface DashboardMetricCardProps {
  label: string;
  value: string | number;
  description: string;
  accent?: boolean;
}

function DashboardMetricCard({ label, value, description, accent = false }: DashboardMetricCardProps): JSX.Element {
  return (
    <section className={"jp-dashboard-metric " + (accent ? "jp-dashboard-metric-accent" : "")}>
      <p>{label}</p>
      <strong className="tabular-nums">{value}</strong>
      <span>{description}</span>
    </section>
  );
}

function normaliseTrendPoints(trendResponse: DashboardTrend): DashboardTrendPoint[] {
  if (Array.isArray(trendResponse.trend)) return trendResponse.trend;
  const labels = Array.isArray(trendResponse.labels) ? trendResponse.labels : [];
  const revenue = Array.isArray(trendResponse.revenue) ? trendResponse.revenue : [];
  const profit = Array.isArray(trendResponse.profit) ? trendResponse.profit : [];
  const jumlah = Array.isArray(trendResponse.jumlah) ? trendResponse.jumlah : [];
  return labels.map((tanggal, index) => ({ tanggal, omzet: revenue[index] ?? 0, profit: profit[index] ?? 0, jumlah: jumlah[index] ?? 0 }));
}

export default function DashboardPage(): JSX.Element {
  const { user: currentUser } = useAuth();
  const cabangTz = useCabangTimezones();
  const [dateFilterState, setDateFilterState] = useState(createDefaultDateFilter);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [dashboardTrend, setDashboardTrend] = useState<DashboardTrendPoint[] | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchErrorMessage, setFetchErrorMessage] = useState("");
  const [selectedCabangFilter, setSelectedCabangFilter] = useState("");
  const isOwner = currentUser?.role === "owner";
  const filterQueryParams = useMemo(
    () => ({ ...toApiQueryParams(dateFilterState), cabang: isOwner && selectedCabangFilter ? selectedCabangFilter : undefined }),
    [dateFilterState, isOwner, selectedCabangFilter],
  );

  const loadDashboardData = useCallback(async (): Promise<void> => {
    setIsFetching(true);
    setFetchErrorMessage("");
    try {
      const [statsResult, trendResult] = await Promise.allSettled([Api.dashboard.stats(filterQueryParams), Api.dashboard.trend(filterQueryParams)]);
      if (statsResult.status === "rejected") throw new Error(statsResult.reason instanceof ApiError ? statsResult.reason.message : "Gagal memuat dashboard");
      setDashboardStats(statsResult.value.data);
      setDashboardTrend(trendResult.status === "fulfilled" ? normaliseTrendPoints(trendResult.value.data) : null);
    } catch (loadError) {
      setFetchErrorMessage(loadError instanceof Error ? loadError.message : "Gagal memuat dashboard");
    } finally {
      setIsFetching(false);
    }
  }, [filterQueryParams]);

  useEffect(() => { void loadDashboardData(); }, [loadDashboardData]);

  const totalTerjual = dashboardStats?.unit.terjual ?? dashboardStats?.unit.sold ?? 0;
  const totalOmzet = dashboardStats?.keuangan.total_omzet ?? dashboardStats?.keuangan.total_revenue ?? 0;
  const recentTransaksi = dashboardStats?.recent_transaksi ?? [];

  return (
    <div className="jp-page jp-dashboard">
      <header className="jp-dashboard-header">
        <div>
          <p className="jp-dashboard-eyebrow">JAYAPHONE · {currentUser?.cabang || "SEMUA CABANG"}</p>
          <h1>Ringkasan penjualan</h1>
          <p>Awasi omzet, ketersediaan unit, dan transaksi terbaru dalam satu ruang kerja.</p>
        </div>
        <div className="jp-dashboard-filters">
          <DateFilterBar currentFilterState={dateFilterState} onFilterStateChange={setDateFilterState} />
          {isOwner ? <CabangFilter value={selectedCabangFilter} onChange={setSelectedCabangFilter} label="" className="min-w-[180px]" /> : null}
        </div>
      </header>

      {isFetching ? <LoadingSkeleton numberOfRows={6} /> : fetchErrorMessage ? <ErrorState message={fetchErrorMessage} onRetry={loadDashboardData} /> : dashboardStats ? (
        <>
          <section className="jp-dashboard-overview" aria-label="Ringkasan operasional">
            <article className="jp-dashboard-balance">
              <div className="jp-dashboard-card-top"><span className="jp-dashboard-icon" aria-hidden="true">Rp</span><button type="button" aria-label="Detail omzet">•••</button></div>
              <p>Total omzet</p>
              <strong className="tabular-nums">{formatRupiahCompact(totalOmzet)}</strong>
              <span>{formatRupiah(totalOmzet)} pada periode terpilih</span>
              <div className="jp-dashboard-card-footer"><span>Ringkasan penjualan</span><span aria-hidden="true">→</span></div>
            </article>
            <DashboardMetricCard label="Transaksi" value={dashboardStats.keuangan.total_transaksi.toLocaleString("id-ID")} description="Tercatat pada periode ini" />
            <DashboardMetricCard label="Unit terjual" value={totalTerjual.toLocaleString("id-ID")} description="Unit berhasil terjual" />
            <DashboardMetricCard label="Gross profit" value={formatRupiahCompact(dashboardStats.keuangan.total_profit)} description="Laba kotor terhitung" accent />
          </section>

          <section className="jp-dashboard-content-grid">
            <article className="jp-dashboard-wallet">
              <div className="jp-dashboard-section-heading"><div><h2>Stok per kategori</h2><p>Persediaan yang siap diproses oleh tim.</p></div><a href="/stok">Lihat stok <span aria-hidden="true">→</span></a></div>
              <div className="jp-dashboard-stock-grid">
                <div><span>Stok tersedia</span><strong className="tabular-nums">{dashboardStats.unit.tersedia.toLocaleString("id-ID")}</strong><small>Unit siap jual</small></div>
                <div><span>Unit terjual</span><strong className="tabular-nums">{totalTerjual.toLocaleString("id-ID")}</strong><small>Periode ini</small></div>
                <div><span>Perputaran</span><strong className="tabular-nums">{dashboardStats.keuangan.total_transaksi.toLocaleString("id-ID")}</strong><small>Total transaksi</small></div>
              </div>
            </article>

            <article className="jp-dashboard-cashflow">
              <div className="jp-dashboard-section-heading"><div><h2>Cash flow</h2><p>Pergerakan omzet pada periode yang dipilih.</p></div><span className="jp-dashboard-period">Periode aktif</span></div>
              <strong className="jp-dashboard-cash-value tabular-nums">{formatRupiahCompact(totalOmzet)}</strong>
              <div className="jp-dashboard-chart"><DashboardTrendChart points={dashboardTrend ?? []} accent /></div>
            </article>
          </section>

          <section className="jp-dashboard-table" aria-labelledby="recent-activity-heading">
            <div className="jp-dashboard-table-heading"><div><h2 id="recent-activity-heading">Aktivitas terbaru</h2><p>Transaksi terakhir pada periode aktif.</p></div><span>{recentTransaksi.length} data</span></div>
            {recentTransaksi.length === 0 ? <EmptyState message="Belum ada transaksi pada periode ini" iconName="transaksiSvg" /> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr><th>Order ID</th><th>Aktivitas</th><th>Kasir</th><th className="text-right">Nominal</th><th className="text-right">Waktu</th></tr></thead><tbody>{recentTransaksi.map((entry) => <tr key={entry.trx_id}><td className="font-mono">{entry.trx_id}</td><td>{entry.unit_label}</td><td>{entry.kasir}</td><td className="text-right font-mono">{formatRupiah(entry.harga_jual)}</td><td className="text-right">{formatDateTimeShort(entry.waktu, resolveCabangTimezone(cabangTz, entry.cabang))}</td></tr>)}</tbody></table></div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
