// Low-level HTTP client shared by every request in the app.
//
// Mirrors the behaviour of `request()` / `uploadFile()` / `uploadFiles()` from
// the legacy main.js.bak, including its timeout handling and its bespoke
// on-401-reload behaviour (see `handleUnauthorized`). Adds:
//   • proper TypeScript types on the response envelope;
//   • a single source of truth for the base URL (env var, then fallback);
//   • a small `ApiError` class that carries the HTTP status through for
//     handlers that need to branch on it (login form, session restore, etc.).

import { tokenStorage } from "./token";

/**
 * Resolves the backend base URL.
 *
 * Precedence (highest wins):
 *   1. `NEXT_PUBLIC_BACKEND_URL` at build time
 *   2. `window.BACKEND_URL` at runtime (matches the legacy override hook so
 *      the same "point-to-my-staging" trick still works in the browser console)
 *   3. The production default `https://phonejaya.vercel.app`
 */
export function resolveBackendBaseUrl(): string {
  const envValue = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envValue && envValue.length > 0) return envValue;
  if (typeof window !== "undefined") {
    const runtimeOverride = (window as unknown as { BACKEND_URL?: string }).BACKEND_URL;
    if (runtimeOverride && runtimeOverride.length > 0) return runtimeOverride;
  }
  return "https://phonejaya.vercel.app";
}

/**
 * Every backend response is prefixed with `/api/v1` — the legacy code appended
 * this only when the base URL didn't already carry it, and we preserve that so
 * a `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api/v1` override still works.
 */
function buildFullUrl(pathWithoutPrefix: string): string {
  const baseUrl = resolveBackendBaseUrl();
  if (baseUrl.includes("/api/v1")) return `${baseUrl}${pathWithoutPrefix}`;
  return `${baseUrl}/api/v1${pathWithoutPrefix}`;
}

/** Error thrown by every function in this module on non-2xx / network failure. */
export class ApiError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * A 401 from any endpoint means "your token is no longer valid" — either
 * expired, or (post-BUG-002 backend fix) the user was deactivated. We clear
 * the token and reload so the app boots into its unauthenticated state.
 * Kept opt-outable via `options.suppressAuthReload` so the login form can
 * show "wrong password" without immediately reloading itself.
 */
function handleUnauthorized(): void {
  tokenStorage.clear();
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

/**
 * Parses a FastAPI error `detail` field into a human-readable string.
 * FastAPI's validation errors come through as an array of {msg, loc} objects
 * rather than a plain string, so the legacy code coalesced them by `msg`; we
 * do the same to preserve UX parity.
 */
function coalesceErrorDetail(errorDetail: unknown): string {
  if (typeof errorDetail === "string") return errorDetail;
  if (Array.isArray(errorDetail)) {
    return errorDetail.map((entry) => (entry && typeof entry === "object" && "msg" in entry ? String((entry as { msg: unknown }).msg) : String(entry))).join("; ");
  }
  if (errorDetail && typeof errorDetail === "object") {
    const asRecord = errorDetail as Record<string, unknown>;
    if (typeof asRecord.msg === "string") return asRecord.msg;
    if (typeof asRecord.message === "string") return asRecord.message;
    try {
      return JSON.stringify(errorDetail);
    } catch {
      return "Unknown server error";
    }
  }
  return "Terjadi kesalahan tak terduga";
}

interface RequestOptions {
  /** If true, a 401 will NOT clear the token or reload the page (used by /auth/login). */
  suppressAuthReload?: boolean;
  /** Override the 30-second timeout for slow endpoints (e.g. TikTok scraper). */
  timeoutMillis?: number;
}

/**
 * Core JSON request helper. Every typed API method in `lib/api/index.ts`
 * eventually calls this.
 */
export async function requestJson<TResult = unknown>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  pathWithoutPrefix: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<TResult> {
  const fullUrl = buildFullUrl(pathWithoutPrefix);
  const requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
  const authToken = tokenStorage.read();
  if (authToken) requestHeaders.Authorization = `Bearer ${authToken}`;

  const timeoutController = new AbortController();
  const timeoutMillis = options.timeoutMillis ?? 30_000;
  const timeoutHandle = setTimeout(() => timeoutController.abort(), timeoutMillis);

  let httpResponse: Response;
  try {
    httpResponse = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: timeoutController.signal,
    });
  } catch (fetchError) {
    clearTimeout(timeoutHandle);
    if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
      throw new ApiError(
        0,
        `Request timeout (>${Math.round(timeoutMillis / 1000)} detik). Server cold start, coba lagi.`,
      );
    }
    throw new ApiError(0, "Tidak dapat terhubung ke server. Periksa koneksi internet.");
  }
  clearTimeout(timeoutHandle);

  // Response body might be JSON, plain text, or empty — handle all three.
  let parsedBody: unknown = {};
  const contentType = httpResponse.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    parsedBody = await httpResponse.json().catch(() => ({}));
  } else {
    const rawText = await httpResponse.text().catch(() => "");
    if (!httpResponse.ok) {
      const messageLower = rawText.toLowerCase();
      if (httpResponse.status === 403 && messageLower.includes("allowlist")) {
        throw new ApiError(httpResponse.status, "Backend terkunci (Vercel Deployment Protection aktif).");
      }
      throw new ApiError(httpResponse.status, rawText || `Server error (${httpResponse.status})`);
    }
  }

  if (!httpResponse.ok) {
    if (httpResponse.status === 401 && !options.suppressAuthReload) {
      handleUnauthorized();
    }
    const envelope = parsedBody as { detail?: unknown; message?: unknown };
    const message = coalesceErrorDetail(envelope.detail ?? envelope.message ?? `Terjadi kesalahan (${httpResponse.status})`);
    throw new ApiError(httpResponse.status, message);
  }

  return parsedBody as TResult;
}

