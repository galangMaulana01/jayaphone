"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { UnitStatusBadge } from "@/components/ui/Badge";
import { UnitDetailModal } from "@/components/ui/UnitDetailModal";
import { useToast } from "@/contexts/ToastContext";
import { formatRupiah } from "@/lib/utils/formatters";
import type { Unit } from "@/lib/types";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "Tersedia", label: "Tersedia" },
  { value: "Sold", label: "Terjual" },
  { value: "Booking", label: "Booking" },
  { value: "Service", label: "Service" },
];

export default function StokPage(): JSX.Element {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [selectedCabangFilter, setSelectedCabangFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [unitList, setUnitList] = useState<Unit[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchErrorMessage, setFetchErrorMessage] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

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
      setFetchErrorMessage(loadError instanceof ApiError ? loadError.message : "Gagal memuat daftar unit");
    } finally {
      setIsFetching(false);
    }
  }, [isOwner, selectedCabangFilter, selectedStatusFilter]);

  useEffect(() => { void loadUnits(); }, [loadUnits]);

  const displayedUnits = useMemo(() => {
    const query = searchInputValue.trim().toLowerCase();
    if (!query) return unitList;
    return unitList.filter((unit) => (unit.merk + " " + unit.tipe + " " + unit.imei + " " + unit.unit_id).toLowerCase().includes(query));
  }, [searchInputValue, unitList]);

  const openDetail = async (unitId: string): Promise<void> => {
    try {
      setSelectedUnit((await Api.units.detail(unitId)).data);
    } catch (detailError) {
      showToast(detailError instanceof Error ? detailError.message : "Detail unit gagal", "error");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-jp-text dark:text-jp-text-dark">Manajemen stok</h1>
          <p className="mt-2 text-sm text-jp-muted dark:text-jp-muted-dark">Unit tersedia, terjual, dan dalam proses operasional{isOwner ? "." : " untuk cabang " + currentUser?.cabang + "."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isKepalaCabang ? <Link href="/transfer-stok" className="btn-secondary">Transfer stok</Link> : null}
          {!isOwner ? <Link href="/tambah-unit" className="btn-primary">Tambah unit</Link> : null}
        </div>
      </header>

      <section className="flex flex-wrap gap-3 rounded-2xl border border-jp-border bg-jp-surface p-4 dark:border-jp-border-dark dark:bg-jp-surface-dark">
        <input value={searchInputValue} onChange={(event) => setSearchInputValue(event.target.value)} placeholder="Cari merk, tipe, atau IMEI..." className="min-h-11 min-w-[220px] flex-1 rounded-xl border border-jp-border bg-jp-surface-subtle px-3 text-sm text-jp-text outline-none focus:border-jp-teal focus:ring-2 focus:ring-jp-teal/20 dark:border-jp-border-dark dark:bg-jp-surface-subtle-dark dark:text-jp-text-dark" />
        <select value={selectedStatusFilter} onChange={(event) => setSelectedStatusFilter(event.target.value)} className="min-h-11 rounded-xl border border-jp-border bg-jp-surface-subtle px-3 text-sm text-jp-text outline-none focus:border-jp-teal dark:border-jp-border-dark dark:bg-jp-surface-subtle-dark dark:text-jp-text-dark">
          {STATUS_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </section>

      {isFetching ? <LoadingSkeleton numberOfRows={5} /> : fetchErrorMessage ? <ErrorState message={fetchErrorMessage} onRetry={loadUnits} /> : displayedUnits.length === 0 ? <EmptyState message="Belum ada unit sesuai filter" iconName="packageSvg" /> : (
        <section className="overflow-hidden rounded-2xl border border-jp-border bg-jp-surface dark:border-jp-border-dark dark:bg-jp-surface-dark">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead className="border-b border-jp-border text-left text-[11px] font-medium text-jp-muted dark:border-jp-border-dark dark:text-jp-muted-dark"><tr><th className="px-6 py-3.5">Kode unit</th><th className="px-5 py-3.5">Perangkat</th><th className="px-5 py-3.5">IMEI</th><th className="px-5 py-3.5">Kondisi</th><th className="px-5 py-3.5 text-right">Harga jual</th><th className="px-5 py-3.5 text-right">Status</th><th className="px-6 py-3.5 text-right">Aksi</th></tr></thead>
              <tbody>{displayedUnits.map((unit) => <tr key={unit.unit_id} className="h-14 border-b border-jp-border/80 last:border-0 hover:bg-jp-surface-subtle/70 dark:border-jp-border-dark dark:hover:bg-jp-surface-subtle-dark/60"><td className="whitespace-nowrap px-6 font-mono text-[12px] text-jp-muted dark:text-jp-muted-dark">{unit.unit_id}</td><td className="px-5"><p className="font-medium text-jp-text dark:text-jp-text-dark">{unit.merk} {unit.tipe}</p><p className="mt-0.5 text-[11px] text-jp-muted dark:text-jp-muted-dark">{unit.storage} · {unit.ram} · {unit.warna}</p></td><td className="px-5 font-mono text-[12px] text-jp-muted dark:text-jp-muted-dark">{unit.imei}</td><td className="px-5 text-jp-muted dark:text-jp-muted-dark">{unit.kondisi_hp}</td><td className="px-5 text-right font-mono text-[12px] font-medium text-jp-text dark:text-jp-text-dark">{formatRupiah(unit.harga_jual)}</td><td className="px-5 text-right"><UnitStatusBadge status={unit.status} /></td><td className="px-6 text-right"><button type="button" className="btn-ghost" onClick={() => void openDetail(unit.unit_id)}>Detail</button></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      <UnitDetailModal unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
    </div>
  );
}
