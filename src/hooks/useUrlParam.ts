"use client";

// Single source of truth for any page-level "which tab/filter/status/sort is
// active" state that the sidebar can also deep-link into (?tab=, ?status=,
// ?filter=, ?sort=).
//
// The bug this replaces: every affected page used to read
// `window.location.search` once in a `useEffect(() => {...}, [])` on mount,
// then track the active tab in local `useState`. That works for a full page
// load, but Next's App Router does NOT remount a page component for a
// same-route, query-only navigation (e.g. the sidebar's "Untuk Dijual" child
// to its "Riwayat" sibling, both on /sparepart) — so the mount-only effect
// never re-ran, and the page's own segmented control kept showing the OLD
// tab while the sidebar (which reacts to the URL on every render) correctly
// highlighted the NEW child. One URL was rendering two different UI states.
//
// `useSearchParams()` is the actual fix: it subscribes to query-string
// changes regardless of how the navigation happened (Link click, router.push,
// back/forward, or a full reload), so the derived tab value is always exactly
// what the URL says — no separate state to fall out of sync. Every caller
// must render inside a <Suspense> boundary (Next's app-router requirement for
// any component that reads useSearchParams during static generation); since
// these pages are 100% client-fetched already, the boundary has no visible
// loading-flash cost.
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Reads `paramName` from the URL, validated against `validValues` (falls
 * back to `defaultValue` if missing/invalid). The setter pushes a new
 * history entry with the param updated — omitting it entirely when set back
 * to the default, so the "default" tab's URL stays clean (e.g. `/sparepart`,
 * not `/sparepart?tab=tersedia`). Every other existing query param is
 * preserved untouched.
 */
export function useUrlParam<T extends string>(paramName: string, validValues: readonly T[], defaultValue: T): [T, (nextValue: T) => void] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const rawValue = searchParams.get(paramName);
  const currentValue = (rawValue && (validValues as readonly string[]).includes(rawValue) ? rawValue : defaultValue) as T;

  const setValue = useCallback(
    (nextValue: T) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (nextValue === defaultValue) nextParams.delete(paramName);
      else nextParams.set(paramName, nextValue);
      const queryString = nextParams.toString();
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
    },
    [searchParams, pathname, router, paramName, defaultValue],
  );

  return [currentValue, setValue];
}
