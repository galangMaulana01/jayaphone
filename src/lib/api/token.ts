// JWT storage utility.
//
// The original app stored the token in `localStorage['jyp_token']`; we keep the
// same key so an existing session (from the legacy index.html.bak) still logs
// straight into the migrated Next.js app during rollout.
//
// A comment in main.js.bak flagged the intent to eventually move to httpOnly
// cookie auth to eliminate the XSS-theft window; that migration would need a
// coordinated backend change (login → Set-Cookie, refresh endpoint, CORS with
// credentials), so it's out of scope for this frontend-only pass.

const TOKEN_STORAGE_KEY = "jyp_token";

const isBrowser = (): boolean => typeof window !== "undefined";

export const tokenStorage = {
  read(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  write(nextToken: string): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
  },
  clear(): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};
