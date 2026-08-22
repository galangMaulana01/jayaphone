import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const themeSource = readFileSync(new URL("../contexts/ThemeContext.tsx", import.meta.url), "utf8");
const actionMenuSource = readFileSync(new URL("../components/ui/ActionMenu.tsx", import.meta.url), "utf8");
const modalSource = readFileSync(new URL("../components/ui/Modal.tsx", import.meta.url), "utf8");
const imageUploaderSource = readFileSync(new URL("../components/ui/ImageUploader.tsx", import.meta.url), "utf8");

describe("fixed charcoal workspace integration", () => {
  it("forces the retained theme context to dark without restoring a persisted light preference", () => {
    expect(themeSource).toContain('const FIXED_WORKSPACE_THEME: Theme = "dark"');
    expect(themeSource).not.toContain("localStorage.getItem");
    expect(themeSource).not.toContain("window.matchMedia");
  });

  it("keeps portalled menus and modal focus inside the charcoal-orange workspace contract", () => {
    expect(actionMenuSource).toContain("bg-[#1c1c1d]");
    expect(actionMenuSource).toContain("focus-visible:ring-[#ff5a1f]");
    expect(modalSource).toContain("focus-visible:ring-[#ff5a1f]");
  });

  it("does not use a red-filled delete-image control", () => {
    expect(imageUploaderSource).not.toContain("bg-jp-danger text-sm text-white");
    expect(imageUploaderSource).toContain("bg-[#ff5a1f]");
  });
});
