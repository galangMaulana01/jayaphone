"use client";

import { useCallback, useEffect, useState, type DependencyList, type Dispatch, type SetStateAction } from "react";
import { ApiError } from "@/lib/api";

export interface UseApiListResult<T> {
  items: T[];
  setItems: Dispatch<SetStateAction<T[]>>;
  loading: boolean;
  error: string;
  /** Re-runs `fetcher`. Call after a create/update/delete to refresh the list. */
  reload: () => Promise<void>;
}

/**
 * Collapses the `items`/`loading`/`error` + fetch-on-mount boilerplate that
 * was hand-written, nearly identically, on every list page in this app
 * (Stok, Transaksi, Karyawan, Sparepart, Customers, ...). `fetcher` should
 * resolve to the array of items already unwrapped from the API envelope,
 * e.g. `() => Api.customer.list({ status }).then((r) => r.data ?? [])`.
 *
 * `deps` drives when `reload` re-runs, exactly like the `useCallback` deps
 * array each page wrote by hand before — pass whatever the fetcher closes
 * over (filters, page params, etc.).
 */
export function useApiList<T>(
  fetcher: () => Promise<T[]>,
  deps: DependencyList,
  fallbackErrorMessage = "Gagal memuat data",
): UseApiListResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` is the caller's own dependency list, standing in for `fetcher`'s closure.
  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetcher());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : fallbackErrorMessage);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, setItems, loading, error, reload };
}
