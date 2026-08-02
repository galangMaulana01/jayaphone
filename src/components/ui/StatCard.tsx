// Metric summary card used on Dashboard, Laporan, Monitor Kurir, etc.
// The legacy `statCard(label, value, sub, accent, onClick)` helper mapped
// `accent` to a hard-coded icon; we mirror that mapping here.

import { Icon } from "@/lib/icons";

type StatCardAccent = "blue" | "green" | "red" | "up" | "profit" | "down" | "orange" | "purple";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: StatCardAccent;
  onClick?: () => void;
}

const accentToIconName: Record<StatCardAccent, string> = {
  blue: "tersediaSvg",
  green: "stokSvg",
  red: "modalSvg",
  up: "upSvg",
  profit: "keuntunganSvg",
  down: "downSvg",
  orange: "keranjangSvg",
  purple: "walletSvg",
};

export function StatCard({ label, value, subtitle, accent = "blue", onClick }: StatCardProps): JSX.Element {
  const isInteractive = typeof onClick === "function";
  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (keyboardEvent) => {
              if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                keyboardEvent.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`stat-card transition-all duration-200 hover:-translate-y-0.5 ${isInteractive ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="stat-icon bg-brand-teal">
          <Icon name={accentToIconName[accent]} className="h-5 w-5" />
        </div>
      </div>
      <p className="mb-1.5 text-2xl font-bold leading-none tracking-tight text-black dark:text-white">
        {value}
      </p>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">{label}</p>
      {subtitle && (
        <p className="mt-0.5 text-[11px] text-zinc-300 dark:text-zinc-600">{subtitle}</p>
      )}
    </div>
  );
}
