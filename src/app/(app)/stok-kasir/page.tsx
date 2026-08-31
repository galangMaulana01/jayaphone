"use client";

import { useMemo, useState } from "react";
import { Api } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { UnitDetailModal } from "@/components/ui/UnitDetailModal";
import { useToast } from "@/contexts/ToastContext";
import { useApiList } from "@/hooks/useApiList";
import { formatRupiah } from "@/lib/utils/formatters";
import type { Unit } from "@/lib/types";

type StockTab = "ready" | "service";

function UnitPhoto({ unit }: { unit: Unit }): JSX.Element {
  return unit.foto_url ? <img src={unit.foto_url} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <span className="kasir-unit-placeholder" aria-hidden="true">▦</span>;
}

export default function StokKasirPage(): JSX.Element {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<StockTab>("ready");
  const [selected, setSelected] = useState<Unit | null>(null);
  const { items: readyItems, loading: readyLoading, error: readyError, reload: reloadReady } = useApiList<Unit>(() => Api.units.list({ status: "Tersedia" }).then((r) => r.data ?? []), [], "Gagal memuat stok kasir");
  const { items: serviceItems, loading: serviceLoading, error: serviceError, reload: reloadService } = useApiList<Unit>(() => Api.units.list({ status: "Service" }).then((r) => r.data ?? []), [], "Gagal memuat unit service");
  const items = tab === "ready" ? readyItems : serviceItems;
  const loading = tab === "ready" ? readyLoading : serviceLoading;
  const error = tab === "ready" ? readyError : serviceError;
  const reload = tab === "ready" ? reloadReady : reloadService;
  const visible = useMemo(() => items.filter((unit) => `${unit.merk} ${unit.tipe} ${unit.unit_id} ${unit.imei}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const openDetail = async (id: string): Promise<void> => { try { setSelected((await Api.units.detail(id)).data); } catch (e) { showToast(e instanceof Error ? e.message : "Detail unit gagal", "error"); } };

  return <div className="jp-page kasir-stock-page">
    <header className="kasir-stock-header"><div><h1>Cek Stok</h1><p>Unit tersedia untuk transaksi penjualan.</p></div><button type="button" className={`kasir-stock-tab ${tab === "service" ? "is-active" : ""}`} onClick={() => setTab(tab === "service" ? "ready" : "service")}>Unit Dalam Service</button></header>
    <div className="kasir-stock-search"><input className="field-control" placeholder="Cari merk, tipe, ID, IMEI..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    <section className="kasir-stock-table-card" aria-labelledby="kasir-stock-table-heading">
      <div className="kasir-stock-table-heading"><div><h2 id="kasir-stock-table-heading">{tab === "ready" ? "Unit Siap Dijual" : "Unit Dalam Service"}</h2><p>{tab === "ready" ? "Stok cabang yang dapat dipilih untuk transaksi." : "Unit yang sedang diperbaiki dan belum dapat dijual."}</p></div><span>{visible.length} unit</span></div>
      {loading ? <LoadingSkeleton numberOfRows={4} /> : error ? <ErrorState message={error} onRetry={reload} /> : <div className="overflow-x-auto"><table className="kasir-stock-table min-w-[920px]"><thead><tr>{["Foto", "ID", "Perangkat", "Spesifikasi", "IMEI", "Harga Jual", "Battery", "Aksi"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{visible.length ? visible.map((unit) => <tr key={unit.unit_id}><td><UnitPhoto unit={unit} /></td><td className="font-mono">{unit.unit_id}</td><td><strong>{unit.merk}</strong><small>{unit.tipe}</small></td><td>{unit.storage}/{unit.ram} · {unit.warna}<small>{unit.kondisi}</small></td><td className="font-mono">{unit.imei}</td><td className="font-medium tabular-nums">{unit.harga_jual ? formatRupiah(unit.harga_jual) : "—"}</td><td>{unit.battery}%</td><td><button type="button" className="kasir-table-action" onClick={() => void openDetail(unit.unit_id)}>Detail</button></td></tr>) : <tr><td colSpan={8}><EmptyState message={tab === "ready" ? "Tidak ada unit tersedia" : "Tidak ada unit dalam service"} iconName="packageSvg" /></td></tr>}</tbody></table></div>}
    </section><UnitDetailModal unit={selected} onClose={() => setSelected(null)} />
  </div>;
}
