"use client";
import { useMemo, useState } from "react";
import { Api } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { LabelledInput, LabelledSelect, LabelledTextarea } from "@/components/ui/InputField";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useApiList } from "@/hooks/useApiList";
import { formatRupiah } from "@/lib/utils/formatters";
import type { RequestSparepart, RequestSparepartJenis, ServiceTicket, Sparepart } from "@/lib/types";

const STATUS_TABS = ["", "Pending", "Menunggu_Pembelian", "Menunggu_Barang", "Diterima", "Digunakan", "Ditolak"];
const STATUS_LABEL: Record<string, string> = {
  Pending: "Pending", Menunggu_Pembelian: "Menunggu Pembelian", Menunggu_Barang: "Menunggu Barang",
  Diterima: "Diterima", Digunakan: "Digunakan", Ditolak: "Ditolak",
};

export default function RequestSparepartPage(): JSX.Element {
  const { user } = useAuth(); const { showToast } = useToast();
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<RequestSparepart | null>(null);
  const [type, setType] = useState("SPAREPART");
  const [jenis, setJenis] = useState<RequestSparepartJenis>("repair");
  const [serviceId, setServiceId] = useState("");
  const [name, setName] = useState(""); const [quantity, setQuantity] = useState("1"); const [spId, setSpId] = useState("");
  const [hargaDiajukan, setHargaDiajukan] = useState(""); const [alasan, setAlasan] = useState("");
  const [productLink, setProductLink] = useState(""); const [note, setNote] = useState(""); const [estimate, setEstimate] = useState("");
  const [hargaDisetujui, setHargaDisetujui] = useState("");
  const [stokQuery, setStokQuery] = useState("");

  const canCreate = user?.role === "teknisi"; const canApprove = user?.role === "kepala_cabang" || user?.role === "owner";

  const { items, loading, error, reload: load } = useApiList<RequestSparepart>(
    () => Api.requestSparepart.list({ status: status || undefined }).then((r) => r.data ?? []),
    [status], "Gagal memuat request sparepart"
  );
  // Teknisi checks branch stock right here, before requesting a part that
  // might already be on the shelf — a separate inventory page would just
  // duplicate this same GET /sparepart call, so it's folded into this page.
  const { items: stokItems, loading: stokLoading } = useApiList<Sparepart>(() => (canCreate ? Api.sparepart.list({}).then((r) => r.data ?? []) : Promise.resolve([])), [canCreate], "Gagal memuat stok sparepart");
  const visibleStok = useMemo(() => stokItems.filter((s) => `${s.nama} ${s.sp_id} ${s.kategori}`.toLowerCase().includes(stokQuery.toLowerCase())), [stokItems, stokQuery]);

  // Request jenis=repair harus terkait tiket service yang sedang dikerjakan
  // teknisi ini — dipilih lewat picker, bukan diketik manual, supaya tidak
  // ada salah-ketik service_id.
  const { items: openTickets } = useApiList<ServiceTicket>(
    () => (canCreate ? Api.service.list({ status: "Proses", limit: 100 }).then((r) => r.data ?? []) : Promise.resolve([])),
    [canCreate], "Gagal memuat tiket servis"
  );
  const myOpenTickets = useMemo(() => openTickets.filter((t) => t.teknisi === user?.name), [openTickets, user]);

  const openRequestForm = (prefill?: Sparepart) => {
    setType("SPAREPART"); setJenis("repair"); setServiceId(""); setName(prefill?.nama ?? ""); setQuantity("1");
    setSpId(prefill?.sp_id ?? ""); setHargaDiajukan(""); setAlasan(""); setProductLink(""); setNote(""); setFormOpen(true);
  };

  const create = async () => {
    if (!name.trim() || Number(quantity) <= 0) { showToast("Nama sparepart dan jumlah wajib diisi", "error"); return; }
    if (!spId.trim() && !productLink.trim().startsWith("https://")) { showToast("Link produk (https://...) wajib diisi jika SP ID kosong", "error"); return; }
    if (!Number(hargaDiajukan) || Number(hargaDiajukan) <= 0) { showToast("Harga yang diajukan wajib diisi", "error"); return; }
    if (!alasan.trim()) { showToast("Alasan request wajib diisi", "error"); return; }
    if (jenis === "repair" && !serviceId) { showToast("Pilih tiket servis yang sedang Anda kerjakan", "error"); return; }
    try {
      await Api.requestSparepart.create({
        tipe: type, jenis, service_id: jenis === "repair" ? serviceId : undefined,
        sp_id: spId || undefined, nama_sp: name.trim(), jumlah: Number(quantity),
        harga_diajukan: Number(hargaDiajukan), alasan: alasan.trim(),
        keterangan: note || undefined, cabang: user?.cabang || "JYP", product_link: productLink.trim() || undefined,
      });
      showToast("Request sparepart berhasil dibuat"); setFormOpen(false); await load();
    } catch (e) { showToast(e instanceof Error ? e.message : "Request gagal dibuat", "error"); }
  };

  const respond = async (decision: "Diterima" | "Ditolak") => {
    if (!selected) return;
    if (decision === "Ditolak" && !note.trim()) { showToast("Catatan wajib diisi saat menolak", "error"); return; }
    if (decision === "Diterima" && (!Number(hargaDisetujui) || Number(hargaDisetujui) <= 0)) { showToast("Harga yang disetujui wajib diisi", "error"); return; }
    try {
      await Api.requestSparepart.respond(selected.req_id, {
        status: decision,
        harga_disetujui: decision === "Diterima" ? Number(hargaDisetujui) : undefined,
        estimasi_tiba: decision === "Diterima" ? (estimate || undefined) : undefined,
        catatan: note || undefined,
      });
      showToast(decision === "Diterima" ? "Request disetujui, menunggu pembelian kasir" : "Request ditolak");
      setSelected(null); setNote(""); await load();
    } catch (e) { showToast(e instanceof Error ? e.message : "Aksi request gagal", "error"); }
  };

  return <div className="jp-page">
    <div className="jp-page-header">
      <div><h1 className="jp-page-title">Request Sparepart</h1><p className="text-sm text-jp-muted dark:text-jp-muted-dark">Permintaan sparepart/equipment untuk service dan stok</p></div>
      {canCreate && <button type="button" className="btn-primary" onClick={() => openRequestForm()}>+ Request Baru</button>}
    </div>
    {canCreate && <p className="rounded-jp-sm bg-jp-surface-subtle p-3 text-[11px] text-jp-muted dark:bg-jp-surface-subtle-dark/60 dark:text-jp-muted-dark">
      Alur: Request Anda dengan harga diajukan + alasan (Pending) → direview Kepala Cabang, harga dikunci (Menunggu Pembelian), atau Ditolak → Kasir catat pembelian (Menunggu Barang) → Kasir konfirmasi barang sampai (Diterima) → sparepart masuk inventory. Untuk jenis Repair, part langsung direservasi ke tiket servis yang Anda pilih (Digunakan) — tidak perlu request lagi lewat halaman Sparepart.
    </p>}
    {canCreate && <div className="space-y-2">
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-jp-text dark:text-jp-text-dark">Cek Stok Cabang</h2><input className="field-control w-full max-w-xs" placeholder="Cari sparepart..." value={stokQuery} onChange={(e) => setStokQuery(e.target.value)}/></div>
      {stokLoading ? <LoadingSkeleton numberOfRows={3}/> : <div className="table-wrap overflow-x-auto rounded-jp-md"><table className="w-full text-xs"><thead className="tbl-head border-b"><tr>{["ID","Nama","Kategori","Stok","Harga Jual","Aksi"].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead><tbody>{visibleStok.length ? visibleStok.map((s) => <tr key={s.sp_id} className="tbl-row"><td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{s.sp_id}</td><td className="px-5 py-4 font-medium">{s.nama}</td><td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{s.kategori}</td><td className={`px-5 py-4 font-semibold ${s.stok <= 0 ? "text-jp-danger dark:text-jp-danger-dark" : "font-mono text-jp-text dark:text-jp-text-dark"}`}>{s.stok} {s.satuan}</td><td className="px-5 py-4">{formatRupiah(s.harga_jual)}</td><td className="tbl-action-col px-5 py-4"><button type="button" className="btn-ghost" onClick={() => openRequestForm(s)}>Request</button></td></tr>) : <tr><td colSpan={6}><EmptyState message={stokQuery ? "Tidak ada sparepart yang cocok dengan pencarian" : "Belum ada sparepart di cabang Anda"} iconName="wrenchSvg"/></td></tr>}</tbody></table></div>}
    </div>}
    <div className="segmented-control">{STATUS_TABS.map((s) => <button type="button" key={s || "all"} className={`filter-tab ${status === s ? "filter-tab-active" : ""}`} onClick={() => setStatus(s)}>{s ? (STATUS_LABEL[s] ?? s) : "Semua"}</button>)}</div>
    {loading ? <LoadingSkeleton numberOfRows={5}/> : error ? <ErrorState message={error} onRetry={load}/> : <div className="table-wrap overflow-x-auto rounded-jp-md"><table className="w-full text-xs"><thead className="tbl-head border-b"><tr>{["Request","Sparepart","Jenis","Jumlah","Harga Diajukan/Disetujui","Cabang","Status","Aksi"].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead><tbody>{items.length ? items.map((r) => <tr key={r.id} className="tbl-row"><td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{r.req_id}</td><td className="px-5 py-4"><p className="font-medium">{r.nama_sp}</p><p className="text-[10px] text-jp-muted dark:text-jp-muted-dark">{r.sp_id || "Custom"}{r.service_id ? ` · ${r.service_id}` : ""}</p>{r.alasan && <p className="mt-0.5 text-[10px] italic text-jp-muted dark:text-jp-muted-dark">&ldquo;{r.alasan}&rdquo;</p>}</td><td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{r.jenis === "equipment" ? "Equipment" : "Repair"}</td><td className="px-5 py-4">{r.jumlah}</td><td className="px-5 py-4">{r.harga_disetujui ? formatRupiah(r.harga_disetujui) : r.harga_diajukan ? <span className="text-jp-muted dark:text-jp-muted-dark">{formatRupiah(r.harga_diajukan)} (diajukan)</span> : "-"}</td><td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{r.cabang}</td><td className="px-5 py-4"><span className="badge badge-booking">{STATUS_LABEL[r.status] ?? r.status}</span></td><td className="tbl-action-col px-5 py-4">{canApprove && r.status === "Pending" ? <button type="button" className="btn-ghost" onClick={() => { setSelected(r); setEstimate(""); setNote(""); setHargaDisetujui(String(r.harga_diajukan ?? "")); }}>Proses</button> : <span className="text-jp-muted dark:text-jp-muted-dark">—</span>}</td></tr>) : <tr><td colSpan={8}><EmptyState message="Belum ada request sparepart" iconName="packageSvg"/></td></tr>}</tbody></table></div>}

    <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Request Sparepart">
      <div className="space-y-3">
        <LabelledSelect label="Jenis" value={jenis} onChange={(e) => setJenis(e.target.value as RequestSparepartJenis)}>
          <option value="repair">Repair (dipakai di tiket servis)</option>
          <option value="equipment">Equipment (alat kerja teknisi)</option>
        </LabelledSelect>
        {jenis === "repair" && <LabelledSelect label="Tiket Servis" required value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">— pilih tiket —</option>
          {myOpenTickets.map((t) => <option key={t.service_id} value={t.service_id}>{t.service_id} — {t.unit_label}</option>)}
        </LabelledSelect>}
        {jenis === "repair" && myOpenTickets.length === 0 && <p className="text-[11px] text-jp-danger dark:text-jp-danger-dark">Tidak ada tiket servis Proses yang bisa dipilih — mulai servis dulu di halaman Data Service.</p>}
        <LabelledSelect label="Tipe" value={type} onChange={(e) => setType(e.target.value)}><option>SPAREPART</option><option>Servis</option><option>Barang</option></LabelledSelect>
        <LabelledInput label="Nama Sparepart" required value={name} onChange={(e) => setName(e.target.value)}/>
        {spId && <p className="rounded-jp-sm bg-jp-surface-subtle px-3 py-2 text-xs text-jp-muted dark:bg-jp-surface-subtle-dark/60 dark:text-jp-muted-dark">Dari stok cabang: <span className="font-mono font-medium text-jp-text dark:text-jp-text-dark">{spId}</span></p>}
        <LabelledInput label="Jumlah" type="number" min={1} required value={quantity} onChange={(e) => setQuantity(e.target.value)}/>
        <LabelledInput label="Harga yang Diajukan (per satuan)" type="number" min={1} required value={hargaDiajukan} onChange={(e) => setHargaDiajukan(e.target.value)}/>
        <LabelledTextarea label="Alasan" required rows={2} helper="Jelaskan kenapa part/alat ini dibutuhkan — dipakai Kepala Cabang untuk review." value={alasan} onChange={(e) => setAlasan(e.target.value)}/>
        {!spId && <LabelledInput label="Link Produk" required type="url" placeholder="https://..." helper="Part ini belum ada di stok cabang — isi link referensi barang yang mau dibeli. Kalau partnya sudah ada di stok tapi kosong, klik &quot;Request&quot; langsung dari tabel Cek Stok Cabang di bawah, bukan lewat form ini." value={productLink} onChange={(e) => setProductLink(e.target.value)}/>}
        <LabelledTextarea label="Keterangan" rows={2} value={note} onChange={(e) => setNote(e.target.value)}/>
        <button type="button" className="btn-primary w-full" onClick={() => void create()}>Kirim Request</button>
      </div>
    </Modal>

    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Proses ${selected.req_id}` : "Proses Request"}>
      <div className="space-y-3">
        <p className="text-sm text-jp-muted dark:text-jp-muted-dark">{selected?.nama_sp} · {selected?.jumlah} unit · {selected?.jenis === "equipment" ? "Equipment" : "Repair"}{selected?.service_id ? ` · ${selected.service_id}` : ""}</p>
        {selected?.alasan && <p className="rounded-jp-sm bg-jp-surface-subtle p-3 text-xs text-jp-muted dark:bg-jp-surface-subtle-dark/60 dark:text-jp-muted-dark"><span className="font-medium text-jp-text dark:text-jp-text-dark">Alasan teknisi: </span>{selected.alasan}</p>}
        <p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">Harga diajukan teknisi: <span className="font-medium text-jp-text dark:text-jp-text-dark">{selected?.harga_diajukan ? formatRupiah(selected.harga_diajukan) : "-"}</span>. Menyetujui akan mengunci harga dan meneruskan ke Kasir untuk pembelian.</p>
        <LabelledInput label="Harga yang Disetujui (per satuan)" type="number" min={1} value={hargaDisetujui} onChange={(e) => setHargaDisetujui(e.target.value)}/>
        <LabelledInput label="Estimasi Tiba" type="date" value={estimate} onChange={(e) => setEstimate(e.target.value)}/>
        <LabelledTextarea label="Catatan" rows={3} value={note} onChange={(e) => setNote(e.target.value)}/>
        <div className="flex gap-2"><button type="button" className="btn-error flex-1" onClick={() => void respond("Ditolak")}>Tolak</button><button type="button" className="btn-success flex-1" onClick={() => void respond("Diterima")}>Setujui</button></div>
      </div>
    </Modal>
  </div>;
}
