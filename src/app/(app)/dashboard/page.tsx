"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
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
import type { DashboardStats, DashboardTrend, DashboardTrendPoint, Transaksi } from "@/lib/types";

const DashboardTrendChart = dynamic(
  () => import("./_components/DashboardTrendChart").then((module) => module.DashboardTrendChart),
  { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-2xl bg-[#F0F1FF] md:h-64" /> },
);

type MetricIcon = "money" | "receipt" | "phone" | "profit" | "box" | "star";

function MetricIconGlyph({ icon }: { icon: MetricIcon }): JSX.Element {
  const pathByIcon: Record<MetricIcon, string> = {
    money: "M4 7.5h16v9H4zM8 12h.01M16 12h.01",
    receipt: "M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21zM10 8h4M10 12h4M10 16h2",
    phone: "M9 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 15h2",
    profit: "M4 19V9m5 10V5m5 14v-7m5 7V3M3 8l5-4 5 5 7-7",
    box: "m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7m-8 4v10",
    star: "m12 3 2.7 5.5 6 .9-4.35 4.25 1.03 6L12 16.6l-5.38 2.8 1.03-6L3.3 9.4l6-.9z",
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={pathByIcon[icon]} /></svg>;
}

function DashboardMetricCard({ label, value, description, icon }: { label: string; value: string | number; description: string; icon: MetricIcon }): JSX.Element {
  return (
    <article className="owner-kc-metric">
      <div className="owner-kc-metric-icon"><MetricIconGlyph icon={icon} /></div>
      <p>{label}</p>
      <strong className="tabular-nums">{value}</strong>
      <span>{description}</span>
    </article>
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
  const [periodTransactions, setPeriodTransactions] = useState<Transaksi[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchErrorMessage, setFetchErrorMessage] = useState("");
  const [selectedCabangFilter, setSelectedCabangFilter] = useState("");
  const isOwner = currentUser?.role === "owner";
  const filterQueryParams = useMemo(
    () => ({ ...toApiQueryParams(dateFilterState), cabang: isOwner ? selectedCabangFilter || undefined : currentUser?.role === "kepala_cabang" ? currentUser.cabang : undefined }),
    [dateFilterState, isOwner, selectedCabangFilter, currentUser?.role, currentUser?.cabang],
  );

  const loadDashboardData = useCallback(async (): Promise<void> => {
    setIsFetching(true);
    setFetchErrorMessage("");
    try {
      const [statsResult, trendResult, transactionsResult] = await Promise.allSettled([
        Api.dashboard.stats(filterQueryParams),
        Api.dashboard.trend(filterQueryParams),
        Api.transaksi.list({ ...filterQueryParams, limit: 100 }),
      ]);
      if (statsResult.status === "rejected") throw new Error(statsResult.reason instanceof ApiError ? statsResult.reason.message : "Gagal memuat dashboard");
      setDashboardStats(statsResult.value.data);
      setDashboardTrend(trendResult.status === "fulfilled" ? normaliseTrendPoints(trendResult.value.data) : null);
      setPeriodTransactions(transactionsResult.status === "fulfilled" ? transactionsResult.value.data : []);
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
  const branchPerformance = useMemo(() => {
    const totals = new Map<string, { count: number; omzet: number }>();
    periodTransactions.forEach((transaction) => {
      const item = totals.get(transaction.cabang) ?? { count: 0, omzet: 0 };
      item.count += 1;
      item.omzet += transaction.harga_jual;
      totals.set(transaction.cabang, item);
    });
    return [...totals.entries()].sort(([, left], [, right]) => right.omzet - left.omzet).slice(0, 3);
  }, [periodTransactions]);

  return (
    <div className="jp-page owner-kc-dashboard">
      <header className="owner-kc-dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Kondisi operasional Jayaphone pada periode yang dipilih.</p>
        </div>
        <div className="owner-kc-dashboard-filters">
          <DateFilterBar currentFilterState={dateFilterState} onFilterStateChange={setDateFilterState} />
          {isOwner ? <CabangFilter value={selectedCabangFilter} onChange={setSelectedCabangFilter} label="" className="min-w-[168px]" /> : null}
        </div>
      </header>

      {isFetching ? <LoadingSkeleton numberOfRows={6} /> : fetchErrorMessage ? <ErrorState message={fetchErrorMessage} onRetry={loadDashboardData} /> : dashboardStats ? (
        <>
          <section className="owner-kc-metric-grid" aria-label="Ringkasan operasional">
            <DashboardMetricCard label="Total Omzet" value={formatRupiahCompact(totalOmzet)} description={totalOmzet > 0 ? `${formatRupiah(totalOmzet)} pada periode ini` : "Belum ada omzet pada periode ini"} icon="money" />
            <DashboardMetricCard label="Transaksi" value={dashboardStats.keuangan.total_transaksi.toLocaleString("id-ID")} description="Transaksi pada periode ini" icon="receipt" />
            <DashboardMetricCard label="Unit Terjual" value={totalTerjual.toLocaleString("id-ID")} description={isOwner ? "Unit dari seluruh cabang" : "Unit di cabang Anda"} icon="phone" />
            <DashboardMetricCard label="Gross Profit" value={formatRupiahCompact(dashboardStats.keuangan.total_profit)} description="Margin sehat periode ini" icon="profit" />
            <DashboardMetricCard label="Stok Tersedia" value={dashboardStats.unit.tersedia.toLocaleString("id-ID")} description={isOwner ? "Siap dijual di seluruh cabang" : "Siap dijual di cabang Anda"} icon="box" />
            <DashboardMetricCard label="Poin Customer" value={(dashboardStats.keuangan.total_poin_dapat ?? 0).toLocaleString("id-ID")} description="Total poin pelanggan periode ini" icon="star" />
          </section>

          <section className="owner-kc-trend-card" aria-labelledby="sales-trend-heading">
            <div className="owner-kc-panel-heading">
              <div><h2 id="sales-trend-heading">Penjualan harian</h2><p>Pergerakan omzet pada periode yang dipilih.</p></div>
              <p className="owner-kc-trend-total">Omzet: <strong className="tabular-nums">{formatRupiah(totalOmzet)}</strong></p>
            </div>
            <DashboardTrendChart points={dashboardTrend ?? []} />
          </section>

          <section className="owner-kc-bottom-grid">
            <section className="owner-kc-table-card" aria-labelledby="recent-activity-heading">
              <div className="owner-kc-panel-heading">
                <div><h2 id="recent-activity-heading">Transaksi terbaru</h2><p>Aktivitas transaksi terbaru {isOwner ? "dari semua cabang." : "di cabang aktif."}</p></div>
                <Link href="/transaksi">Lihat semua</Link>
              </div>
              {recentTransaksi.length === 0 ? <EmptyState message="Belum ada transaksi pada periode ini" iconName="transaksiSvg" /> : (
                <div className="overflow-x-auto"><table className="owner-kc-table min-w-[690px]"><thead><tr><th>ID Transaksi</th><th>Kasir</th><th>Item</th><th>Total</th><th>Waktu</th><th>Cabang</th></tr></thead><tbody>{recentTransaksi.slice(0, 3).map((entry) => <tr key={entry.trx_id}><td className="font-mono">{entry.trx_id}</td><td>{entry.kasir}</td><td>{entry.unit_label}</td><td className="font-semibold tabular-nums">{formatRupiah(entry.harga_jual)}</td><td>{formatDateTimeShort(entry.waktu, resolveCabangTimezone(cabangTz, entry.cabang))}</td><td>{entry.cabang}</td></tr>)}</tbody></table></div>
              )}
            </section>

            <aside className="owner-kc-branch-card" aria-labelledby="branch-performance-heading">
              <div className="owner-kc-panel-heading"><div><h2 id="branch-performance-heading">Performa cabang</h2><p>Omzet dari cabang aktif.</p></div><MetricIconGlyph icon="receipt" /></div>
              {branchPerformance.length ? <div className="owner-kc-branch-list">{branchPerformance.map(([branchCode, performance]) => <div key={branchCode}><span>{branchCode}</span><p><strong>{branchCode}</strong><small>{performance.count} transaksi</small></p><b className="tabular-nums">{formatRupiahCompact(performance.omzet)}</b></div>)}</div> : <EmptyState message="Belum ada transaksi cabang" iconName="chartSvg" />}
            </aside>
          </section>
        </>
      ) : null}
    </div>
  );
}
