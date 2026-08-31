import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const nav = readFileSync(new URL("../lib/config/nav.ts", import.meta.url), "utf8");
const stock = readFileSync(new URL("./(app)/stok/page.tsx", import.meta.url), "utf8");

describe("Owner and KC workflow audit regressions", () => {
  it("exposes the preview-required Owner monitor-service destination", () => {
    expect(nav).toContain('key: "monitor-service"');
    expect(nav).toContain('href: "/monitor-service"');
  });

  it("does not advertise the forbidden tambah-unit route to Kepala Cabang", () => {
    expect(stock).toContain('STATELESS_KC_TAMBAH_UNIT_GUARD');
  });
});
