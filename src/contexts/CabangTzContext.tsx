"use client";

// Cabang -> IANA timezone lookup, loaded once per session so every page can
// render a record's timestamp in its own branch's local time (e.g. a Papua
// transaction in WIT, a Java transaction in WIB) instead of a hardcoded WIB.

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_TIMEZONE } from "@/lib/utils/formatters";

export type CabangTzMap = Record<string, string>;

const CabangTzContext = createContext<CabangTzMap>({});

export function CabangTzProvider({ children }: { children: ReactNode }): JSX.Element {
  const { status } = useAuth();
  const [timezoneMap, setTimezoneMap] = useState<CabangTzMap>({});

  useEffect(() => {
    if (status !== "authenticated") return;
    void Api.cabang
      .timezones()
      .then((response) => {
        const entries = (response.data ?? []).map((c) => [c.kode, c.timezone || DEFAULT_TIMEZONE] as const);
        setTimezoneMap(Object.fromEntries(entries));
      })
      .catch(() => undefined);
  }, [status]);

  return <CabangTzContext.Provider value={timezoneMap}>{children}</CabangTzContext.Provider>;
}

/** The cabang->timezone map loaded for the current session (empty until it loads). */
export function useCabangTimezones(): CabangTzMap {
  return useContext(CabangTzContext);
}

/** Resolve one cabang code to its IANA timezone, defaulting to WIB until resolved. */
export function resolveCabangTimezone(timezoneMap: CabangTzMap, cabangKode: string | null | undefined): string {
  if (!cabangKode) return DEFAULT_TIMEZONE;
  return timezoneMap[cabangKode] || DEFAULT_TIMEZONE;
}
