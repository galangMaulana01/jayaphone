import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(new URL("./(app)/dashboard/page.tsx", import.meta.url), "utf8");
const chartSource = readFileSync(new URL("./(app)/dashboard/_components/DashboardTrendChart.tsx", import.meta.url), "utf8");

describe("dashboard visual direction", () => {
  it("renders the Owner/Kepala Cabang Superdesign dashboard composition", () => {
    expect(dashboardSource).toContain("owner-kc-dashboard");
    expect(dashboardSource).toContain("Poin Customer");
    expect(dashboardSource).toContain("Penjualan harian");
    expect(dashboardSource).toContain("Performa cabang");
  });

  it("uses the indigo reference trend line", () => {
    expect(chartSource).toContain("#4F46E5");
    expect(chartSource).not.toContain("#ff5a1f");
  });
});
