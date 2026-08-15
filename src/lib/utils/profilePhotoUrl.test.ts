import { describe, expect, it } from "vitest";
import { isProfilePhotoUrlAllowed } from "./profilePhotoUrl";

describe("isProfilePhotoUrlAllowed", () => {
  it("rejects null/undefined/empty input", () => {
    expect(isProfilePhotoUrlAllowed(null)).toBe(false);
    expect(isProfilePhotoUrlAllowed(undefined)).toBe(false);
    expect(isProfilePhotoUrlAllowed("")).toBe(false);
  });

  it("rejects unparseable URLs", () => {
    expect(isProfilePhotoUrlAllowed("not a url")).toBe(false);
  });

  it("rejects non-https protocols", () => {
    expect(isProfilePhotoUrlAllowed("http://res.cloudinary.com/photo.jpg")).toBe(false);
    expect(isProfilePhotoUrlAllowed("file:///etc/passwd")).toBe(false);
  });

  it("rejects localhost and loopback addresses (SSRF guard)", () => {
    expect(isProfilePhotoUrlAllowed("https://localhost/photo.jpg")).toBe(false);
    expect(isProfilePhotoUrlAllowed("https://127.0.0.1/photo.jpg")).toBe(false);
    expect(isProfilePhotoUrlAllowed("https://0.0.0.0/photo.jpg")).toBe(false);
  });

  it("rejects private-network IP ranges (SSRF guard)", () => {
    expect(isProfilePhotoUrlAllowed("https://10.0.0.5/photo.jpg")).toBe(false);
    expect(isProfilePhotoUrlAllowed("https://172.16.0.1/photo.jpg")).toBe(false);
    expect(isProfilePhotoUrlAllowed("https://192.168.1.1/photo.jpg")).toBe(false);
  });

  it("rejects hosts not on the allowlist", () => {
    expect(isProfilePhotoUrlAllowed("https://evil.example.com/photo.jpg")).toBe(false);
  });

  it("accepts allowlisted hosts", () => {
    expect(isProfilePhotoUrlAllowed("https://res.cloudinary.com/demo/photo.jpg")).toBe(true);
    expect(isProfilePhotoUrlAllowed("https://images.unsplash.com/photo.jpg")).toBe(true);
    expect(isProfilePhotoUrlAllowed("https://lh3.googleusercontent.com/a/photo.jpg")).toBe(true);
    expect(isProfilePhotoUrlAllowed("https://platform-lookaside.fbsbx.com/photo.jpg")).toBe(true);
  });

  it("accepts subdomains of allowlisted hosts", () => {
    expect(isProfilePhotoUrlAllowed("https://sub.res.cloudinary.com/photo.jpg")).toBe(true);
  });

  it("rejects lookalike hosts that merely contain the allowlisted suffix as a substring", () => {
    expect(isProfilePhotoUrlAllowed("https://res.cloudinary.com.evil.com/photo.jpg")).toBe(false);
    expect(isProfilePhotoUrlAllowed("https://notres.cloudinary.com/photo.jpg")).toBe(false);
  });
});
