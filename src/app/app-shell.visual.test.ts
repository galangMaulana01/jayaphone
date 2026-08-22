import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appLayoutSource = readFileSync(new URL("./(app)/layout.tsx", import.meta.url), "utf8");
const headerSource = readFileSync(new URL("../components/layout/AppHeader.tsx", import.meta.url), "utf8");
const sidebarSource = readFileSync(new URL("../components/layout/Sidebar.tsx", import.meta.url), "utf8");

describe("authenticated app shell visual direction", () => {
  it("uses a fixed charcoal workspace with a compact dark chrome", () => {
    expect(appLayoutSource).toContain("bg-[#17191d]");
    expect(headerSource).toContain("bg-[#1d2026]");
    expect(sidebarSource).toContain("bg-[#1d2026]");
    expect(appLayoutSource).toContain("md:py-6");
  });

  it("reserves orange for the active navigation state and removes the theme control", () => {
    expect(sidebarSource).toContain("bg-[#ff5a1f]");
    expect(sidebarSource).toContain("ring-[#ff5a1f]/35");
    expect(headerSource).not.toContain("useTheme");
    expect(headerSource).not.toContain("toggleTheme");
    expect(headerSource).not.toContain("Ubah ke tema");
  });

  it("keeps the contextual header title and accessible mobile drawer controls", () => {
    expect(headerSource).toContain("pageMetadataByKey[currentPageKey]?.title");
    expect(headerSource).toContain('aria-controls="mobile-navigation"');
    expect(appLayoutSource).toContain('id="mobile-navigation"');
    expect(appLayoutSource).toContain('role="dialog"');
    expect(appLayoutSource).toContain('aria-modal="true"');
    expect(sidebarSource).toContain('aria-label="Tutup menu"');
  });
});
