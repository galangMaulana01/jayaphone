"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Api } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { LabelledInput, LabelledSelect, LabelledTextarea } from "@/components/ui/InputField";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useApiList } from "@/hooks/useApiList";
import { formatRupiah, formatDateTimeShort, NOT_SET } from "@/lib/utils/formatters";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import type { Sparepart, SparepartInUseItem, SparepartJenis, ServiceTicket } from "@/lib/types";

type SparepartTab = "tersedia" | "sedang_dipakai" | "riwayat" | "untuk_dijual";
const JENIS_OPTIONS: { value: SparepartJenis; label: string }[] = [
  { value: "repair", label: "Repair (dipakai teknisi)" },
  { value: "dijual", label: "Dijual (langsung ke customer)" },
  { value: "equipment", label: "Equipment (alat kerja teknisi)" },
];

export default function SparepartPage(): JSX.Element {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const cabangTz = useCabangTimezones();
  const [tab, setTab] = useState<SparepartTab>("tersedia");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [stockItem, setStockItem] = useState<Sparepart | null>(null);
  const [useItem, setUseItem] = useState<Sparepart | null>(null);
  const [useServiceId, setUseServiceId] = useState("");
  const [useJumlah, setUseJumlah] = useState("1");
  const [name, setName] = useState("");
  const [cat, setCat] = useState("Aksesoris");
  const [jenis, setJenis] = useState<SparepartJenis>("repair");
  const [buy, setBuy] = useState("");
  const [sell, setSell] = useState("");
  const [stock, setStock] = useState("1");
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");

  // Backend only lets kepala_cabang/owner create sparepart or adjust stock
  // (require_kepala_or_owner on POST /sparepart and PATCH /{id}/stok) — kasir
  // reaches this same page read-only, to check availability, not manage it.
  const canManage = user?.role === "owner" || user?.role === "kepala_cabang";
  const isTeknisi = user?.role === "teknisi";

  const { items: tersedia, loading: tersediaLoading, error: tersediaError, reload: reloadTersedia } =
    useApiList<Sparepart>(() => Api.sparepart.list({ kategori: category || undefined, jenis: "repair" }).then((r) => r.data ?? []), [category], "Gagal memuat sparepart tersedia");
  const { items: dijual, loading: dijualLoading, error: dijualError, reload: reloadDijual } =
    useApiList<Sparepart>(() => Api.sparepart.list({ kategori: category || undefined, jenis: "dijual" }).then((r) => r.data ?? []), [category], "Gagal memuat sparepart untuk dijual");
  const { items: sedangDipakai, loading: dipakaiLoading, error: dipakaiError, reload: reloadDipakai } =
    useApiList<SparepartInUseItem>(() => Api.sparepart.inUse().then((r) => r.data ?? []), [], "Gagal memuat sparepart sedang dipakai");
  // Transien: cuma tampil beberapa jam setelah tiketnya Selesai (lihat
  // RIWAYAT_WINDOW_HOURS di backend), lalu menghilang dari sini walau
  // datanya tetap ada di tiket.
  const { items: riwayat, loading: riwayatLoading, error: riwayatError, reload: reloadRiwayat } =
    useApiList<SparepartInUseItem>(() => Api.sparepart.riwayat().then((r) => r.data ?? []), [], "Gagal memuat riwayat pemakaian sparepart");
  // Open tickets to pick from in "Gunakan Sparepart" — teknisi only sees their
  // own (backend's use_sparepart 403s otherwise anyway), owner sees all.
  const { items: openTickets } = useApiList<ServiceTicket>(
    () => (isTeknisi || user?.role === "owner" ? Api.service.list({ status: "Proses", limit: 100 }).then((r) => r.data ?? []) : Promise.resolve([])),
    [isTeknisi, user?.role],
    "Gagal memuat tiket servis",
  );
  const myOpenTickets = useMemo(
    () => (user?.role === "owner" ? openTickets : openTickets.filter((t) => t.teknisi === user?.name)),
    [openTickets, user],
  );

  const totalSparepart = tersedia.length + dijual.length;
  const reloadAll = async () => { await Promise.all([reloadTersedia(), reloadDijual(), reloadDipakai(), reloadRiwayat()]); };

  const visibleTersedia = useMemo(() => tersedia.filter((s) => `${s.nama} ${s.sp_id} ${s.kategori}`.toLowerCase().includes(query.toLowerCase())), [tersedia, query]);
  const visibleDijual = useMemo(() => dijual.filter((s) => `${s.nama} ${s.sp_id} ${s.kategori}`.toLowerCase().includes(query.toLowerCase())), [dijual, query]);

  const openCreate = () => { setName(""); setCat("Aksesoris"); setJenis("repair"); setBuy(""); setSell(""); setStock("1"); setFormOpen(true); };
  const create = async () => {
    if (!name.trim() || Number(sell) <= 0) { showToast("Nama dan harga jual wajib diisi", "error"); return; }
    try {
      await Api.sparepart.create({ nama: name.trim(), kategori: cat, jenis, satuan: "pcs", harga_beli: Number(buy) || 0, harga_jual: Number(sell), stok: Number(stock) || 0, cabang: user?.cabang || "JYP" });
      showToast("Sparepart berhasil ditambahkan"); setFormOpen(false); await reloadAll();
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal menambah sparepart", "error"); }
  };
  const updateStock = async () => {
    if (!stockItem || !delta) return;
    try {
      await Api.sparepart.updateStok(stockItem.sp_id, { delta: Number(delta), catatan: note || undefined });
      showToast("Stok sparepart diperbarui"); setStockItem(null); setDelta(""); setNote(""); await reloadAll();
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal memperbarui stok", "error"); }
  };
  const openUse = (sp: Sparepart) => { setUseItem(sp); setUseServiceId(""); setUseJumlah("1"); };
  const confirmUse = async () => {
    if (!useItem || !useServiceId) { showToast("Pilih tiket servis tujuan", "error"); return; }
    if (Number(useJumlah) <= 0) { showToast("Jumlah harus lebih dari 0", "error"); return; }
    try {
      await Api.service.useSparepart(useServiceId, { sp_id: useItem.sp_id, jumlah: Number(useJumlah) });
      showToast(`${useItem.nama} dialokasikan ke ${useServiceId}`); setUseItem(null); await reloadAll();
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal menggunakan sparepart", "error"); }
  };

  const tabs: { key: SparepartTab; label: string; count: number }[] = [
    { key: "tersedia", label: "Sparepart Tersedia", count: tersedia.length },
    { key: "sedang_dipakai", label: "Sparepart Sedang Dipakai", count: sedangDipakai.length },
    { key: "riwayat", label: "Riwayat Pemakaian", count: riwayat.length },
    { key: "untuk_dijual", label: "Sparepart Untuk Dijual", count: dijual.length },
  ];

  return (
    <div className="jp-page">
      <div className="jp-page-header">
        <div>
          <h1 className="jp-page-title">Sparepart</h1>
          <p className="text-sm text-jp-muted dark:text-jp-muted-dark">{canManage ? "Master sparepart dan stok cabang" : "Cek ketersediaan sparepart di cabang Anda"}</p>
        </div>
        {canManage && <button type="button" className="btn-primary" onClick={openCreate}>+ Tambah Sparepart</button>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="metric-card"><p className="label">Total Sparepart</p><p className="mt-1 jp-page-title">{totalSparepart}</p><p className="mt-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">Semua sparepart</p></div>
        <div className="metric-card"><p className="label">Sparepart Tersedia</p><p className="mt-1 jp-page-title text-jp-teal dark:text-jp-teal">{tersedia.length}</p><p className="mt-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">Siap digunakan</p></div>
        <div className="metric-card"><p className="label">Sedang Dipakai</p><p className="mt-1 jp-page-title">{sedangDipakai.length}</p><p className="mt-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">Sedang digunakan di service</p></div>
        <div className="metric-card"><p className="label">Untuk Dijual</p><p className="mt-1 jp-page-title">{dijual.length}</p><p className="mt-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">Untuk penjualan ke customer</p></div>
      </div>

      <div className="segmented-control">
        {tabs.map((t) => <button type="button" key={t.key} className={`filter-tab ${tab === t.key ? "filter-tab-active" : ""}`} onClick={() => setTab(t.key)}>{t.label} ({t.count})</button>)}
      </div>

      {tab !== "sedang_dipakai" && tab !== "riwayat" && (
        <div className="jp-toolbar">
          <input className="field-control w-full sm:max-w-md" placeholder="Cari sparepart..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="field-control w-full sm:w-auto" placeholder="Kategori" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
      )}

      {tab === "tersedia" && (
        tersediaLoading ? <LoadingSkeleton numberOfRows={5} /> : tersediaError ? <ErrorState message={tersediaError} onRetry={reloadTersedia} /> : (
          <div className="table-wrap overflow-x-auto rounded-jp-md">
            <table className="w-full text-xs">
              {/* Repair-jenis sparepart selalu punya harga_jual=0 (tidak dijual
                  ke customer) — kolom harga di tab ini SELALU tampilkan
                  Harga Modal ke SEMUA role (termasuk teknisi), bukan Harga
                  Jual, sesuai desain: biaya repair dihitung dari modal part,
                  bukan harga retail yang tidak relevan di sini. */}
              <thead className="tbl-head border-b"><tr>{["Kode", "Nama Sparepart", "Kategori", "Cabang", "Stok Bebas", "Sedang Dipakai", "Harga Modal", "Aksi"].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>
                {visibleTersedia.length ? visibleTersedia.map((s) => (
                  <tr key={s.sp_id} className="tbl-row">
                    <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{s.sp_id}</td>
                    <td className="px-5 py-4 font-medium">{s.nama}</td>
                    <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{s.kategori}</td>
                    <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{s.cabang}</td>
                    <td className={`px-5 py-4 font-semibold ${s.stok <= 0 ? "text-jp-danger dark:text-jp-danger-dark" : "font-mono text-jp-text dark:text-jp-text-dark"}`}>{s.stok} {s.satuan}</td>
                    <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{s.dipakai > 0 ? `${s.dipakai} ${s.satuan}` : "-"}</td>
                    <td className="px-5 py-4">{formatRupiah(s.harga_beli)}</td>
                    <td className="tbl-action-col px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {isTeknisi && <button type="button" className="btn-success" disabled={s.stok <= 0} onClick={() => openUse(s)}>Gunakan Sparepart</button>}
                        {canManage && <button type="button" className="btn-ghost" onClick={() => setStockItem(s)}>Update Stok</button>}
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan={8}><EmptyState message="Belum ada sparepart tersedia" iconName="wrenchSvg" /></td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "sedang_dipakai" && (
        dipakaiLoading ? <LoadingSkeleton numberOfRows={5} /> : dipakaiError ? <ErrorState message={dipakaiError} onRetry={reloadDipakai} /> : (
          sedangDipakai.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sedangDipakai.map((it, idx) => (
                <div key={`${it.service_id}-${it.sp_id}-${idx}`} className="panel space-y-3 rounded-jp-md p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{it.nama}</p>
                    <span className="badge badge-booking">Sedang Dipakai</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-jp-muted dark:text-jp-muted-dark">Kode</p><p className="font-mono">{it.sp_id}</p></div>
                    <div><p className="text-jp-muted dark:text-jp-muted-dark">Kategori</p><p>{it.kategori || NOT_SET}</p></div>
                    <div><p className="text-jp-muted dark:text-jp-muted-dark">Jumlah</p><p className="font-mono">{it.jumlah}</p></div>
                    <div><p className="text-jp-muted dark:text-jp-muted-dark">Harga Modal</p><p className="font-mono">{formatRupiah(it.harga_modal)}</p></div>
                  </div>
                  <div className="border-t border-jp-border pt-3 text-xs dark:border-jp-border-dark">
                    <p className="text-jp-muted dark:text-jp-muted-dark">Untuk Service</p>
                    <p className="font-medium">{it.service_id} · {it.unit_label}</p>
                    {it.imei && <p className="font-mono text-[11px] text-jp-muted dark:text-jp-muted-dark">IMEI: {it.imei}</p>}
                    <p className="mt-1 text-jp-muted dark:text-jp-muted-dark">Teknisi</p>
                    <p className="font-medium">{it.teknisi || NOT_SET}</p>
                    <p className="mt-1 text-jp-muted dark:text-jp-muted-dark">Mulai Digunakan</p>
                    <p>{it.mulai_pakai ? formatDateTimeShort(it.mulai_pakai, resolveCabangTimezone(cabangTz, it.cabang)) : NOT_SET}</p>
                  </div>
                  <button type="button" className="btn-success w-full" onClick={() => router.push("/service-list")}>Selesaikan Pemakaian</button>
                </div>
              ))}
            </div>
          ) : <EmptyState message="Tidak ada sparepart yang sedang dipakai" iconName="wrenchSvg" />
        )
      )}

      {tab === "riwayat" && (
        <>
          <p className="rounded-jp-sm bg-jp-surface-subtle p-3 text-[11px] text-jp-muted dark:bg-jp-surface-subtle-dark/60 dark:text-jp-muted-dark">Sparepart yang baru selesai dipakai — tampil sementara di sini, lalu menghilang beberapa jam setelah tiketnya Selesai.</p>
          {riwayatLoading ? <LoadingSkeleton numberOfRows={5} /> : riwayatError ? <ErrorState message={riwayatError} onRetry={reloadRiwayat} /> : (
            riwayat.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {riwayat.map((it, idx) => (
                  <div key={`${it.service_id}-${it.sp_id}-${idx}`} className="panel space-y-3 rounded-jp-md p-4 opacity-80">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{it.nama}</p>
                      <span className="badge badge-selesai">Selesai Dipakai</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-jp-muted dark:text-jp-muted-dark">Kode</p><p className="font-mono">{it.sp_id}</p></div>
                      <div><p className="text-jp-muted dark:text-jp-muted-dark">Kategori</p><p>{it.kategori || NOT_SET}</p></div>
                      <div><p className="text-jp-muted dark:text-jp-muted-dark">Jumlah</p><p className="font-mono">{it.jumlah}</p></div>
                      <div><p className="text-jp-muted dark:text-jp-muted-dark">Harga Modal</p><p className="font-mono">{formatRupiah(it.harga_modal)}</p></div>
                    </div>
                    <div className="border-t border-jp-border pt-3 text-xs dark:border-jp-border-dark">
                      <p className="text-jp-muted dark:text-jp-muted-dark">Untuk Service</p>
                      <p className="font-medium">{it.service_id} · {it.unit_label}</p>
                      {it.imei && <p className="font-mono text-[11px] text-jp-muted dark:text-jp-muted-dark">IMEI: {it.imei}</p>}
                      <p className="mt-1 text-jp-muted dark:text-jp-muted-dark">Teknisi</p>
                      <p className="font-medium">{it.teknisi || NOT_SET}</p>
                      <p className="mt-1 text-jp-muted dark:text-jp-muted-dark">Selesai Pakai</p>
                      <p>{it.selesai_pakai ? formatDateTimeShort(it.selesai_pakai, resolveCabangTimezone(cabangTz, it.cabang)) : NOT_SET}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState message="Belum ada riwayat pemakaian dalam beberapa jam terakhir" iconName="wrenchSvg" />
          )}
        </>
      )}

      {tab === "untuk_dijual" && (
        dijualLoading ? <LoadingSkeleton numberOfRows={5} /> : dijualError ? <ErrorState message={dijualError} onRetry={reloadDijual} /> : (
          <div className="table-wrap overflow-x-auto rounded-jp-md">
            <table className="w-full text-xs">
              <thead className="tbl-head border-b"><tr>{["Kode", "Nama Sparepart", "Kategori", "Cabang", "Stok", ...(canManage ? ["Harga Beli"] : []), "Harga Jual", ...(canManage ? ["Aksi"] : [])].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>
                {visibleDijual.length ? visibleDijual.map((s) => (
                  <tr key={s.sp_id} className="tbl-row">
                    <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{s.sp_id}</td>
                    <td className="px-5 py-4 font-medium">{s.nama}</td>
                    <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{s.kategori}</td>
                    <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{s.cabang}</td>
                    <td className={`px-5 py-4 font-semibold ${s.stok <= 0 ? "text-jp-danger dark:text-jp-danger-dark" : "font-mono text-jp-text dark:text-jp-text-dark"}`}>{s.stok} {s.satuan}</td>
                    {canManage && <td className="px-5 py-4">{formatRupiah(s.harga_beli)}</td>}
                    <td className="px-5 py-4">{formatRupiah(s.harga_jual)}</td>
                    {canManage && <td className="tbl-action-col px-5 py-4"><button type="button" className="btn-ghost" onClick={() => setStockItem(s)}>Update Stok</button></td>}
                  </tr>
                )) : <tr><td colSpan={canManage ? 8 : 6}><EmptyState message="Belum ada sparepart untuk dijual" iconName="packageSvg" /></td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}

      {canManage && (
        <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Tambah Sparepart">
          <div className="space-y-3">
            <LabelledInput label="Nama" value={name} onChange={(e) => setName(e.target.value)} />
            <LabelledInput label="Kategori" value={cat} onChange={(e) => setCat(e.target.value)} />
            <LabelledSelect label="Jenis" value={jenis} onChange={(e) => setJenis(e.target.value as SparepartJenis)}>
              {JENIS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </LabelledSelect>
            <div className="grid grid-cols-2 gap-3">
              <LabelledInput label="Harga Beli (Modal)" type="number" value={buy} onChange={(e) => setBuy(e.target.value)} />
              <LabelledInput label="Harga Jual" type="number" value={sell} onChange={(e) => setSell(e.target.value)} />
            </div>
            <LabelledInput label="Stok Awal" type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setFormOpen(false)}>Batal</button>
              <button type="button" className="btn-primary flex-1" onClick={() => void create()}>Simpan</button>
            </div>
          </div>
        </Modal>
      )}

      {canManage && (
        <Modal isOpen={Boolean(stockItem)} onClose={() => setStockItem(null)} title={stockItem ? `Update Stok ${stockItem.nama}` : "Update Stok"}>
          <div className="space-y-3">
            <p className="text-sm text-jp-muted dark:text-jp-muted-dark">Gunakan angka positif untuk menambah, negatif untuk mengurangi.</p>
            <LabelledInput label="Perubahan Stok" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="+10 atau -2" />
            <LabelledTextarea label="Catatan" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="button" className="btn-primary w-full" onClick={() => void updateStock()}>Simpan Perubahan</button>
          </div>
        </Modal>
      )}

      <Modal isOpen={Boolean(useItem)} onClose={() => setUseItem(null)} title="Gunakan Sparepart">
        <div className="space-y-3">
          {useItem && (
            <div className="grid grid-cols-2 gap-3 rounded-jp-sm bg-jp-surface-subtle p-3 text-xs dark:bg-jp-surface-subtle-dark/60">
              <div><p className="text-jp-muted dark:text-jp-muted-dark">Sparepart</p><p className="font-medium">{useItem.nama}</p></div>
              <div><p className="text-jp-muted dark:text-jp-muted-dark">Stok Tersedia</p><p className="font-mono">{useItem.stok} {useItem.satuan}</p></div>
              <div><p className="text-jp-muted dark:text-jp-muted-dark">Harga Modal</p><p className="font-mono">{formatRupiah(useItem.harga_beli)}</p></div>
            </div>
          )}
          <LabelledSelect label="Untuk Service" value={useServiceId} onChange={(e) => setUseServiceId(e.target.value)}>
            <option value="">Pilih tiket servis...</option>
            {myOpenTickets.map((t) => <option key={t.service_id} value={t.service_id}>{t.service_id} — {t.unit_label}</option>)}
          </LabelledSelect>
          {myOpenTickets.length === 0 && <p className="text-[11px] text-jp-danger dark:text-jp-danger-dark">Tidak ada tiket servis Proses yang bisa dipilih — mulai servis dulu di halaman Data Service.</p>}
          <LabelledInput label="Jumlah" type="number" min={1} max={useItem?.stok} value={useJumlah} onChange={(e) => setUseJumlah(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setUseItem(null)}>Batal</button>
            <button type="button" className="btn-success flex-1" onClick={() => void confirmUse()}>Gunakan Sparepart</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
