import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const buttonSourcePath = new URL("../components/ui/Button.tsx", import.meta.url);
const iconButtonSourcePath = new URL("../components/ui/IconButton.tsx", import.meta.url);

function sourceOrEmpty(path: URL): string {
  try { return readFileSync(path, "utf8"); } catch { return ""; }
}

describe("universal action primitives", () => {
  it("exports a typed button with all semantic variants and loading support", () => {
    const source = sourceOrEmpty(buttonSourcePath);
    expect(source).toContain("export type ButtonVariant");
    expect(source).toContain('"primary" | "secondary" | "ghost" | "success" | "danger" | "warning"');
    expect(source).toContain("isLoading");
    expect(source).toContain("aria-busy");
  });

  it("exports an accessible icon button with a 44px touch target", () => {
    const source = sourceOrEmpty(iconButtonSourcePath);
    expect(source).toContain("export function IconButton");
    expect(source).toContain("aria-label");
    expect(source).toContain("h-11 w-11");
  });
});
