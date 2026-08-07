// Small, side-effect-free formatters used across the UI.
//
// Rules for this file: no React imports, no browser APIs, no state — every
// function here is pure and unit-testable in isolation.

/** Formats a number as an Indonesian rupiah value (e.g. `Rp 1.500.000`). */
export function formatRupiah(amount: number | null | undefined): string {
  const safeAmount = Number(amount ?? 0);
  return `Rp ${safeAmount.toLocaleString("id-ID")}`;
}

/** Format an ISO/Date value as `dd MMM yyyy HH:mm` in Asia/Jakarta locale. */
export function formatDateTimeShort(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const dateObject = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(dateObject.getTime())) return "";
  return dateObject.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

/** `1234567` → `1.234.567` (thousand-grouped, no currency prefix). */
export function formatNumberGrouped(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("id-ID");
}

/** Truncate a long string with an ellipsis (used in table cells). */
export function truncate(inputText: string, maxLength: number): string {
  if (inputText.length <= maxLength) return inputText;
  return `${inputText.slice(0, Math.max(0, maxLength - 1))}…`;
}

/**
 * Compact large magnitudes to prevent overflow in fixed-width hero/stat
 * cards — `1500000000` → `1.5M`, `128400000` → `128.4jt`, `54000` → `54rb`.
 * Below 1.000 falls back to the exact number (no abbreviation needed).
 * One decimal max, trimmed when it's a whole number (`1jt`, not `1.0jt`).
 */
function compactSuffix(value: number): { divided: number; suffix: string } {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return { divided: value / 1_000_000_000, suffix: "M" };
  if (abs >= 1_000_000) return { divided: value / 1_000_000, suffix: "jt" };
  if (abs >= 1_000) return { divided: value / 1_000, suffix: "rb" };
  return { divided: value, suffix: "" };
}

function formatCompactDigits(value: number): string {
  const { divided, suffix } = compactSuffix(value);
  if (!suffix) return divided.toLocaleString("id-ID");
  const rounded = Math.round(divided * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}${suffix}`;
}

/** `1234567` → `1.2jt` (no currency prefix). Exact value below 1.000. */
export function formatCompactNumber(value: number | null | undefined): string {
  return formatCompactDigits(Number(value ?? 0));
}

/** `1234567` → `Rp 1.2jt` — same abbreviation rules as formatCompactNumber. */
export function formatRupiahCompact(amount: number | null | undefined): string {
  const safeAmount = Number(amount ?? 0);
  if (Math.abs(safeAmount) < 1_000) return formatRupiah(safeAmount);
  return `Rp ${formatCompactDigits(safeAmount)}`;
}
