import { describe, expect, it } from "vitest";
import {
  formatCompactNumber,
  formatDateTimeShort,
  formatNumberGrouped,
  formatRupiah,
  formatRupiahCompact,
  getStockAgeInfo,
  truncate,
} from "./formatters";

describe("formatRupiah", () => {
  it("formats a positive amount with thousand separators", () => {
    expect(formatRupiah(1_500_000)).toBe("Rp 1.500.000");
  });
  it("defaults null/undefined to Rp 0", () => {
    expect(formatRupiah(null)).toBe("Rp 0");
    expect(formatRupiah(undefined)).toBe("Rp 0");
  });
});

describe("formatDateTimeShort", () => {
  it("returns an empty string for null/undefined/invalid input", () => {
    expect(formatDateTimeShort(null)).toBe("");
    expect(formatDateTimeShort(undefined)).toBe("");
    expect(formatDateTimeShort("not-a-date")).toBe("");
  });
  it("formats a valid ISO string as dd MMM yyyy HH:mm", () => {
    const formatted = formatDateTimeShort("2026-08-07T10:30:00Z");
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/Agu|Aug/);
  });
});

describe("formatNumberGrouped", () => {
  it("groups thousands without a currency prefix", () => {
    expect(formatNumberGrouped(1_234_567)).toBe("1.234.567");
  });
  it("defaults null/undefined to 0", () => {
    expect(formatNumberGrouped(null)).toBe("0");
  });
});

describe("truncate", () => {
  it("leaves short strings untouched", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });
  it("truncates long strings with an ellipsis, respecting maxLength", () => {
    const result = truncate("hello world", 5);
    expect(result).toBe("hell…");
    expect(result.length).toBe(5);
  });
});

describe("formatCompactNumber", () => {
  it("leaves values below 1.000 exact", () => {
    expect(formatCompactNumber(540)).toBe("540");
  });
  it("abbreviates thousands as rb", () => {
    expect(formatCompactNumber(54_000)).toBe("54rb");
  });
  it("abbreviates millions as jt, trimming whole numbers", () => {
    expect(formatCompactNumber(1_000_000)).toBe("1jt");
    expect(formatCompactNumber(128_400_000)).toBe("128.4jt");
  });
  it("abbreviates billions as M", () => {
    expect(formatCompactNumber(1_500_000_000)).toBe("1.5M");
  });
});

describe("formatRupiahCompact", () => {
  it("uses the exact rupiah format below 1.000", () => {
    expect(formatRupiahCompact(500)).toBe("Rp 500");
  });
  it("abbreviates large amounts with the Rp prefix", () => {
    expect(formatRupiahCompact(1_500_000)).toBe("Rp 1.5jt");
  });
});

describe("getStockAgeInfo", () => {
  it("returns a neutral dash for missing/invalid dates", () => {
    expect(getStockAgeInfo(null)).toEqual({ label: "—", tone: "neutral" });
    expect(getStockAgeInfo(undefined)).toEqual({ label: "—", tone: "neutral" });
    expect(getStockAgeInfo("not-a-date")).toEqual({ label: "—", tone: "neutral" });
  });

  function daysAgo(days: number): string {
    const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  it("classifies under 30 days as success", () => {
    expect(getStockAgeInfo(daysAgo(5)).tone).toBe("success");
  });
  it("classifies 30-60 days as warning", () => {
    expect(getStockAgeInfo(daysAgo(45)).tone).toBe("warning");
  });
  it("classifies over 60 days as danger", () => {
    expect(getStockAgeInfo(daysAgo(90)).tone).toBe("danger");
  });
  it("parses the backend's space-separated date format (not just ISO 'T')", () => {
    const info = getStockAgeInfo(daysAgo(10));
    expect(info.label).toMatch(/^\d+ hari$/);
  });
});