/** POST a single file as multipart/form-data. Used by ImageUploader. */
export async function uploadImageFile(pathWithoutPrefix: string, file: File): Promise<unknown> {
  const fullUrl = buildFullUrl(pathWithoutPrefix);
  const authToken = tokenStorage.read();
  const formData = new FormData();
  formData.append("file", file);

  const timeoutController = new AbortController();
  const timeoutHandle = setTimeout(() => timeoutController.abort(), 60_000);

  let httpResponse: Response;
  try {
    httpResponse = await fetch(fullUrl, {
      method: "POST",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: formData,
      signal: timeoutController.signal,
    });
  } catch (fetchError) {
    clearTimeout(timeoutHandle);
    if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
      throw new ApiError(0, "Upload timeout, coba lagi.");
    }
    throw new ApiError(0, "Tidak dapat terhubung ke server.");
  }
  clearTimeout(timeoutHandle);

  const parsedBody = (await httpResponse.json().catch(() => ({}))) as { data?: unknown; detail?: unknown; message?: unknown };
  if (!httpResponse.ok) {
    throw new ApiError(httpResponse.status, coalesceErrorDetail(parsedBody.detail ?? parsedBody.message ?? "Upload gagal"));
  }
  return parsedBody.data ?? parsedBody;
}

/**
 * POST multiple files in one multipart request. Used by pages that let a user
 * pick "before" and "after" service photos in bulk. Preserves the legacy
 * 10-file cap and 2-minute timeout.
 */
export async function uploadImageFiles(
  pathWithoutPrefix: string,
  files: File[],
  uploadType: string = "general",
  extras: { folder?: string; tags?: string; contextKey?: string; contextValue?: string } = {},
): Promise<unknown> {
  if (files.length === 0) throw new ApiError(400, "Tidak ada file");
  if (files.length > 10) throw new ApiError(400, "Maksimal 10 file per request");

  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  formData.append("upload_type", uploadType);
  if (extras.folder) formData.append("folder", extras.folder);
  if (extras.tags) formData.append("tags", extras.tags);
  if (extras.contextKey) formData.append("context_key", extras.contextKey);
  if (extras.contextValue) formData.append("context_value", extras.contextValue);

  const fullUrl = buildFullUrl(pathWithoutPrefix);
  const authToken = tokenStorage.read();

  const timeoutController = new AbortController();
  const timeoutHandle = setTimeout(() => timeoutController.abort(), 120_000);

  let httpResponse: Response;
  try {
    httpResponse = await fetch(fullUrl, {
      method: "POST",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: formData,
      signal: timeoutController.signal,
    });
  } catch (fetchError) {
    clearTimeout(timeoutHandle);
    if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
      throw new ApiError(0, "Upload timeout, coba lagi.");
    }
    throw new ApiError(0, "Tidak dapat terhubung ke server.");
  }
  clearTimeout(timeoutHandle);

  const parsedBody = (await httpResponse.json().catch(() => ({}))) as { data?: unknown; detail?: unknown; message?: unknown };
  if (!httpResponse.ok) {
    throw new ApiError(httpResponse.status, coalesceErrorDetail(parsedBody.detail ?? parsedBody.message ?? "Upload gagal"));
  }
  return parsedBody.data ?? parsedBody;
}
