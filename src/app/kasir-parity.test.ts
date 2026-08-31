import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stokKasir = readFileSync(new URL("./(app)/stok-kasir/page.tsx", import.meta.url), "utf8");
const transaksi = readFileSync(new URL("./(app)/input-transaksi/page.tsx", import.meta.url), "utf8");
const tambahUnit = readFileSync(new URL("./(app)/tambah-unit/page.tsx", import.meta.url), "utf8");
const approvalCod = readFileSync(new URL("./(app)/approval-cod/page.tsx", import.meta.url), "utf8");

describe("Kasir Superdesign parity and flow contract", () => {
  it("uses the reference stock workspace composition", () => {
    expect(stokKasir).toContain("kasir-stock-page");
    expect(stokKasir).toContain("Unit Siap Dijual");
    expect(stokKasir).toContain("Unit Dalam Service");
    expect(stokKasir).toContain("Foto");
  });

  it("preserves the cashier's transaction, intake, and approval resolution paths", () => {
    expect(transaksi).toContain("Konfirmasi Transaksi");
    expect(tambahUnit).toContain("Unit berhasil ditambahkan");
    expect(approvalCod).toContain("Kategori dan Kondisi Awal");
  });
});
