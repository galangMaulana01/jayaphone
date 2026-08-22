import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chartSource = readFileSync(new URL("./(app)/karyawan/_components/KaryawanStatsChart.tsx", import.meta.url), "utf8");
const karyawanPageSource = readFileSync(new URL("./(app)/karyawan/page.tsx", import.meta.url), "utf8");

describe("employee statistics visual direction", () => {
  it("uses the fixed dark-workspace orange chart accent rather than the legacy teal theme", () => {
    expect(chartSource).toContain("#FF5A1F");
    expect(chartSource).not.toContain("#5FC9BE");
    expect(chartSource).not.toContain("#0B6F68");
    expect(chartSource).not.toContain("useTheme");
    expect(chartSource).toContain("#A1A1AA");
    expect(chartSource).toContain("#141416");
  });

  it("keeps Kasir and Teknisi trend labels tied to their respective API fields", () => {
    expect(chartSource).toContain('isKasir ? "Omzet" : "Service selesai"');
    expect(chartSource).toContain("isKasir ? point.omzet ?? 0 : point.selesai ?? 0");
    expect(karyawanPageSource).toContain("stats.kasir.trend_harian");
    expect(karyawanPageSource).toContain("stats.teknisi.trend_harian");
    expect(karyawanPageSource).toContain('employee.jabatan === "Kasir" || employee.jabatan === "Teknisi"');
  });

  it("retains the explicit no-data state for an empty trend", () => {
    expect(chartSource).toContain("trend.length === 0");
    expect(chartSource).toContain('message="Belum ada data dalam periode ini"');
  });
});
