import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appLayoutSource = readFileSync(new URL("./(app)/layout.tsx", import.meta.url), "utf8");
const headerSource = readFileSync(new URL("../components/layout/AppHeader.tsx", import.meta.url), "utf8");
const sidebarSource = readFileSync(new URL("../components/layout/Sidebar.tsx", import.meta.url), "utf8");

describe("authenticated app shell Superdesign parity", () => {
  it("uses the light workspace shell and reference desktop sidebar width", () => {
    expect(appLayoutSource).toContain("bg-[#F5F7FC]");
    expect(appLayoutSource).toContain("w-[260px]");
    expect(headerSource).toContain("bg-white");
    expect(sidebarSource).toContain("bg-white");
  });

  it("uses indigo active navigation while retaining accessible mobile navigation", () => {
    expect(sidebarSource).toContain("bg-[#EEF0FF]");
    expect(sidebarSource).toContain("text-[#4F46E5]");
    expect(headerSource).toContain('aria-controls="mobile-navigation"');
    expect(appLayoutSource).toContain('id="mobile-navigation"');
  });
});
