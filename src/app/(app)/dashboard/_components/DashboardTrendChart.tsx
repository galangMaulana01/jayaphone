"use client";

import { useMemo } from "react";
import { CategoryScale, Chart as ChartJS, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import { useTheme } from "@/contexts/ThemeContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRupiah } from "@/lib/utils/formatters";
import type { DashboardTrendPoint } from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

interface DashboardTrendChartProps {
  points: DashboardTrendPoint[];
  /** The commerce dashboard uses its warm visual accent; other consumers retain teal. */
  accent?: boolean;
}

export function DashboardTrendChart({ points, accent = false }: DashboardTrendChartProps): JSX.Element {
  const { currentTheme } = useTheme();
  const lineColor = accent ? "#ff5a1f" : (currentTheme === "dark" ? "#5FC9BE" : "#0B6F68");

  const chartData = useMemo<ChartData<"line">>(() => ({
    labels: points.map((point) => point.tanggal),
    datasets: [{
      label: "Omzet",
      data: points.map((point) => point.omzet),
      borderColor: lineColor,
      borderWidth: 1.75,
      pointBackgroundColor: lineColor,
      pointBorderColor: lineColor,
      pointBorderWidth: 0,
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.28,
      fill: false,
    }],
  }), [lineColor, points]);

  const chartOptions = useMemo<ChartOptions<"line">>(() => {
    const mutedColor = currentTheme === "dark" ? "#A1A1AA" : "#6F706F";
    const gridColor = currentTheme === "dark" ? "rgba(161, 161, 170, 0.14)" : "rgba(111, 112, 111, 0.12)";
    const tooltipBackground = currentTheme === "dark" ? "#141416" : "#161618";

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBackground,
          displayColors: false,
          padding: 10,
          cornerRadius: 10,
          titleFont: { family: "var(--font-geist-sans)", size: 12, weight: 600 },
          bodyFont: { family: "var(--font-geist-sans)", size: 11 },
          callbacks: { label: (context) => formatRupiah(Number(context.parsed.y ?? 0)) },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: { color: mutedColor, font: { family: "var(--font-geist-sans)", size: 11 }, maxRotation: 0, autoSkipPadding: 18 },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: gridColor, drawTicks: false, borderDash: [4, 4] },
          ticks: {
            color: mutedColor,
            font: { family: "var(--font-geist-sans)", size: 10 },
            padding: 10,
            callback: (value) => formatRupiah(Number(value)),
          },
        },
      },
    };
  }, [currentTheme]);

  // UX-002 (UX_REVIEW_2026-08-07.md) — when every point is 0 (a branch/period
  // with no sales), Chart.js's beginAtZero auto-scale picks a 0-1 range and
  // the y-axis ticks come out as fractional Rupiah ("Rp 0,1", "Rp 0,2"...).
  // Treat all-zero the same as no-data: same empty state the rest of the
  // dashboard already uses for a quiet period, instead of a broken-looking axis.
  const hasSales = points.some((point) => point.omzet > 0);
  if (points.length === 0 || !hasSales) {
    return <EmptyState message="Belum ada transaksi pada periode ini" iconName="chartSvg" />;
  }

  return <div className="h-64 md:h-72"><Line data={chartData} options={chartOptions} /></div>;
}
