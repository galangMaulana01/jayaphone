// Date-range filter state + helpers.
//
// Ported from the legacy `currentFilter` global + `getDateFilterParams()`
// in index.html.bak. FBUG-002 was the root-cause fix that made presets
// always emit explicit `date_from`/`date_to` (some endpoints only understand
// dates, not the `hari` shorthand) — the same logic is preserved here.

export type DateFilterPreset = "7d" | "30d" | "90d" | "1y" | "custom";

export interface DateFilterState {
  preset: DateFilterPreset;
  /** YYYY-MM-DD (local); only meaningful when `preset === "custom"`. */
  start: string | null;
  end: string | null;
}

/** Sensible default: last 30 days. */
export function createDefaultDateFilter(): DateFilterState {
  return { preset: "30d", start: null, end: null };
}

const presetDaysMapping: Record<Exclude<DateFilterPreset, "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

/**
 * YYYY-MM-DD in local time (matches the <input type="date"> value format;
 * avoids toISOString()'s UTC shift landing on the wrong calendar day).
 */
function formatLocalDate(dateValue: Date): string {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convert a filter state to backend query params. Preset tabs are converted
 * to explicit `date_from`/`date_to` because most list/stats endpoints don't
 * recognize `hari` (backend BUG-002 root-cause fix).
 */
export function toApiQueryParams(filterState: DateFilterState): { date_from: string; date_to: string } {
  if (filterState.preset === "custom" && filterState.start && filterState.end) {
    return { date_from: filterState.start, date_to: filterState.end };
  }
  const presetKey = filterState.preset === "custom" ? "30d" : filterState.preset;
  const numberOfDays = presetDaysMapping[presetKey];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (numberOfDays - 1));
  return { date_from: formatLocalDate(startDate), date_to: formatLocalDate(endDate) };
}
