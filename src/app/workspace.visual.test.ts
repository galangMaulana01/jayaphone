import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appLayoutSource = readFileSync(new URL("./(app)/layout.tsx", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("application-wide Superdesign workspace palette", () => {
  it("defines one light indigo workspace surface for authenticated routes", () => {
    expect(appLayoutSource).toContain("app-workspace");
    expect(globalStyles).toContain("--workspace-accent: #4F46E5");
    expect(globalStyles).toContain("background: #F5F7FC");
    expect(globalStyles).toContain("background: #FFFFFF");
  });

  it("normalizes interactive controls, panels, tables, and status badges", () => {
    expect(globalStyles).toContain(".app-workspace .btn-primary");
    expect(globalStyles).toContain(".app-workspace .table-wrap");
    expect(globalStyles).toContain(".app-workspace .badge");
    expect(globalStyles).toContain(".owner-kc-dashboard");
  });
});
