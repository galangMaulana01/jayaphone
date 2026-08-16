"use client";

import { useCallback, useEffect, useState, type DependencyList } from "react";
import { ApiError } from "@/lib/api";
import type { PaginatedApiEnvelope } from "@/lib/types";

export interface UsePaginatedApiListResult<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  error: string;
  total: number;
  hasMore: boolean;
  /** Re-fetches page 1, discarding any pages loaded via `loadMore`. */
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * `useApiList`'s sibling for endpoints that support `skip`/`limit` and return
 * a `PaginatedApiEnvelope` (with `total`). Pages accumulate into `items` as
 * `loadMore` is called — this app has no "page N of M" UI anywhere, so
 * "load more" (append, never replace) is the shape every list page needs.
 */
export function usePaginatedApiList<T>(
  fetchPage: (skip: number, limit: number) => Promise<PaginatedApiEnvelope<T[]>>,
  deps: DependencyList,
  fallbackErrorMessage = "Gagal memuat data",
  pageSize = DEFAULT_PAGE_SIZE,
): UsePaginatedApiListResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` stands in for `fetchPage`'s closure, same convention as useApiList.
  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const envelope = await fetchPage(0, pageSize);
      setItems(envelope.data ?? []);
      setTotal(envelope.total ?? (envelope.data ?? []).length);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : fallbackErrorMessage);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async (): Promise<void> => {
    setLoadingMore(true);
    try {
      const envelope = await fetchPage(items.length, pageSize);
      const nextPage = envelope.data ?? [];
      setItems((current) => [...current, ...nextPage]);
      setTotal(envelope.total ?? items.length + nextPage.length);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : fallbackErrorMessage);
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-created each render so it always resumes from the current `items.length`.
  }, [fetchPage, items.length, pageSize, fallbackErrorMessage]);

  return { items, loading, loadingMore, error, total, hasMore: items.length < total, reload, loadMore };
}
