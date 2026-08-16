"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Api } from "@/lib/api";
import { DateFilterBar } from "@/components/ui/DateFilterBar";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { PhotoGallery } from "@/components/ui/PhotoGallery";
import { ServiceStatusBadge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { useApiList } from "@/hooks/useApiList";
import { useUrlParam } from "@/hooks/useUrlParam";
import { usePendingRepairApprovalCount, dispatchPendingRepairApprovalRefresh } from "@/hooks/usePendingRepairApprovalCount";
import { createDefaultDateFilter, toApiQueryParams } from "@/lib/utils/dateFilter";
import { formatDateTimeShort, formatRupiah, NOT_SET } from "@/lib/utils/formatters";
import type { Cabang, ServiceStatus, ServiceTicket } from "@/lib/types";

const SERVICE_STATUS_FILTERS = ["", "Antrian", "Proses", "Selesai", "Approved", "Ditolak"] as const;

export default function ServicePage(): JSX.Element {
  return <Suspense fallback={null}><ServicePageInner /></Suspense>;
}

function ServicePageInner(): JSX.Element {
  const { user } = useAuth(); const { showToast } = useToast(); const cabangTz = useCabangTimezones(); const [filter, setFilter] = useState(createDefaultDateFilter); const [branch, setBranch] = useState("");
  // Deep-link support: a notification / bookmark / the sidebar's "Riwayat
  // Persetujuan" child can land here with ?status= already applied — the
  // query param IS the state, so it can't disagree with the sidebar.
  const [status, setStatus] = useUrlParam("status", SERVICE_STATUS_FILTERS, "");
  const [branches, setBranches] = useState<Cabang[]>([]); const [detail, setDetail] = useState<(ServiceTicket & { timeline?: { event: string; waktu: string }[] }) | null>(null);
  // Full ticket, not just unit_id — the Approve modal needs unit/keluhan/
  // sparepart-cost context so owner isn't approving a price blind.
  const [approveTarget, setApproveTarget] = useState<ServiceTicket | null>(null); const [salePrice, setSalePrice] = useState("");
  const approveSparepartTotal = (approveTarget?.sparepart_items ?? []).reduce((sum, item) => sum + item.harga_modal * item.jumlah, 0);
  const params = useMemo(() => ({ limit: 50, ...toApiQueryParams(filter), ...(branch ? { cabang: branch } : {}), ...(status ? { status } : {}) }), [filter, branch, status]);
  const { items, loading, error, reload: load } = useApiList<ServiceTicket>(() => Api.service.list(params).then((r) => r.data ?? []), [params], "Gagal memuat service");
  useEffect(() => { if (user?.role === "owner") void Api.cabang.list().then((r) => setBranches(r.data ?? [])).catch(() => undefined); }, [user?.role]);
  const pendingRepairApprovalCount = usePendingRepairApprovalCount();
  const openDetail = async (id: string) => { try { setDetail((await Api.service.detail(id)).data); } catch (e) { showToast(e instanceof Error ? e.message : "Detail service gagal", "error"); } };
  return <div className="jp-page"><div className="jp-page-header"><div><h1 className="jp-page-title">Data Service</h1><p className="text-sm text-jp-muted dark:text-jp-muted-dark">{items.length} tiket service</p></div><div className="flex flex-wrap gap-2">{pendingRepairApprovalCount > 0 && <button type="button" className="btn-warning" onClick={() => setStatus("Selesai")}>Perlu Persetujuan ({pendingRepairApprovalCount})</button>}<DateFilterBar currentFilterState={filter} onFilterStateChange={setFilter}/>{user?.role === "owner" && <select className="field-control min-w-0 w-full max-w-[220px] truncate text-xs sm:w-auto" value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">Semua Cabang</option>{branches.map((b) => <option key={b.kode} value={b.kode}>{b.nama}</option>)}</select>}<select className="field-control w-full text-xs sm:w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof SERVICE_STATUS_FILTERS[number])}><option value="">Semua Status</option>{["Antrian","Proses","Selesai","Approved","Ditolak"].map((s) => <option key={s}>{s}</option>)}</select></div></div>{loading ? <LoadingSkeleton numberOfRows={6}/> : error ? <ErrorState message={error} onRetry={load}/> : <div className="table-wrap overflow-x-auto rounded-jp-md"><table className="w-full text-xs"><thead className="tbl-head border-b"><tr>{["Foto","ID","Unit","Keluhan","Teknisi","Status","Masuk","Aksi"].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead><tbody>{items.length ? items.map((s) => <tr key={s.service_id} className="tbl-row"><td className="px-5 py-4">{s.unit_foto_url ? <img src={s.unit_foto_url} alt={s.unit_id} className="h-10 w-10 rounded-jp-sm object-cover" /> : <span className="text-jp-muted dark:text-jp-muted-dark">{NOT_SET}</span>}</td><td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{s.service_id}</td><td className="px-5 py-4"><p className="font-medium">{s.unit_label}</p><p className="text-[10px] text-jp-muted dark:text-jp-muted-dark">{s.unit_id}</p></td><td className="max-w-[180px] truncate px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{s.keluhan}</td><td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{s.teknisi || NOT_SET}</td><td className="px-5 py-4"><ServiceStatusBadge status={s.status as ServiceStatus}/></td><td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(s.created_at, resolveCabangTimezone(cabangTz, s.cabang))}</td><td className="tbl-action-col px-5 py-4"><div className="flex flex-wrap gap-1.5"><button type="button" className="btn-ghost" onClick={() => void openDetail(s.service_id)}>Detail</button>{s.status === "Selesai" && <button type="button" className="btn-success" onClick={() => { setApproveTarget(s); setSalePrice(""); }}>Approve</button>}</div></td></tr>) : <tr><td colSpan={8}><EmptyState message="Belum ada data service" iconName="wrenchSvg"/></td></tr>}</tbody></table></div>}
    <Modal isOpen={Boolean(approveTarget)} onClose={() => setApproveTarget(null)} title="Approve Repair"><div className="space-y-5">
      {approveTarget && <div className="space-y-3 rounded-jp-sm bg-jp-surface-subtle p-3 text-xs dark:bg-jp-surface-subtle-dark">
        <div className="flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Unit</span><span className="font-medium">{approveTarget.unit_label}</span></div>
        <div className="flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Keluhan</span><span className="max-w-[60%] text-right">{approveTarget.keluhan}</span></div>
        {approveTarget.catatan_kerusakan && <div className="flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Catatan Kerusakan</span><span className="max-w-[60%] text-right">{approveTarget.catatan_kerusakan}</span></div>}
        <div className="flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Teknisi</span><span className="font-medium">{approveTarget.teknisi || NOT_SET}</span></div>
        {(approveTarget.sparepart_items?.length ?? 0) > 0 && <div className="border-t border-jp-border pt-2 dark:border-jp-border-dark">
          <p className="mb-1 text-jp-muted dark:text-jp-muted-dark">Sparepart Digunakan</p>
          {approveTarget.sparepart_items!.map((item, idx) => <div key={`${item.sp_id}-${idx}`} className="flex justify-between"><span>{item.nama} ×{item.jumlah}</span><span className="font-mono">{formatRupiah(item.harga_modal * item.jumlah)}</span></div>)}
          <div className="mt-1 flex justify-between font-semibold"><span>Total Biaya Sparepart</span><span className="font-mono">{formatRupiah(approveSparepartTotal)}</span></div>
        </div>}
      </div>}
      <div>
        <label className="label" htmlFor="approve-sale-price">Harga Jual Setelah Repair</label>
        <input id="approve-sale-price" className="w-full rounded-jp-sm bg-jp-surface-subtle p-2 text-sm outline-none dark:bg-jp-surface-subtle-dark" type="number" min={0} required value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Harga jual"/>
      </div>
      <div className="flex gap-2"><button type="button" className="btn-ghost flex-1" onClick={() => setApproveTarget(null)}>Batal</button><button type="button" className="btn-success flex-1" disabled={!salePrice || Number(salePrice) <= 0} onClick={async () => { if (!approveTarget) return; try { await Api.units.approveRepair(approveTarget.unit_id, { harga_jual: Number(salePrice) }); setApproveTarget(null); showToast("Repair disetujui"); await load(); dispatchPendingRepairApprovalRefresh(); } catch (e) { showToast(e instanceof Error ? e.message : "Approval gagal", "error"); } }}>Simpan Approval</button></div>
    </div></Modal>
    <Modal isOpen={Boolean(detail)} onClose={() => setDetail(null)} title={detail ? `Detail ${detail.service_id}` : "Detail Service"} maxWidthClassName="max-w-2xl">{detail && <div className="space-y-5 text-xs"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark"><span className="text-jp-muted dark:text-jp-muted-dark">Unit</span><p className="mt-1 font-medium">{detail.unit_label}</p></div><div className="rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark"><span className="text-jp-muted dark:text-jp-muted-dark">Customer</span><p className="mt-1 font-medium">{detail.nama_customer || NOT_SET}</p></div><div className="rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark"><span className="text-jp-muted dark:text-jp-muted-dark">Status</span><div className="mt-1"><ServiceStatusBadge status={detail.status as ServiceStatus}/></div></div><div className="rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark"><span className="text-jp-muted dark:text-jp-muted-dark">Teknisi</span><p className="mt-1 font-medium">{detail.teknisi || NOT_SET}</p></div></div><div><p className="mb-1 font-semibold">Keluhan</p><p className="rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark">{detail.keluhan}</p></div>{detail.catatan_kerusakan && <div><p className="mb-1 font-semibold">Catatan Kerusakan</p><p className="rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark">{detail.catatan_kerusakan}</p></div>}{(detail.sparepart_items?.length ?? 0) > 0 && <div><p className="mb-1 font-semibold">Sparepart Digunakan</p><div className="space-y-1 rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark">{detail.sparepart_items!.map((item, idx) => <div key={`${item.sp_id}-${idx}`} className="flex justify-between"><span>{item.nama} ×{item.jumlah}</span><span className="font-mono">{formatRupiah(item.harga_modal * item.jumlah)}</span></div>)}<div className="mt-1 flex justify-between border-t border-jp-border pt-1 font-semibold dark:border-jp-border-dark"><span>Total Biaya Sparepart</span><span className="font-mono">{formatRupiah(detail.sparepart_items!.reduce((sum, item) => sum + item.harga_modal * item.jumlah, 0))}</span></div></div></div>}{(detail.timeline?.length ?? 0) > 0 && <div><p className="mb-1 font-semibold">Timeline</p><div className="space-y-2 rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark">{detail.timeline!.map((entry, idx) => <div key={idx} className="flex justify-between"><span>{entry.event}</span><span className="text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(entry.waktu, resolveCabangTimezone(cabangTz, detail.cabang))}</span></div>)}</div></div>}<div className="grid gap-4 sm:grid-cols-2"><PhotoGallery images={detail.foto_before_urls || []} label="Foto Before"/><PhotoGallery images={detail.foto_after_urls || []} label="Foto After"/></div><button type="button" className="btn-ghost w-full" onClick={() => setDetail(null)}>Tutup</button></div>}</Modal>
  </div>;
}
