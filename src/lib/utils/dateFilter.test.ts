import { describe, expect, it } from "vitest";
import { createDefaultDateFilter, toApiQueryParams } from "./dateFilter";

describe("createDefaultDateFilter", () => {
  it("defaults to the 30d preset with no custom range", () => {
    expect(createDefaultDateFilter()).toEqual({ preset: "30d", start: null, end: null });
  });
});

describe("toApiQueryParams", () => {
  it("passes a custom range straight through as date_from/date_to", () => {
    const params = toApiQueryParams({ preset: "custom", start: "2026-01-01", end: "2026-01-31" });
    expect(params).toEqual({ date_from: "2026-01-01", date_to: "2026-01-31" });
  });

  it("falls back to a 30-day range if custom is selected but dates are missing", () => {
    const params = toApiQueryParams({ preset: "custom", start: null, end: null });
    const daySpan = (new Date(params.date_to).getTime() - new Date(params.date_from).getTime()) / 86_400_000;
    expect(daySpan).toBe(29);
  });

  it("converts the 7d preset into an explicit 7-day date range ending today", () => {
    const params = toApiQueryParams({ preset: "7d", start: null, end: null });
    const daySpan = (new Date(params.date_to).getTime() - new Date(params.date_from).getTime()) / 86_400_000;
    expect(daySpan).toBe(6);
  });

  it("converts the 1y preset into a 365-day range", () => {
    const params = toApiQueryParams({ preset: "1y", start: null, end: null });
    const daySpan = (new Date(params.date_to).getTime() - new Date(params.date_from).getTime()) / 86_400_000;
    expect(daySpan).toBe(364);
  });

  it("returns dates in YYYY-MM-DD format", () => {
    const params = toApiQueryParams({ preset: "90d", start: null, end: null });
    expect(params.date_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.date_to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
