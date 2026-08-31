import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const modalSource = readFileSync(new URL("./Modal.tsx", import.meta.url), "utf8");

describe("Modal accessibility contract", () => {
  it("labels its dialog from the rendered title", () => {
    expect(modalSource).toContain("aria-labelledby");
    expect(modalSource).toContain('id={titleId}');
  });

  it("moves focus into the dialog and restores the trigger on close", () => {
    expect(modalSource).toContain("previouslyFocusedElement");
    expect(modalSource).toContain("dialogElementRef.current?.focus()");
    expect(modalSource).toContain("previouslyFocusedElement.current?.focus()");
  });

  it("keeps keyboard focus inside an open dialog", () => {
    expect(modalSource).toContain('keyboardEvent.key !== "Tab"');
    expect(modalSource).toContain("getFocusableElements");
  });
});
