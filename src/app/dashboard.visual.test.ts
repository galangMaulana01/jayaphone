import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(new URL("./(app)/dashboard/page.tsx", import.meta.url), "utf8");
const appLayoutSource = readFileSync(new URL("./(app)/layout.tsx", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

const chartSource = readFileSync(new URL("./(app)/dashboard/_components/DashboardTrendChart.tsx", import.meta.url), "utf8");

describe("dashboard visual direction", () => {
  it("renders the commerce overview as a dark operational dashboard", () => {
    expect(dashboardSource).toContain("jp-dashboard");
    expect(dashboardSource).toContain("Ringkasan penjualan");
    expect(dashboardSource).toContain("Stok per kategori");
    expect(dashboardSource).toContain("Aktivitas terbaru");
  });

  it("uses the warm dashboard accent in its cash-flow chart", () => {
    expect(dashboardSource).toContain("accent");
    expect(chartSource).toContain("accent?: boolean");
    expect(chartSource).toContain("#ff5a1f");
  });

  it("inherits the application-wide workspace shell", () => {
    expect(appLayoutSource).toContain("app-workspace");
    expect(globalStyles).toContain(".app-workspace");
    expect(globalStyles).toContain("--workspace-accent: #ff5a1f");
    expect(globalStyles).toContain(".jp-dashboard-overview");
  });
});
