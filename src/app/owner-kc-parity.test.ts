import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(new URL("./(app)/dashboard/page.tsx", import.meta.url), "utf8");
const chartSource = readFileSync(new URL("./(app)/dashboard/_components/DashboardTrendChart.tsx", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const appLayoutSource = readFileSync(new URL("./(app)/layout.tsx", import.meta.url), "utf8");
const headerSource = readFileSync(new URL("../components/layout/AppHeader.tsx", import.meta.url), "utf8");
const sidebarSource = readFileSync(new URL("../components/layout/Sidebar.tsx", import.meta.url), "utf8");

describe("Owner and kepala cabang Superdesign parity", () => {
  it("uses the reference's six-metric dashboard, sales trend, recent transaction table, and branch performance panel", () => {
    expect(dashboardSource).toContain("owner-kc-dashboard");
    expect(dashboardSource).toContain("Poin Customer");
    expect(dashboardSource).toContain("Performa cabang");
    expect(dashboardSource).toContain("Penjualan harian");
  });

  it("uses the indigo reference chart rather than the retired orange commerce accent", () => {
    expect(chartSource).toContain("#4F46E5");
    expect(chartSource).not.toContain("#ff5a1f");
  });

  it("applies the preview's light indigo workspace palette to shell, cards, and active navigation", () => {
    expect(globalStyles).toContain("--workspace-accent: #4F46E5");
    expect(globalStyles).toContain("background: #F5F7FC");
    expect(globalStyles).toContain(".owner-kc-dashboard");
    expect(appLayoutSource).toContain("bg-[#F5F7FC]");
    expect(headerSource).toContain("bg-white");
    expect(sidebarSource).toContain("bg-white");
  });
});
