"use client";

import { useMemo, useState } from "react";
import { Api, type ServiceUpdatePayload } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { LabelledInput, LabelledSelect, LabelledTextarea } from "@/components/ui/InputField";
import { formatDateTimeShort, formatRupiah } from "@/lib/utils/formatters";
import { ServiceStatusBadge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { useApiList } from "@/hooks/useApiList";
import type { ServiceStatus, ServiceTicket, Sparepart, UploadedImage } from "@/lib/types";

export default function ServiceListPage(): JSX.Element {
  const { user } = useAuth(); const { showToast } = useToast(); const cabangTz = useCabangTimezones(); const [filter, setFilter] = useState(""); const [editing, setEditing] = useState<ServiceTicket | null>(null); const [status, setStatus] = useState<ServiceStatus>("Antrian"); const [note, setNote] = useState(""); const [technician, setTechnician] = useState(""); const [estimate, setEstimate] = useState(""); const [before, setBefore] = useState<UploadedImage[]>([]); const [after, setAfter] = useState<UploadedImage[]>([]); const [saving, setSaving] = useState(false); const [spQuery, setSpQuery] = useState("");
  const { items, loading, error, reload: load } = useApiList<ServiceTicket>(() => Api.service.list({ limit: 50 }).then((r) => r.data ?? []), [], "Gagal memuat service");
  // Teknisi picks sparepart straight from cabang stock while a repair is
  // Proses — stock isn't actually decremented until the ticket is marked
  // Selesai (see backend update_service), so this is safe to add/remove
  // freely while still working on the unit.
  const isTeknisi = user?.role === "teknisi";
  const { items: stokItems, loading: stokLoading, reload: reloadStok } = useApiList<Sparepart>(() => (isTeknisi ? Api.sparepart.list({ jenis: "repair" }).then((r) => r.data ?? []) : Promise.resolve([])), [isTeknisi], "Gagal memuat stok sparepart");
  const visibleStok = useMemo(() => stokItems.filter((s) => `${s.nama} ${s.sp_id}`.toLowerCase().includes(spQuery.toLowerCase())), [stokItems, spQuery]);
  const useSp = async (sp: Sparepart) => {
    if (!editing) return;
    const input = window.prompt(`Jumlah ${sp.nama} yang dipakai:`, "1");
    if (input === null) return;
    const jumlah = Number(input);
    if (!jumlah || jumlah <= 0) { showToast("Jumlah harus lebih dari 0", "error"); return; }
    try { const res = await Api.service.useSparepart(editing.service_id, { sp_id: sp.sp_id, jumlah }); setEditing(res.data); showToast(`${sp.nama} ditambahkan`); await reloadStok(); } catch (e) { showToast(e instanceof Error ? e.message : "Gagal menambahkan sparepart", "error"); }
  };
  const removeSp = async (spId: string) => {
    if (!editing) return;
    try { const res = await Api.service.removeSparepart(editing.service_id, spId); setEditing(res.data); showToast("Sparepart dibatalkan"); await reloadStok(); } catch (e) { showToast(e instanceof Error ? e.message : "Gagal membatalkan sparepart", "error"); }
  };
  // Default the picker to the natural "next" status instead of the ticket's
  // current one — the current status is no longer offered as a no-op
  // choice (see `options` below), so leaving it as the initial value would
  // show a status that isn't actually selectable.
  const nextDefaultStatus = (current: ServiceStatus): ServiceStatus => (current === "Antrian" ? "Proses" : current === "Proses" ? "Selesai" : current);
  const openEdit = async (id: string) => { try { const service = (await Api.service.get(id)).data; setEditing(service); setStatus(nextDefaultStatus(service.status)); setNote(service.catatan_kerusakan || ""); setTechnician(service.teknisi || user?.name || ""); setEstimate(service.estimasi_selesai ? service.estimasi_selesai.replace(" ", "T").slice(0,16) : ""); setBefore((service.foto_before_urls || []).map((secure_url) => ({ secure_url }))); setAfter((service.foto_after_urls || []).map((secure_url) => ({ secure_url }))); } catch (e) { showToast(e instanceof Error ? e.message : "Detail service gagal", "error"); } };
  const save = async () => { if (!editing || saving) return; if (editing.status === "Antrian" && status === "Proses" && !before.length) { showToast("Foto BEFORE wajib diupload", "error"); return; } if (editing.status === "Proses" && status === "Selesai" && !after.length) { showToast("Foto AFTER wajib diupload", "error"); return; } setSaving(true); const payload: ServiceUpdatePayload = { status, catatan_kerusakan: note || undefined, teknisi: technician || undefined, estimasi_selesai: estimate || undefined, foto_before_urls: before.map((i) => i.secure_url), foto_after_urls: after.map((i) => i.secure_url) }; try { await Api.service.update(editing.service_id, payload); showToast("Service berhasil diupdate"); setEditing(null); await load(); } catch (e) { showToast(e instanceof Error ? e.message : "Update service gagal", "error"); } finally { setSaving(false); } };
  const visible = filter ? items.filter((item) => item.status === filter) : items;
  // Teknisi only ever needs to move a ticket forward — offering the ticket's
  // own current status (a no-op) or "Antrian" mid-repair was just noise.
  // "Ditolak" is relabelled "Gagal" once work has actually started (Proses),
  // since at that point it means the repair failed, not that the request
  // itself was declined — same backend value either way.
  const options: { value: ServiceStatus; label: string }[] = user?.role === "teknisi"
    ? (editing?.status === "Antrian" ? [{ value: "Proses", label: "Proses" }, { value: "Ditolak", label: "Ditolak" }]
      : editing?.status === "Proses" ? [{ value: "Selesai", label: "Selesai" }, { value: "Ditolak", label: "Gagal" }]
      : editing?.status === "Menunggu_Sparepart" ? [{ value: "Proses", label: "Proses (lanjut tanpa sparepart ini)" }, { value: "Ditolak", label: "Gagal" }]
      : editing ? [{ value: editing.status, label: editing.status }] : [])
    : (["Antrian", "Proses", "Selesai", "Approved", "Ditolak"] as ServiceStatus[]).map((s) => ({ value: s, label: s }));
  return <div className="jp-page"><div><h1 className="jp-page-title">Data Service</h1><p className="text-sm text-jp-muted dark:text-jp-muted-dark">Workspace teknisi untuk memproses tiket</p></div><div className="segmented-control">{["","Antrian","Proses","Menunggu_Sparepart","Selesai","Ditolak"].map((s) => <button type="button" key={s || "all"} onClick={() => setFilter(s)} className={`filter-tab ${filter === s ? "filter-tab-active" : ""}`}>{s === "Menunggu_Sparepart" ? "Menunggu Sparepart" : (s || "Semua")}</button>)}</div>{loading ? <LoadingSkeleton numberOfRows={5}/> : error ? <ErrorState message={error} onRetry={load}/> : visible.length ? <div className="space-y-3">{visible.map((s) => <div className="svc-card" key={s.service_id}><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="mb-1.5 flex flex-wrap items-center gap-2"><span className="text-[10px] text-jp-muted dark:text-jp-muted-dark">{s.service_id}</span><ServiceStatusBadge status={s.status as ServiceStatus}/></div><p className="font-semibold">{s.unit_label}</p><p className="font-mono text-[11px] text-jp-muted dark:text-jp-muted-dark">{s.unit_id}</p><p className="mt-1 text-sm text-jp-muted dark:text-jp-muted-dark">{s.keluhan}</p>{s.catatan_kerusakan && <p className="mt-1 text-[11px] italic text-jp-muted dark:text-jp-muted-dark">{s.catatan_kerusakan}</p>}<p className="mt-2 text-[11px] text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(s.created_at, resolveCabangTimezone(cabangTz, s.cabang))}</p></div>{((user?.role === "teknisi" && ["Antrian","Proses","Menunggu_Sparepart"].includes(s.status)) || user?.role === "owner") && <button type="button" className="btn-ghost" onClick={() => void openEdit(s.service_id)}>Update</button>}</div></div>)}</div> : <EmptyState message="Tidak ada tiket service" iconName="wrenchSvg"/>}
    <Modal isOpen={Boolean(editing)} onClose={() => { if (!saving) setEditing(null); }} title={editing ? `Update ${editing.service_id}` : "Update Service"} maxWidthClassName="max-w-2xl">{editing && <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void save(); }}><LabelledSelect label="Status Pengerjaan" value={status} onChange={(e) => setStatus(e.target.value as ServiceStatus)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</LabelledSelect>{editing.status === "Antrian" && <div className="rounded-jp-sm border border-jp-teal-muted bg-jp-teal-soft p-3 dark:border-jp-teal-dark/25 dark:bg-jp-teal-soft-dark"><p className="mb-2 text-xs font-semibold text-jp-teal dark:text-jp-teal-dark">Foto Before wajib sebelum mulai service</p><ImageUploader id="service-before" maxFiles={5} initialImages={before} folder="jayaphone/service/before" onChange={setBefore}/></div>}{editing.status === "Proses" && isTeknisi && <div className="space-y-2 rounded-jp-sm border border-jp-border bg-jp-surface-subtle p-3 dark:border-jp-border-dark dark:bg-jp-surface-subtle-dark/60"><p className="text-xs font-semibold text-jp-text dark:text-jp-text-dark">Pakai Sparepart dari Stok Cabang</p>{editing.sparepart_items && editing.sparepart_items.length > 0 && <ul className="space-y-1">{editing.sparepart_items.map((it) => <li key={it.sp_id} className="flex items-center justify-between rounded-jp-sm bg-jp-surface px-2.5 py-1.5 text-[11px] dark:bg-jp-surface-dark"><span>{it.nama} x{it.jumlah} <span className="text-jp-muted dark:text-jp-muted-dark">({formatRupiah(it.harga_modal * it.jumlah)})</span></span><button type="button" className="text-jp-danger hover:underline dark:text-jp-danger-dark" onClick={() => void removeSp(it.sp_id)}>Batal</button></li>)}</ul>}<input className="field-control text-xs" placeholder="Cari sparepart di stok..." value={spQuery} onChange={(e) => setSpQuery(e.target.value)}/>{stokLoading ? <LoadingSkeleton numberOfRows={2}/> : <div className="max-h-40 space-y-1 overflow-y-auto">{visibleStok.length ? visibleStok.map((sp) => <div key={sp.sp_id} className="flex items-center justify-between rounded-jp-sm px-2.5 py-1.5 text-[11px] hover:bg-jp-surface dark:hover:bg-jp-surface-dark"><span>{sp.nama} <span className={sp.stok <= 0 ? "text-jp-danger dark:text-jp-danger-dark" : "text-jp-muted dark:text-jp-muted-dark"}>({sp.stok} {sp.satuan})</span></span><button type="button" className="btn-ghost" onClick={() => void useSp(sp)}>Pakai</button></div>) : <p className="px-2.5 py-1.5 text-[11px] text-jp-muted dark:text-jp-muted-dark">Tidak ada sparepart yang cocok</p>}</div>}</div>}{editing.status === "Proses" && <div className="rounded-jp-sm border border-jp-border-strong bg-jp-info-soft p-3 dark:border-jp-border-dark dark:bg-jp-surface-subtle-dark"><p className="mb-2 text-xs font-semibold text-jp-text-soft dark:text-jp-info-dark">Foto After wajib saat service selesai</p><ImageUploader id="service-after" maxFiles={5} initialImages={after} folder="jayaphone/service/after" onChange={setAfter}/></div>}<LabelledTextarea label="Catatan Kerusakan" rows={3} value={note} onChange={(e) => setNote(e.target.value)}/><LabelledInput label="Nama Teknisi" value={technician} onChange={(e) => setTechnician(e.target.value)}/><LabelledInput label="Estimasi Selesai" type="datetime-local" value={estimate} onChange={(e) => setEstimate(e.target.value)}/><button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Menyimpan..." : "Update Service"}</button></form>}</Modal>
  </div>;
}
