"use client";

import { useMemo, useState } from "react";
import { Api } from "@/lib/api";
import type { ActivityLog } from "@/lib/types";
import { CabangFilter } from "@/components/ui/CabangFilter";
import { DateFilterBar } from "@/components/ui/DateFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { createDefaultDateFilter, toApiQueryParams, type DateFilterState } from "@/lib/utils/dateFilter";
import { useAuth } from "@/contexts/AuthContext";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { usePaginatedApiList } from "@/hooks/usePaginatedApiList";
import { formatDateTimeShort, NOT_SET } from "@/lib/utils/formatters";

export default function LogPage(): JSX.Element {
  const { user } = useAuth();
  const cabangTz = useCabangTimezones();
  const isOwner = user?.role === "owner";
  const [filter, setFilter] = useState<DateFilterState>(createDefaultDateFilter());
  const [cabangFilter, setCabangFilter] = useState("");
  const [aksiFilter, setAksiFilter] = useState("");
  const [search, setSearch] = useState("");

  const {
    items, loading, loadingMore, error, total, hasMore,
    reload: load, loadMore,
  } = usePaginatedApiList<ActivityLog>(
    (skip, limit) => Api.log.list({
      ...toApiQueryParams(filter),
      cabang: isOwner ? cabangFilter || undefined : user?.cabang,
      skip,
      limit,
    }),
    [filter, cabangFilter, user],
    "Gagal memuat log aktivitas",
  );

  const aksiOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) {
      const label = item.action || item.aksi;
      if (label) seen.add(label);
    }
    return [...seen].sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const label = item.action || item.aksi || "";
      if (aksiFilter && label !== aksiFilter) return false;
      if (!q) return true;
      return `${item.user} ${label} ${item.target || item.detail || ""}`.toLowerCase().includes(q);
    });
  }, [items, search, aksiFilter]);

  return (
    <div className="jp-page">
      <div className="jp-page-header">
        <div>
          <h1 className="jp-page-title">Log Aktivitas Sistem</h1>
          <p className="text-sm text-jp-muted dark:text-jp-muted-dark">{total} entri · Audit aktivitas pengguna dan sistem</p>
        </div>
        <DateFilterBar currentFilterState={filter} onFilterStateChange={setFilter} />
      </div>

      <div className="jp-toolbar">
        <input
          className="field-control search-field w-full sm:max-w-md"
          placeholder="Cari user, aksi, atau detail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="field-control w-full text-xs sm:w-auto" value={aksiFilter} onChange={(e) => setAksiFilter(e.target.value)}>
          <option value="">Semua Aksi</option>
          {aksiOptions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        {isOwner && <CabangFilter value={cabangFilter} onChange={setCabangFilter} label="" className="min-w-[180px]" />}
      </div>

      {loading ? <LoadingSkeleton numberOfRows={6} /> : error ? <ErrorState message={error} onRetry={load} /> : (
        <div className="log-list">
          {filtered.length ? filtered.map((i) => (
            <div className="flex gap-4 border-b border-jp-border dark:border-jp-border-dark px-6 py-4" key={i.id}>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium">{i.user}</span>
                  <span className="badge">{i.action || i.aksi || NOT_SET}</span>
                </div>
                <p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">{i.target || i.detail || NOT_SET}{i.cabang ? " · " + i.cabang : ""}</p>
              </div>
              <span className="whitespace-nowrap text-[10px] text-jp-muted dark:text-jp-muted-dark">
                {formatDateTimeShort(i.timestamp || i.waktu, resolveCabangTimezone(cabangTz, i.cabang)) || NOT_SET}
              </span>
            </div>
          )) : <EmptyState message="Belum ada log aktivitas sesuai filter" iconName="clockSvg" />}
          {hasMore && !search.trim() && !aksiFilter && (
            <div className="flex justify-center px-6 py-4">
              <button type="button" className="btn-ghost" disabled={loadingMore} onClick={() => void loadMore()}>
                {loadingMore ? "Memuat..." : "Muat Lebih Banyak"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
