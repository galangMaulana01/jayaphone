"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import { DateFilterBar } from "@/components/ui/DateFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createDefaultDateFilter, toApiQueryParams } from "@/lib/utils/dateFilter";
import { formatDateTimeShort, formatRupiah } from "@/lib/utils/formatters";
import type { Cabang, Transaksi } from "@/lib/types";

export default function TransaksiPage(): JSX.Element {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [filter, setFilter] = useState(createDefaultDateFilter);
  const [branch, setBranch] = useState("");
  const [branches, setBranches] = useState<Cabang[]>([]);
  const [items, setItems] = useState<Transaksi[]>([]);
  const [selected, setSelected] = useState<Transaksi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const params = useMemo(() => ({ ...toApiQueryParams(filter), ...(branch ? { cabang: branch } : {}) }), [filter, branch]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems((await Api.transaksi.list(params)).data ?? []); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Gagal memuat transaksi"); }
    finally { setLoading(false); }
  }, [params]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (user?.role === "owner") void Api.cabang.list().then((r) => setBranches(r.data ?? [])).catch(() => undefined); }, [user?.role]);

  const totalProfit = items.reduce((sum, item) => sum + (item.profit || 0), 0);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold tracking-tight">Daftar Transaksi</h1><p className="text-xs text-zinc-400">{items.length} transaksi pada periode terpilih</p></div>
      <div className="flex flex-wrap items-center gap-2"><DateFilterBar currentFilterState={filter} onFilterStateChange={setFilter} />
        {user?.role === "owner" && <select aria-label="Filter cabang" value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-xl bg-zinc-100 px-3 py-2 text-xs dark:bg-zinc-900"><option value="">Semua Cabang</option>{branches.map((b) => <option key={b.kode} value={b.kode}>{b.nama}</option>)}</select>}
      </div>
    </div>
    {loading ? <LoadingSkeleton numberOfRows={6} /> : error ? <ErrorState message={error} onRetry={load} /> : <div className="table-wrap overflow-hidden rounded-lg">
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="tbl-head border-b"><tr>{["ID Trx","Unit","Kasir","Harga Jual","Modal","Profit","Waktu","Detail"].map((h) => <th key={h} className="px-5 py-3.5 text-left font-medium">{h}</th>)}</tr></thead><tbody>
        {items.length ? items.map((item) => <tr key={item.trx_id} className="tbl-row"><td className="px-5 py-4 font-mono text-zinc-400">{item.trx_id}</td><td className="px-5 py-4"><p className="font-medium">{item.unit_label}</p><p className="text-[10px] text-zinc-400">{item.unit_id || "Sparepart"}</p></td><td className="px-5 py-4 text-zinc-400">{item.kasir}</td><td className="px-5 py-4 whitespace-nowrap">{formatRupiah(item.harga_jual)}</td><td className="px-5 py-4 whitespace-nowrap text-zinc-400">{formatRupiah(item.harga_modal)}</td><td className="px-5 py-4 whitespace-nowrap font-semibold text-brand-teal">{formatRupiah(item.profit)}</td><td className="px-5 py-4 text-zinc-400">{formatDateTimeShort(item.waktu)}</td><td className="px-5 py-4"><button type="button" className="btn-ghost" onClick={async () => { try { setSelected((await Api.transaksi.detail(item.trx_id)).data); } catch (e) { showToast(e instanceof Error ? e.message : "Gagal memuat detail", "error"); } }}>Detail</button></td></tr>) : <tr><td colSpan={8}><EmptyState message="Belum ada transaksi" iconName="transaksiSvg" /></td></tr>}
      </tbody></table></div><div className="flex justify-between border-t border-divider px-6 py-4 text-xs"><span className="text-zinc-400">Total Profit</span><strong className="text-brand-teal">{formatRupiah(totalProfit)}</strong></div>
    </div>}
    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Detail ${selected.trx_id}` : "Detail Transaksi"} maxWidthClassName="max-w-2xl">{selected && <div className="space-y-4 text-xs"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Unit", selected.unit_label],["Kasir", selected.kasir],["Customer", selected.customer_nama || "—"],["Status", selected.customer_type]].map(([label,value]) => <div key={label} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60"><p className="text-zinc-400">{label}</p><p className="mt-1 font-medium">{value}</p></div>)}</div><div className="space-y-2 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60"><div className="flex justify-between"><span>Harga jual</span><strong>{formatRupiah(selected.harga_jual)}</strong></div><div className="flex justify-between"><span>Biaya garansi</span><span>{formatRupiah(selected.biaya_garansi)}</span></div><div className="flex justify-between"><span>Poin dipakai</span><span>{selected.poin_dipakai || 0}</span></div><div className="flex justify-between border-t border-divider pt-2 font-semibold text-brand-teal"><span>Profit</span><span>{formatRupiah(selected.profit)}</span></div></div>{selected.catatan && <p className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">{selected.catatan}</p>}<button type="button" className="btn-ghost w-full" onClick={() => setSelected(null)}>Tutup</button></div>}</Modal>
  </div>;
}
