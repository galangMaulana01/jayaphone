"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { LabelledInput } from "@/components/ui/InputField";
import { UnitStatusBadge } from "@/components/ui/Badge";
import { UnitDetailModal } from "@/components/ui/UnitDetailModal";
import { CabangFilter } from "@/components/ui/CabangFilter";
import { useToast } from "@/contexts/ToastContext";
import { useApiList } from "@/hooks/useApiList";
import { formatRupiah, getStockAgeInfo, type StockAgeTone } from "@/lib/utils/formatters";
import type { Unit } from "@/lib/types";

const STOCK_AGE_TONE_CLASSNAME: Record<StockAgeTone, string> = {
  success: "text-jp-success dark:text-jp-success-dark",
  warning: "text-jp-warning dark:text-jp-warning-dark",
  danger: "text-jp-danger dark:text-jp-danger-dark",
  neutral: "text-jp-muted dark:text-jp-muted-dark",
};

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
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editHargaJual, setEditHargaJual] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const isOwner = currentUser?.role === "owner";
  const isKepalaCabang = currentUser?.role === "kepala_cabang";
  // Kepala cabang/owner can correct a mis-entered price, or remove a unit
  // entered by mistake entirely — only while it's still Tersedia, so a sold
  // unit's history (and any transaction that already references it) can
  // never be edited or deleted out from under it.
  const canManage = isOwner || isKepalaCabang;

  const {
    items: unitList,
    loading: isFetching,
    error: fetchErrorMessage,
    reload: loadUnits,
  } = useApiList<Unit>(
    () => Api.units.list({
      cabang: isOwner && selectedCabangFilter ? selectedCabangFilter : undefined,
      status: selectedStatusFilter || undefined,
    }).then((response) => response.data),
    [isOwner, selectedCabangFilter, selectedStatusFilter],
    "Gagal memuat daftar unit",
  );

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

  const openEditPrice = (unit: Unit): void => { setEditingUnit(unit); setEditHargaJual(String(unit.harga_jual)); };
  const saveEditPrice = async (): Promise<void> => {
    if (!editingUnit || savingEdit) return;
    setSavingEdit(true);
    try {
      // harga_modal is intentionally NOT editable here — it only changes
      // through tracked paths (initial input, sparepart cost additions
      // during repair), never a manual correction, so there's no way to
      // quietly polish profit by nudging cost after the fact.
      await Api.units.update(editingUnit.unit_id, { harga_jual: Number(editHargaJual) || 0 });
      showToast("Harga unit diperbarui");
      setEditingUnit(null);
      await loadUnits();
    } catch (updateError) {
      showToast(updateError instanceof Error ? updateError.message : "Update harga gagal", "error");
    } finally {
      setSavingEdit(false);
    }
  };
  const deleteUnit = async (unit: Unit): Promise<void> => {
    if (!window.confirm(`Hapus unit ${unit.unit_id} (${unit.merk} ${unit.tipe})? Aksi ini tidak bisa dibatalkan.`)) return;
    try {
      await Api.units.remove(unit.unit_id);
      showToast("Unit dihapus");
      await loadUnits();
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : "Hapus unit gagal", "error");
    }
  };

  return (
    <div className="space-y-8">
      <header className="jp-page-header">
        <div>
          <h1 className="jp-page-title">Manajemen stok</h1>
          <p className="mt-2 text-sm text-jp-muted dark:text-jp-muted-dark">Unit tersedia, terjual, dan dalam proses operasional{isOwner ? "." : " untuk cabang " + currentUser?.cabang + "."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isKepalaCabang ? <Link href="/transfer-stok" className="btn-secondary">Transfer stok</Link> : null}
          {!isOwner ? <Link href="/tambah-unit" className="btn-primary">Tambah unit</Link> : null}
        </div>
      </header>

      <section className="jp-toolbar">
        <input value={searchInputValue} onChange={(event) => setSearchInputValue(event.target.value)} placeholder="Cari merk, tipe, atau IMEI..." className="field-control min-w-[220px] flex-1" />
        <select value={selectedStatusFilter} onChange={(event) => setSelectedStatusFilter(event.target.value)} className="field-control w-full sm:w-auto">
          {STATUS_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {isOwner ? <CabangFilter value={selectedCabangFilter} onChange={setSelectedCabangFilter} label="" className="min-w-[180px]" /> : null}
      </section>

      {isFetching ? <LoadingSkeleton numberOfRows={5} /> : fetchErrorMessage ? <ErrorState message={fetchErrorMessage} onRetry={loadUnits} /> : displayedUnits.length === 0 ? <EmptyState message="Belum ada unit sesuai filter" iconName="packageSvg" /> : (
        <section className="list-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead className="border-b border-jp-border text-left text-[11px] font-medium text-jp-muted dark:border-jp-border-dark dark:text-jp-muted-dark"><tr><th className="px-6 py-3.5">Kode unit</th><th className="px-5 py-3.5">Perangkat</th><th className="px-5 py-3.5">IMEI</th><th className="px-5 py-3.5">Kondisi</th><th className="px-5 py-3.5 text-right">Harga jual</th><th className="px-5 py-3.5 text-right">Status</th><th className="px-5 py-3.5 text-center">Umur stok</th><th className="tbl-action-col px-6 py-3.5 text-right">Aksi</th></tr></thead>
              <tbody>{displayedUnits.map((unit) => { const age = getStockAgeInfo(unit.tgl_masuk); return <tr key={unit.unit_id} className="h-14 border-b border-jp-border/80 last:border-0 hover:bg-jp-surface-subtle/70 dark:border-jp-border-dark dark:hover:bg-jp-surface-subtle-dark/60"><td className="whitespace-nowrap px-6 font-mono text-[12px] text-jp-muted dark:text-jp-muted-dark">{unit.unit_id}</td><td className="px-5"><p className="font-medium text-jp-text dark:text-jp-text-dark">{unit.merk} {unit.tipe}</p><p className="mt-0.5 text-[11px] text-jp-muted dark:text-jp-muted-dark">{unit.storage} · {unit.ram} · {unit.warna}</p></td><td className="px-5 font-mono text-[12px] text-jp-muted dark:text-jp-muted-dark">{unit.imei}</td><td className="px-5 text-jp-muted dark:text-jp-muted-dark">{unit.kondisi_hp}</td><td className="px-5 text-right font-mono text-[12px] font-medium text-jp-text dark:text-jp-text-dark">{formatRupiah(unit.harga_jual)}</td><td className="px-5 text-right"><UnitStatusBadge status={unit.status} /></td><td className={`whitespace-nowrap px-5 text-center text-[11px] font-medium ${STOCK_AGE_TONE_CLASSNAME[age.tone]}`}>{age.label}</td><td className="tbl-action-col px-6 text-right"><div className="flex items-center justify-end gap-1"><button type="button" className="btn-ghost" onClick={() => void openDetail(unit.unit_id)}>Detail</button>{canManage && unit.status === "Tersedia" && <ActionMenu ariaLabel={`Menu aksi ${unit.unit_id}`} items={[{ label: "Edit Harga", onClick: () => openEditPrice(unit) }, { label: "Hapus", onClick: () => void deleteUnit(unit), destructive: true }]} />}</div></td></tr>; })}</tbody>
            </table>
          </div>
        </section>
      )}

      <UnitDetailModal unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
      <Modal isOpen={Boolean(editingUnit)} onClose={() => setEditingUnit(null)} title={editingUnit ? `Edit Harga ${editingUnit.unit_id}` : "Edit Harga"}>
        <div className="space-y-3">
          <p className="text-sm text-jp-muted dark:text-jp-muted-dark">{editingUnit?.merk} {editingUnit?.tipe}</p>
          <LabelledInput label="Harga Jual" type="number" min={0} value={editHargaJual} onChange={(event) => setEditHargaJual(event.target.value)} />
          <div>
            <p className="label">Harga Modal</p>
            <p className="rounded-jp-sm bg-jp-surface-subtle px-3 py-2 text-sm text-jp-muted dark:bg-jp-surface-subtle-dark/60 dark:text-jp-muted-dark">{formatRupiah(editingUnit?.harga_modal)}</p>
          </div>
          <button type="button" className="btn-primary w-full" disabled={savingEdit} onClick={() => void saveEditPrice()}>{savingEdit ? "Menyimpan..." : "Simpan"}</button>
        </div>
      </Modal>
    </div>
  );
}
