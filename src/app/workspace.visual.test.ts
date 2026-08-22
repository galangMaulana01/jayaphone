import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appLayoutSource = readFileSync(new URL("./(app)/layout.tsx", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const tailwindConfig = readFileSync(new URL("../../tailwind.config.ts", import.meta.url), "utf8");

function classRule(className: string) {
  const match = globalStyles.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`));
  expect(match, `expected .${className} rule`).not.toBeNull();
  return match![1];
}

describe("application-wide commerce workspace", () => {
  it("applies one dark workspace shell to every authenticated route", () => {
    expect(appLayoutSource).toContain("app-workspace");
    expect(appLayoutSource).not.toContain("isDashboardRoute");
    expect(globalStyles).toContain(".app-workspace");
    expect(globalStyles).toContain("background: #111112 !important");
    expect(globalStyles).toContain("background: #151516 !important");
    expect(globalStyles).toContain("background: #1c1c1d");
  });

  it("defines one orange action token for actions, fields, and selection", () => {
    expect(tailwindConfig).toContain('action: "#FF5A1F"');
    expect(globalStyles).toContain("focus-visible:ring-jp-action");
    expect(globalStyles).toContain("focus:border-jp-action");
    expect(globalStyles).toContain("bg-jp-action/20");
  });

  it("keeps standard buttons to orange primary, neutral secondary, and transparent ghost", () => {
    const primary = classRule("app-workspace .btn-primary");
    const ghost = classRule("app-workspace .btn-ghost");
    const neutralAliasRule = globalStyles.match(
      /\.app-workspace \.btn-secondary,\s*\.app-workspace \.btn-success,\s*\.app-workspace \.btn-error,\s*\.app-workspace \.btn-warning\s*\{([^}]*)\}/,
    );

    expect(primary).toContain("background: var(--workspace-accent)");
    expect(primary).toContain("color: white");
    expect(neutralAliasRule, "expected neutral legacy action aliases").not.toBeNull();
    expect(neutralAliasRule![1]).toContain("background: #f8f7f5");
    expect(neutralAliasRule![1]).toContain("color: #111112");
    expect(ghost).toContain("background: transparent");
  });

  it("does not apply teal, red, or yellow semantic fills to action buttons", () => {
    const actionButtonRules = [...globalStyles.matchAll(/[^}]*\.btn-(?:primary|secondary|success|error|warning|ghost)[^{]*\{([^}]*)\}/g)]
      .map((match) => match[1])
      .join("\n");

    expect(actionButtonRules).not.toMatch(/jp-teal|jp-danger|jp-warning|#32201f|#492624|#6f3533/i);
  });

  it("does not apply a broad workspace button hover", () => {
    expect(globalStyles).not.toMatch(/^\s*\.app-workspace\s+button:hover\s*\{/m);
  });

  it("normalizes panels, tables, fields, badges, and dashboard namespace across routes", () => {
    expect(globalStyles).toContain(".app-workspace .section-panel");
    expect(globalStyles).toContain(".app-workspace .table-wrap");
    expect(globalStyles).toContain(".app-workspace .metric-card");
    expect(globalStyles).toContain(".app-workspace .badge");
    expect(globalStyles).toContain(".jp-dashboard");
  });
});
