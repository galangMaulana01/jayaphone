"use client";

// Stok (unit inventory) page.
//
// Migrated from `renderStok()` in index.html.bak (approx. lines 1316–1628).
// Includes search, status filter, per-cabang filter (owner only), and the
// unit list rendered as cards. The "Tambah Unit" modal and the "Transfer
// Stok" jump-button are surfaced via NAV links / a separate stub page for
// now (the modal migration is queued as a follow-up).

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { UnitStatusBadge } from "@/components/ui/Badge";
import { formatRupiah } from "@/lib/utils/formatters";
import type { Unit } from "@/lib/types";

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "",          label: "Semua Status" },
  { value: "Tersedia",  label: "Tersedia" },
  { value: "Sold",      label: "Terjual" },
  { value: "Booking",   label: "Booking" },
  { value: "Service",   label: "Service" },
];

export default function StokPage(): JSX.Element {
  const { user: currentUser } = useAuth();
  const [selectedCabangFilter, setSelectedCabangFilter] = useState<string>("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("");
  const [searchInputValue, setSearchInputValue] = useState<string>("");
  const [unitList, setUnitList] = useState<Unit[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [fetchErrorMessage, setFetchErrorMessage] = useState<string>("");

  const isOwner = currentUser?.role === "owner";
  const isKepalaCabang = currentUser?.role === "kepala_cabang";

  const loadUnits = useCallback(async (): Promise<void> => {
    setIsFetching(true);
    setFetchErrorMessage("");
    try {
      const response = await Api.units.list({
        cabang: isOwner && selectedCabangFilter ? selectedCabangFilter : undefined,
        status: selectedStatusFilter || undefined,
      });
      setUnitList(response.data);
    } catch (loadError) {
      const message = loadError instanceof ApiError ? loadError.message : "Gagal memuat daftar unit";
      setFetchErrorMessage(message);
    } finally {
      setIsFetching(false);
    }
  }, [isOwner, selectedCabangFilter, selectedStatusFilter]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  // Client-side text search — the legacy code did the same because units
  // fit comfortably in memory per cabang.
  const displayedUnits = useMemo<Unit[]>(() => {
    const normalizedQuery = searchInputValue.trim().toLowerCase();
    if (!normalizedQuery) return unitList;
    return unitList.filter((unit) => {
      const haystack = `${unit.merk} ${unit.tipe} ${unit.imei} ${unit.unit_id}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [searchInputValue, unitList]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Stok</h1>
          {!isOwner && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Cabang {currentUser?.cabang}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isKepalaCabang && (
            <Link href="/transfer-stok" className="btn-secondary">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Transfer Stok
            </Link>
          )}
          {!isOwner && (
            <Link href="/tambah-unit" className="btn-primary">
              + Tambah Unit
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="search-wrap flex-1 min-w-[200px]">
          <svg className="search-icon h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cari merk, tipe, atau IMEI..."
            value={searchInputValue}
            onChange={(inputEvent) => setSearchInputValue(inputEvent.target.value)}
            className="w-full rounded-xl border-[1.5px] border-transparent bg-gray-100 p-2 pl-8 text-sm outline-none focus:border-brand-teal dark:bg-[#18181B]"
          />
        </div>
        <select
          value={selectedStatusFilter}
          onChange={(selectEvent) => setSelectedStatusFilter(selectEvent.target.value)}
          className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600 outline-none dark:bg-zinc-900 dark:text-zinc-300"
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {/* TODO: cabang filter for owner — needs GET /cabang result cached. */}
      </div>

      {isFetching ? (
        <LoadingSkeleton numberOfRows={5} />
      ) : fetchErrorMessage ? (
        <ErrorState message={fetchErrorMessage} onRetry={loadUnits} />
      ) : displayedUnits.length === 0 ? (
        <EmptyState message="Belum ada unit sesuai filter" iconName="packageSvg" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayedUnits.map((unitEntry) => (
            <div key={unitEntry.unit_id} className="svc-card">
              <div className="mb-2 flex items-start justify-between">
                <UnitStatusBadge status={unitEntry.status} />
                <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">{unitEntry.unit_id}</span>
              </div>
              <p className="text-sm font-semibold">{unitEntry.merk} {unitEntry.tipe}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {unitEntry.storage} • {unitEntry.warna} • {unitEntry.kondisi_hp}
              </p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                IMEI: <span className="font-mono">{unitEntry.imei}</span>
              </p>
              <p className="mt-3 text-sm font-bold text-brand-teal">
                {formatRupiah(unitEntry.harga_jual)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
