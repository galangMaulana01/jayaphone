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
}

export function DashboardTrendChart({ points }: DashboardTrendChartProps): JSX.Element {
  const { currentTheme } = useTheme();

  const chartData = useMemo<ChartData<"line">>(() => ({
    labels: points.map((point) => point.tanggal),
    datasets: [{
      label: "Omzet",
      data: points.map((point) => point.omzet),
      borderColor: "#4FD1C5",
      borderWidth: 2,
      pointBackgroundColor: "#4FD1C5",
      pointBorderColor: currentTheme === "dark" ? "#141416" : "#FFFFFF",
      pointBorderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0.32,
      fill: false,
    }],
  }), [currentTheme, points]);

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
          titleFont: { family: "var(--font-geist-sans)", size: 12, weight: 600 },
          bodyFont: { family: "var(--font-geist-mono)", size: 11 },
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
          grid: { color: gridColor, drawTicks: false },
          ticks: {
            color: mutedColor,
            font: { family: "var(--font-geist-mono)", size: 10 },
            padding: 10,
            callback: (value) => formatRupiah(Number(value)),
          },
        },
      },
    };
  }, [currentTheme]);

  if (points.length === 0) {
    return <EmptyState message="Belum ada transaksi pada periode ini" iconName="chartSvg" />;
  }

  return <div className="h-64 md:h-72"><Line data={chartData} options={chartOptions} /></div>;
}
