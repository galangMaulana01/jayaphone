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

export default function StokKasirPage(): JSX.Element {
  const { showToast } = useToast(); const [query, setQuery] = useState(""); const [selected, setSelected] = useState<Unit | null>(null);
  const { items, loading, error, reload: load } = useApiList<Unit>(() => Api.units.list({ status: "Tersedia" }).then((r) => r.data ?? []), [], "Gagal memuat stok kasir");
  const visible = useMemo(() => items.filter((u) => `${u.merk} ${u.tipe} ${u.unit_id} ${u.imei}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const openDetail = async (id: string) => { try { setSelected((await Api.units.detail(id)).data); } catch (e) { showToast(e instanceof Error ? e.message : "Detail unit gagal", "error"); } };
  return <div className="space-y-5"><div><h1 className="text-3xl font-semibold tracking-[-0.03em] text-jp-text dark:text-jp-text-dark">Stok Kasir</h1><p className="text-sm text-jp-muted dark:text-jp-muted-dark">Unit tersedia untuk transaksi penjualan</p></div><input className="w-full max-w-lg rounded-xl border border-jp-border bg-jp-surface-subtle dark:border-jp-border-dark p-2 text-xs outline-none dark:bg-jp-surface-subtle-dark" placeholder="Cari merk, tipe, ID, IMEI..." value={query} onChange={(e) => setQuery(e.target.value)}/>{loading ? <LoadingSkeleton numberOfRows={5}/> : error ? <ErrorState message={error} onRetry={load}/> : <div className="table-wrap overflow-x-auto rounded-2xl"><table className="w-full text-xs"><thead className="tbl-head border-b"><tr>{["ID","Perangkat","Spesifikasi","IMEI","Harga Jual","Battery","Aksi"].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead><tbody>{visible.length ? visible.map((u) => <tr key={u.unit_id} className="tbl-row"><td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{u.unit_id}</td><td className="px-5 py-4"><p className="font-medium">{u.merk}</p><p className="text-[10px] text-jp-muted dark:text-jp-muted-dark">{u.tipe}</p></td><td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{u.storage}/{u.ram} · {u.warna}<br/>{u.kondisi}</td><td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{u.imei}</td><td className="px-5 py-4 font-semibold font-mono text-jp-text dark:text-jp-text-dark">{formatRupiah(u.harga_jual)}</td><td className="px-5 py-4">{u.battery}%</td><td className="tbl-action-col px-5 py-4"><button type="button" className="btn-ghost" onClick={() => void openDetail(u.unit_id)}>Detail</button></td></tr>) : <tr><td colSpan={7}><EmptyState message="Tidak ada unit tersedia" iconName="packageSvg"/></td></tr>}</tbody></table></div>}<UnitDetailModal unit={selected} onClose={() => setSelected(null)}/></div>;
}
