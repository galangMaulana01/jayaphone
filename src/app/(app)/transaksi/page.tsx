"use client";

import { useEffect, useMemo, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import { DateFilterBar } from "@/components/ui/DateFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { LabelledTextarea } from "@/components/ui/InputField";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { usePaginatedApiList } from "@/hooks/usePaginatedApiList";
import { createDefaultDateFilter, toApiQueryParams } from "@/lib/utils/dateFilter";
import { formatDateTimeShort, formatRupiah } from "@/lib/utils/formatters";
import { printTransactionReceipt } from "@/lib/utils/receipt";
import type { Cabang, Transaksi } from "@/lib/types";

export default function TransaksiPage(): JSX.Element {
  const { user } = useAuth();
  const { showToast } = useToast();
  const cabangTz = useCabangTimezones();
  const [filter, setFilter] = useState(createDefaultDateFilter);
  const [branch, setBranch] = useState("");
  const [branches, setBranches] = useState<Cabang[]>([]);
  const [selected, setSelected] = useState<Transaksi | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Transaksi | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const params = useMemo(() => ({ ...toApiQueryParams(filter), ...(branch ? { cabang: branch } : {}) }), [filter, branch]);

  const { items, loading, loadingMore, error, total, hasMore, reload: load, loadMore } = usePaginatedApiList<Transaksi>(
    (skip, limit) => Api.transaksi.list({ ...params, skip, limit }),
    [params],
    "Gagal memuat transaksi",
  );

  // Kasir cuma boleh batalkan transaksinya sendiri, KC dibatasi ke cabangnya
  // sendiri, owner boleh semua — mirror persis guard yang sama di backend
  // (transaksi_service.void_transaksi), jadi tombol ini tidak pernah
  // ditampilkan untuk kasus yang bakal ditolak backend.
  const canVoid = (item: Transaksi): boolean => {
    if (item.dibatalkan_at) return false;
    if (user?.role === "owner") return true;
    if (user?.role === "kepala_cabang") return item.cabang === user.cabang;
    if (user?.role === "kasir") return item.kasir === user.name;
    return false;
  };
  const submitCancel = async (): Promise<void> => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) { showToast("Alasan pembatalan wajib diisi", "error"); return; }
    setCancelling(true);
    try {
      await Api.transaksi.void(cancelTarget.trx_id, cancelReason.trim());
      showToast(`${cancelTarget.trx_id} dibatalkan — stok dan poin dikembalikan`);
      setCancelTarget(null); setCancelReason("");
      await load();
    } catch (e) { showToast(e instanceof ApiError ? e.message : "Gagal membatalkan transaksi", "error"); }
    finally { setCancelling(false); }
  };

  useEffect(() => { if (user?.role === "owner") void Api.cabang.list().then((r) => setBranches(r.data ?? [])).catch(() => undefined); }, [user?.role]);

  // Transaksi yang dibatalkan tidak pernah benar-benar terjadi secara
  // finansial — jangan ikut dihitung ke Total Profit meski baris-nya masih
  // ditampilkan di tabel (transparansi audit).
  const totalProfit = items.reduce((sum, item) => sum + (item.dibatalkan_at ? 0 : item.profit || 0), 0);
  const periodLabel: Record<string, string> = { "7d": "7 hari terakhir", "30d": "30 hari terakhir", "90d": "3 bulan terakhir", "1y": "1 tahun terakhir", "custom": "rentang tanggal yang dipilih" };
  const branchLabel = user?.role === "owner" ? (branch ? branches.find((b) => b.kode === branch)?.nama ?? branch : "Semua Cabang") : null;
  const emptyStateMessage = `Belum ada transaksi pada ${periodLabel[filter.preset] ?? "periode ini"}${branchLabel ? ` di ${branchLabel}` : ""} — coba perlebar rentang tanggal atau ganti cabang.`;
  return <div className="jp-page">
    <div className="jp-page-header">
      <div><h1 className="jp-page-title">Daftar Transaksi</h1><p className="text-sm text-jp-muted dark:text-jp-muted-dark">{items.length} dari {total} transaksi pada periode terpilih</p></div>
      <div className="flex flex-wrap items-center gap-2"><DateFilterBar currentFilterState={filter} onFilterStateChange={setFilter} />
        {user?.role === "owner" && <select aria-label="Filter cabang" value={branch} onChange={(e) => setBranch(e.target.value)} className="min-w-0 max-w-[200px] truncate rounded-jp-sm bg-jp-surface-subtle px-3 py-2 text-xs dark:bg-jp-surface-subtle-dark"><option value="">Semua Cabang</option>{branches.map((b) => <option key={b.kode} value={b.kode}>{b.nama}</option>)}</select>}
      </div>
    </div>
    {loading ? <LoadingSkeleton numberOfRows={6} /> : error ? <ErrorState message={error} onRetry={load} /> : <div className="table-wrap overflow-hidden rounded-jp-md">
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="tbl-head border-b"><tr>{[
        { h: "ID Trx" }, { h: "Unit" }, { h: "Kasir", hideOnMobile: true }, { h: "Harga Jual" }, { h: "Modal" }, { h: "Profit" },
        { h: "Poin Dipakai", hideOnMobile: true }, { h: "Waktu", hideOnMobile: true }, { h: "Detail" },
      ].map(({ h, hideOnMobile }) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Detail" ? "tbl-action-col" : ""} ${hideOnMobile ? "hidden sm:table-cell" : ""}`}>{h}</th>)}</tr></thead><tbody>
        {items.length ? items.map((item) => <tr key={item.trx_id} className={`tbl-row ${item.dibatalkan_at ? "opacity-60" : ""}`}><td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{item.trx_id}{item.dibatalkan_at && <span className="badge badge-sold ml-2">Dibatalkan</span>}</td><td className="px-5 py-4"><p className="font-medium">{item.unit_label}</p><p className="text-[10px] text-jp-muted dark:text-jp-muted-dark">{item.unit_id || "Sparepart"}</p></td><td className="hidden px-5 py-4 text-jp-muted dark:text-jp-muted-dark sm:table-cell">{item.kasir}</td><td className="px-5 py-4 whitespace-nowrap">{formatRupiah(item.harga_jual)}</td><td className="px-5 py-4 whitespace-nowrap text-jp-muted dark:text-jp-muted-dark">{formatRupiah(item.harga_modal)}</td><td className="px-5 py-4 whitespace-nowrap font-semibold font-mono"><span className={item.profit < 0 ? "text-jp-danger dark:text-jp-danger-dark" : "text-jp-text dark:text-jp-text-dark"}>{formatRupiah(item.profit)}</span>{item.profit < 0 && <span className="badge badge-sold ml-2">Rugi</span>}</td><td className="hidden whitespace-nowrap px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark sm:table-cell">{item.poin_dipakai || 0} poin</td><td className="hidden whitespace-nowrap px-5 py-4 text-jp-muted dark:text-jp-muted-dark sm:table-cell">{formatDateTimeShort(item.waktu, resolveCabangTimezone(cabangTz, item.cabang))}</td><td className="tbl-action-col px-5 py-4"><div className="flex gap-2"><button type="button" className="btn-ghost" onClick={async () => { try { setSelected((await Api.transaksi.detail(item.trx_id)).data); } catch (e) { showToast(e instanceof Error ? e.message : "Gagal memuat detail", "error"); } }}>Detail</button>{canVoid(item) && <button type="button" className="btn-ghost" onClick={() => { setCancelTarget(item); setCancelReason(""); }}>Batalkan</button>}</div></td></tr>) : <tr><td colSpan={9}><EmptyState message={emptyStateMessage} iconName="transaksiSvg" /></td></tr>}
      </tbody></table></div>
      {hasMore && <div className="flex items-center justify-center border-t border-jp-border px-6 py-3 dark:border-jp-border-dark"><button type="button" className="btn-ghost" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Memuat..." : "Muat Lebih Banyak"}</button></div>}
      <div className="flex justify-between border-t border-jp-border dark:border-jp-border-dark px-6 py-4 text-xs"><span className="text-jp-muted dark:text-jp-muted-dark">Total Profit{hasMore ? " (transaksi yang sudah dimuat)" : ""}</span><strong className="font-mono text-jp-text dark:text-jp-text-dark">{formatRupiah(totalProfit)}</strong></div>
    </div>}
    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Detail ${selected.trx_id}` : "Detail Transaksi"} maxWidthClassName="max-w-2xl" hideCloseButton>{selected && <div className="space-y-5 text-xs">{selected.dibatalkan_at && <div className="rounded-jp-sm bg-jp-danger-soft p-3"><p className="font-medium text-jp-danger dark:text-jp-danger-dark">Dibatalkan{selected.dibatalkan_oleh ? ` — ${selected.dibatalkan_oleh}` : ""}</p><p className="mt-1 text-jp-muted dark:text-jp-muted-dark">{selected.dibatalkan_alasan}</p></div>}{selected.diamandemen_at && <div className="rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark/60"><p className="font-medium text-jp-text dark:text-jp-text-dark">Harga diamandemen{selected.diamandemen_oleh ? ` — ${selected.diamandemen_oleh}` : ""}</p><p className="mt-1 text-jp-muted dark:text-jp-muted-dark">Semula {formatRupiah(selected.harga_jual_asli ?? 0)} → nego di lokasi jadi {formatRupiah(selected.harga_jual)}</p></div>}<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Unit", selected.unit_label],["Kasir", selected.kasir],["Customer", selected.customer_nama || "Tidak ada data"],["Kontak", selected.customer_kontak || "Tidak ada data"],["Status", selected.customer_type]].map(([label,value]) => <div key={label} className="rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark/60"><p className="text-jp-muted dark:text-jp-muted-dark">{label}</p><p className="mt-1 font-medium">{value}</p></div>)}</div><div className="space-y-2 rounded-jp-sm bg-jp-surface-subtle p-4 dark:bg-jp-surface-subtle-dark/60"><div className="flex justify-between"><span>Harga jual</span><strong>{formatRupiah(selected.harga_jual)}</strong></div><div className="flex justify-between"><span>Biaya garansi</span><span>{formatRupiah(selected.biaya_garansi)}</span></div><div className="flex justify-between"><span>Poin dipakai</span><span>{selected.poin_dipakai || 0}</span></div><div className="flex justify-between border-t border-jp-border dark:border-jp-border-dark pt-2 font-semibold font-mono"><span className="text-jp-text dark:text-jp-text-dark">Profit</span><span className="flex items-center gap-2">{selected.profit < 0 && <span className="badge badge-sold">Rugi</span>}<span className={selected.profit < 0 ? "text-jp-danger dark:text-jp-danger-dark" : "text-jp-text dark:text-jp-text-dark"}>{formatRupiah(selected.profit)}</span></span></div></div>{selected.catatan && <p className="rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark/60">{selected.catatan}</p>}{selected.foto_serah_terima && <div><p className="mb-1.5 text-[11px] text-jp-muted dark:text-jp-muted-dark">Foto Serah Terima</p><img src={selected.foto_serah_terima} alt="Foto serah terima" className="h-48 w-full rounded-jp-sm object-contain bg-jp-surface-subtle dark:bg-jp-surface-subtle-dark"/></div>}<div className="flex gap-3"><button type="button" className="btn-ghost flex-1" onClick={() => setSelected(null)}>Tutup</button><button type="button" className="btn-primary flex-1" onClick={() => { if (!printTransactionReceipt(selected, resolveCabangTimezone(cabangTz, selected.cabang))) showToast("Popup cetak diblokir browser", "error"); }}>Cetak Struk</button></div></div>}</Modal>
    <Modal isOpen={Boolean(cancelTarget)} onClose={() => { setCancelTarget(null); setCancelReason(""); }} title={cancelTarget ? `Batalkan ${cancelTarget.trx_id}` : "Batalkan Transaksi"}>
      <div className="space-y-4">
        <p className="font-medium">{cancelTarget?.unit_label}</p>
        <p className="text-xs text-jp-muted dark:text-jp-muted-dark">Unit/sparepart akan dikembalikan ke stok, dan poin customer (dipakai maupun didapat) akan direverse.</p>
        <LabelledTextarea label="Alasan Pembatalan" rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
        <button type="button" disabled={cancelling} className="btn-error w-full" onClick={() => void submitCancel()}>{cancelling ? "Menyimpan..." : "Batalkan Transaksi"}</button>
      </div>
    </Modal>
  </div>;
}
