// Profile-photo URL allowlist — preserves the H8 SSRF protection from
// the legacy `isValidProfilePhotoUrl` helper in index.html.bak.
//
// A rendered <img src=...> from user-controlled data is only a mild concern
// (no fetch executes on our server), but the original app used this to also
// gate what the sidebar avatar renders vs. falling back to the local SVG,
// so we preserve the behavior verbatim.

const ALLOWED_HOST_SUFFIXES: readonly string[] = [
  "res.cloudinary.com",
  "images.unsplash.com",
  "lh3.googleusercontent.com",
  "platform-lookaside.fbsbx.com",
];

const PRIVATE_IP_REGEX =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})$/;

export function isProfilePhotoUrlAllowed(candidateUrl: string | null | undefined): boolean {
  if (!candidateUrl) return false;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(candidateUrl);
  } catch {
    return false;
  }
  if (parsedUrl.protocol !== "https:") return false;
  const hostname = parsedUrl.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") return false;
  if (PRIVATE_IP_REGEX.test(hostname)) return false;
  return ALLOWED_HOST_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
}
