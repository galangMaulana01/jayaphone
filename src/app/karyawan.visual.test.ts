import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./(app)/karyawan/page.tsx", import.meta.url), "utf8");

describe("karyawan monitoring directory", () => {
  it("uses directory filters, compact derived counts, and responsive list presentations", () => {
    expect(source).toContain("const filteredEmployees = useMemo");
    expect(source).not.toContain("roleOptions.slice(0, 2)");
    expect(source).toContain("Cari nama atau username...");
    expect(source).toContain("Semua jabatan");
    expect(source).toContain("Semua status");
    expect(source).toContain("md:hidden");
    expect(source).toContain("hidden md:block");
    expect(source).toContain("Aktif");
    expect(source).toContain("Nonaktif");
  });

  it("keeps employee actions safe and statistical requests current", () => {
    expect(source).toContain(">Lihat statistik<");
    expect(source).toContain('label: "Reset password"');
    expect(source).toContain('label: "Nonaktifkan akun"');
    expect(source).not.toContain("window.confirm");
    expect(source).toContain("statsRequestRef");
    expect(source).toContain("Tanggal sampai tidak boleh lebih awal dari tanggal dari");
    expect(source).toContain("isResetPending");
    expect(source).toContain("isDeactivatePending");
  });
});
