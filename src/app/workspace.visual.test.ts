import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appLayoutSource = readFileSync(new URL("./(app)/layout.tsx", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("application-wide commerce workspace", () => {
  it("applies one dark workspace shell to every authenticated route", () => {
    expect(appLayoutSource).toContain("app-workspace");
    expect(appLayoutSource).not.toContain("isDashboardRoute");
    expect(globalStyles).toContain(".app-workspace");
    expect(globalStyles).toContain("--workspace-accent: #ff5a1f");
  });

  it("normalizes panels, tables, fields, and badges across all routes", () => {
    expect(globalStyles).toContain(".app-workspace .section-panel");
    expect(globalStyles).toContain(".app-workspace .table-wrap");
    expect(globalStyles).toContain(".app-workspace .metric-card");
    expect(globalStyles).toContain(".app-workspace .badge");
  });

  it("defines universal primary, secondary, and danger button behavior", () => {
    expect(globalStyles).toContain(".app-workspace .btn-primary");
    expect(globalStyles).toContain(".app-workspace .btn-secondary");
    expect(globalStyles).toContain(".app-workspace .btn-error");
    expect(globalStyles).toContain("min-height: 44px");
  });
});
