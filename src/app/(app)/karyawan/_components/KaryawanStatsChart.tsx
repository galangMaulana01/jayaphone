"use client";

import { useMemo } from "react";
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRupiahCompact } from "@/lib/utils/formatters";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface KaryawanStatsChartProps {
  trend: Array<{ tanggal: string; omzet?: number; selesai?: number }>;
  isKasir: boolean;
}

/** GAP-007 (LEGACY_GAP_ANALYSIS.md) — ports the trend bar chart from legacy's
 * `_loadKarStats` (index.html:2352-2394): omzet per day for Kasir, service
 * selesai per day for Teknisi. */
export function KaryawanStatsChart({ trend, isKasir }: KaryawanStatsChartProps): JSX.Element {
  const chartData = useMemo<ChartData<"bar">>(() => ({
    labels: trend.map((point) => point.tanggal.slice(5)),
    datasets: [{
      label: isKasir ? "Omzet" : "Service selesai",
      data: trend.map((point) => (isKasir ? point.omzet ?? 0 : point.selesai ?? 0)),
      backgroundColor: "#FF5A1F",
      borderWidth: 0,
      borderRadius: 4,
      maxBarThickness: 40,
    }],
  }), [isKasir, trend]);

  const chartOptions = useMemo<ChartOptions<"bar">>(() => {
    const mutedColor = "#A1A1AA";
    const gridColor = "rgba(161, 161, 170, 0.14)";
    const tooltipBackground = "#141416";

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBackground,
          displayColors: false,
          padding: 10,
          cornerRadius: 10,
          callbacks: { label: (context) => (isKasir ? formatRupiahCompact(Number(context.parsed.y ?? 0)) : String(context.parsed.y ?? 0)) },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: mutedColor, font: { size: 10 } },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: gridColor, borderDash: [4, 4], drawTicks: false },
          ticks: { color: mutedColor, font: { size: 10 }, callback: (value) => (isKasir ? formatRupiahCompact(Number(value)) : String(value)) },
        },
      },
    };
  }, [isKasir]);

  if (trend.length === 0) {
    return <EmptyState message="Belum ada data dalam periode ini" iconName="chartSvg" />;
  }

  return <div className="h-40"><Bar data={chartData} options={chartOptions} /></div>;
}
