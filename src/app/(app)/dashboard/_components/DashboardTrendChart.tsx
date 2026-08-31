"use client";

import { useMemo } from "react";
import { CategoryScale, Chart as ChartJS, Filler, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRupiah } from "@/lib/utils/formatters";
import type { DashboardTrendPoint } from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface DashboardTrendChartProps {
  points: DashboardTrendPoint[];
}

export function DashboardTrendChart({ points }: DashboardTrendChartProps): JSX.Element {
  const chartData = useMemo<ChartData<"line">>(() => ({
    labels: points.map((point) => point.tanggal),
    datasets: [{
      label: "Omzet",
      data: points.map((point) => point.omzet),
      borderColor: "#4F46E5",
      backgroundColor: "rgba(79, 70, 229, 0.06)",
      borderWidth: 3,
      pointBackgroundColor: "#4F46E5",
      pointBorderColor: "#FFFFFF",
      pointBorderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.38,
      fill: true,
    }],
  }), [points]);

  const chartOptions = useMemo<ChartOptions<"line">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#162D68",
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
        ticks: { color: "#91A3D1", font: { family: "var(--font-geist-sans)", size: 11 }, maxRotation: 0, autoSkipPadding: 18 },
      },
      y: {
        display: true,
        beginAtZero: true,
        border: { display: false },
        grid: { color: "#E9EDFA", drawTicks: false },
        ticks: { display: false },
      },
    },
  }), []);

  if (!points.length || !points.some((point) => point.omzet > 0)) {
    return <EmptyState message="Belum ada transaksi pada periode ini" iconName="chartSvg" />;
  }

  return <div className="h-56 pt-4 md:h-64"><Line data={chartData} options={chartOptions} /></div>;
}
