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
