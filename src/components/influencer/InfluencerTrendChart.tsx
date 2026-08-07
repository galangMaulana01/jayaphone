"use client";

import { useMemo } from "react";
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import { useTheme } from "@/contexts/ThemeContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCompactNumber } from "@/lib/utils/formatters";
import type { InfluencerDashboardStats } from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface InfluencerTrendChartProps {
  points: InfluencerDashboardStats["trend_views"];
}

/** GAP-011 (LEGACY_GAP_ANALYSIS.md) — replaces the custom flexbox/div bar
 * chart with a real Chart.js bar chart (matching DashboardTrendChart's and
 * KaryawanStatsChart's pattern), restoring proper hover tooltips/axis labels
 * that the `title` attribute couldn't provide. */
export function InfluencerTrendChart({ points }: InfluencerTrendChartProps): JSX.Element {
  const { currentTheme } = useTheme();

  const chartData = useMemo<ChartData<"bar">>(() => ({
    labels: points.map((point) => point.tanggal || point.minggu || point.periode || "-"),
    datasets: [{
      label: "Views",
      data: points.map((point) => point.views),
      backgroundColor: currentTheme === "dark" ? "rgba(250, 250, 250, 0.75)" : "rgba(23, 23, 23, 0.8)",
      borderRadius: 4,
    }],
  }), [currentTheme, points]);

  const chartOptions = useMemo<ChartOptions<"bar">>(() => {
    const mutedColor = currentTheme === "dark" ? "#A1A1AA" : "#6F706F";
    const gridColor = currentTheme === "dark" ? "rgba(161, 161, 170, 0.14)" : "rgba(111, 112, 111, 0.12)";
    const tooltipBackground = currentTheme === "dark" ? "#141416" : "#161618";

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBackground,
          displayColors: false,
          padding: 10,
          callbacks: { label: (context) => `${formatCompactNumber(Number(context.parsed.y ?? 0))} views` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: mutedColor, font: { size: 10 }, maxRotation: 0, autoSkipPadding: 12 },
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: mutedColor, font: { size: 10 }, callback: (value) => formatCompactNumber(Number(value)) },
        },
      },
    };
  }, [currentTheme]);

  if (points.length === 0) {
    return <EmptyState message="Belum ada data video" iconName="chartSvg" />;
  }

  return <div className="h-56"><Bar data={chartData} options={chartOptions} /></div>;
}
