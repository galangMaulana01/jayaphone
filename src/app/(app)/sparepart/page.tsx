"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Api } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { LabelledInput, LabelledSelect, LabelledTextarea } from "@/components/ui/InputField";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useApiList } from "@/hooks/useApiList";
import { usePaginatedApiList } from "@/hooks/usePaginatedApiList";
import { useUrlParam } from "@/hooks/useUrlParam";
import { formatRupiah, formatDateTimeShort, NOT_SET } from "@/lib/utils/formatters";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import type { RequestSparepart, RequestSparepartJenis, Sparepart, SparepartInUseItem, SparepartJenis, ServiceTicket } from "@/lib/types";

type SparepartTab = "tersedia" | "sedang_dipakai" | "riwayat" | "untuk_dijual" | "request" | "menunggu_pembelian" | "menunggu_barang";
const SPAREPART_TABS: readonly SparepartTab[] = ["tersedia", "sedang_dipakai", "riwayat", "untuk_dijual", "request", "menunggu_pembelian", "menunggu_barang"];
const JENIS_OPTIONS: { value: SparepartJenis; label: string }[] = [
  { value: "repair", label: "Repair (dipakai teknisi)" },
  { value: "dijual", label: "Dijual (langsung ke customer)" },
  { value: "equipment", label: "Equipment (alat kerja teknisi)" },
];

const REQUEST_STATUS_TABS = ["", "Pending", "Menunggu_Pembelian", "Menunggu_Barang", "Diterima", "Digunakan", "Ditolak"];
const REQUEST_STATUS_LABEL: Record<string, string> = {
  Pending: "Pending", Menunggu_Pembelian: "Menunggu Pembelian", Menunggu_Barang: "Menunggu Barang",
  Diterima: "Diterima", Digunakan: "Digunakan", Ditolak: "Ditolak",
};
// Request jenis=repair (terkait tiket) hanya bisa dibuat dari dalam layar
// "Pilih Kebutuhan" di Data Service — tab ini cuma untuk request
// jenis=equipment (alat kerja teknisi, tidak terkait tiket manapun).
const REQUEST_JENIS: RequestSparepartJenis = "equipment";

export default function SparepartPage(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <SparepartPageInner />
    </Suspense>
  );
}

function SparepartPageInner(): JSX.Element {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const cabangTz = useCabangTimezones();
  // Single source of truth: the ?tab= query param, not local state — so the
  // sidebar's active child, this page's own segmented control, and the
  // rendered content can never disagree about which tab is showing (see
  // useUrlParam's doc comment for the bug this replaces).
  const [tab, setTab] = useUrlParam<SparepartTab>("tab", SPAREPART_TABS, "tersedia");
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

  // ── Request Sparepart (equipment) — merged in from the old standalone page ──
  const [reqStatusFilter, setReqStatusFilter] = useState("");
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestSparepart | null>(null);
  const [reqTipe, setReqTipe] = useState("SPAREPART");
  const [reqNama, setReqNama] = useState("");
  const [reqJumlah, setReqJumlah] = useState("1");
  const [reqHargaDiajukan, setReqHargaDiajukan] = useState("");
  const [reqAlasan, setReqAlasan] = useState("");
  const [reqProductLink, setReqProductLink] = useState("");
  const [reqKeterangan, setReqKeterangan] = useState("");
  const [reqEstimasiTiba, setReqEstimasiTiba] = useState("");
  const [reqHargaDisetujui, setReqHargaDisetujui] = useState("");
  const [reqCatatan, setReqCatatan] = useState("");

  // ── Menunggu Pembelian / Menunggu Barang (kasir) — merged in from the old
  // standalone Approval Sparepart page. Continues the same request_sparepart
  // lifecycle as the "Request Sparepart" tab above, one stage further along.
  const [beliTarget, setBeliTarget] = useState<RequestSparepart | null>(null);
  const [terimaTarget, setTerimaTarget] = useState<RequestSparepart | null>(null);
  const [supplier, setSupplier] = useState("");
  const [hargaAktual, setHargaAktual] = useState("");
  const [buktiUrl, setBuktiUrl] = useState("");
  const [catatanBeli, setCatatanBeli] = useState("");
  const [barangDiTangan, setBarangDiTangan] = useState(false);
  const [tanggalTerimaBeli, setTanggalTerimaBeli] = useState("");
  const [tanggalTerima, setTanggalTerima] = useState("");
  const [catatanTerima, setCatatanTerima] = useState("");

  // Backend only lets kepala_cabang/owner create sparepart or adjust stock
  // (require_kepala_or_owner on POST /sparepart and PATCH /{id}/stok) — kasir
  // reaches this same page read-only, to check availability, not manage it.
  const canManage = user?.role === "owner" || user?.role === "kepala_cabang";
  const isTeknisi = user?.role === "teknisi";
  const isKasir = user?.role === "kasir";
  // Request Sparepart tab: kepala_cabang/owner approve, teknisi create/view
  // their own — kasir has no role in this tab at all (matches the old
  // standalone page's nav visibility, which never included kasir).
  const canCreateRequest = isTeknisi;
  const canApproveRequest = canManage;
  const canSeeRequestTab = canManage || isTeknisi;

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
  const {
    items: requests, loading: requestsLoading, loadingMore: requestsLoadingMore, error: requestsError,
    total: requestsTotal, hasMore: requestsHasMore, reload: reloadRequests, loadMore: loadMoreRequests,
  } = usePaginatedApiList<RequestSparepart>(
    (skip, limit) => (canSeeRequestTab
      ? Api.requestSparepart.list({ status: reqStatusFilter || undefined, skip, limit })
      : Promise.resolve({ success: true as const, data: [], total: 0, skip: 0, limit })),
    [canSeeRequestTab, reqStatusFilter], "Gagal memuat request sparepart",
  );
  // Kasir-only continuation of the same request_sparepart lifecycle above.
  const { items: menungguPembelian, loading: menungguPembelianLoading, error: menungguPembelianError, reload: reloadMenungguPembelian } =
    useApiList<RequestSparepart>(
      () => (isKasir ? Api.requestSparepart.list({ status: "Menunggu_Pembelian" }).then((r) => r.data ?? []) : Promise.resolve([])),
      [isKasir], "Gagal memuat request menunggu pembelian",
    );
  const { items: menungguBarang, loading: menungguBarangLoading, error: menungguBarangError, reload: reloadMenungguBarang } =
    useApiList<RequestSparepart>(
      () => (isKasir ? Api.requestSparepart.list({ status: "Menunggu_Barang" }).then((r) => r.data ?? []) : Promise.resolve([])),
      [isKasir], "Gagal memuat request menunggu barang",
    );
  const reloadProcurement = () => { void reloadMenungguPembelian(); void reloadMenungguBarang(); };
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
  // Shared between the Simpan button's disabled state and create()'s own
  // guard, so an invalid form can't be submitted at all (previously Simpan
  // stayed clickable regardless, and only harga_jual — not harga_beli/stok —
  // was checked for a negative value before hitting the API).
  const isCreateFormValid = Boolean(name.trim()) && Number(sell) > 0 && Number(buy) >= 0 && Number(stock) >= 0;
  const create = async () => {
    if (!isCreateFormValid) { showToast("Nama, harga jual, dan nilai non-negatif wajib diisi", "error"); return; }
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

  const openRequestForm = () => {
    setReqTipe("SPAREPART"); setReqNama(""); setReqJumlah("1"); setReqHargaDiajukan("");
    setReqAlasan(""); setReqProductLink(""); setReqKeterangan(""); setRequestFormOpen(true);
  };
  const createRequest = async () => {
    if (!reqNama.trim() || Number(reqJumlah) <= 0) { showToast("Nama sparepart dan jumlah wajib diisi", "error"); return; }
    if (!reqAlasan.trim()) { showToast("Alasan request wajib diisi", "error"); return; }
    try {
      await Api.requestSparepart.create({
        tipe: reqTipe, jenis: REQUEST_JENIS, nama_sp: reqNama.trim(), jumlah: Number(reqJumlah),
        harga_diajukan: reqHargaDiajukan ? Number(reqHargaDiajukan) : undefined, alasan: reqAlasan.trim(),
        keterangan: reqKeterangan || undefined, cabang: user?.cabang || "JYP", product_link: reqProductLink.trim() || undefined,
      });
      showToast("Request sparepart berhasil dibuat"); setRequestFormOpen(false); await reloadRequests();
    } catch (e) { showToast(e instanceof Error ? e.message : "Request gagal dibuat", "error"); }
  };
  const respondRequest = async (decision: "Diterima" | "Ditolak") => {
    if (!selectedRequest) return;
    if (decision === "Ditolak" && !reqCatatan.trim()) { showToast("Catatan wajib diisi saat menolak", "error"); return; }
    if (decision === "Diterima" && (!Number(reqHargaDisetujui) || Number(reqHargaDisetujui) <= 0)) { showToast("Harga yang disetujui wajib diisi", "error"); return; }
    try {
      await Api.requestSparepart.respond(selectedRequest.req_id, {
        status: decision,
        harga_disetujui: decision === "Diterima" ? Number(reqHargaDisetujui) : undefined,
        estimasi_tiba: decision === "Diterima" ? (reqEstimasiTiba || undefined) : undefined,
        catatan: reqCatatan || undefined,
      });
      showToast(decision === "Diterima" ? "Request disetujui, menunggu pembelian kasir" : "Request ditolak");
      setSelectedRequest(null); setReqCatatan(""); await reloadRequests();
    } catch (e) { showToast(e instanceof Error ? e.message : "Aksi request gagal", "error"); }
  };

  const openBeli = (r: RequestSparepart) => {
    setBeliTarget(r); setSupplier(""); setHargaAktual(String(r.harga_disetujui ?? "")); setBuktiUrl("");
    setCatatanBeli(""); setBarangDiTangan(false); setTanggalTerimaBeli("");
  };
  const submitBeli = async () => {
    if (!beliTarget) return;
    if (!supplier.trim()) { showToast("Supplier wajib diisi", "error"); return; }
    if (!Number(hargaAktual) || Number(hargaAktual) <= 0) { showToast("Harga beli aktual wajib diisi", "error"); return; }
    try {
      await Api.requestSparepart.beli(beliTarget.req_id, {
        supplier: supplier.trim(), harga_beli_aktual: Number(hargaAktual), bukti_url: buktiUrl || undefined,
        catatan: catatanBeli || undefined, barang_di_tangan: barangDiTangan,
        tanggal_terima: barangDiTangan ? (tanggalTerimaBeli || undefined) : undefined,
      });
      showToast(barangDiTangan ? "Pembelian dicatat, barang langsung masuk inventory" : "Pembelian dicatat, menunggu barang sampai");
      setBeliTarget(null); reloadProcurement();
    } catch (e) { showToast(e instanceof Error ? e.message : "Catat pembelian gagal", "error"); }
  };
  const submitTerima = async () => {
    if (!terimaTarget) return;
    try {
      await Api.requestSparepart.terima(terimaTarget.req_id, { tanggal_terima: tanggalTerima || undefined, catatan: catatanTerima || undefined });
      showToast("Barang diterima, masuk inventory");
      setTerimaTarget(null); reloadProcurement();
    } catch (e) { showToast(e instanceof Error ? e.message : "Konfirmasi terima gagal", "error"); }
  };

  // Two contexts, not one flat row: "Stok" (what's on the shelf right now)
  // vs "Request & Pembelian" (the request_sparepart lifecycle, one stage per
  // tab). Same tabs/roles as before — teknisi/kc/owner see Request Sparepart,
  // kasir sees the two procurement stages instead — only the grouping is new.
  const stockTabs: { key: SparepartTab; label: string; count: number }[] = [
    { key: "tersedia", label: "Sparepart Tersedia", count: tersedia.length },
    { key: "sedang_dipakai", label: "Sparepart Sedang Dipakai", count: sedangDipakai.length },
    { key: "riwayat", label: "Riwayat Pemakaian", count: riwayat.length },
    { key: "untuk_dijual", label: "Sparepart Untuk Dijual", count: dijual.length },
  ];
  const requestTabs: { key: SparepartTab; label: string; count: number }[] = [
    ...(canSeeRequestTab ? [{ key: "request" as const, label: "Request Sparepart", count: requestsTotal }] : []),
    ...(isKasir ? [
      { key: "menunggu_pembelian" as const, label: "Menunggu Pembelian", count: menungguPembelian.length },
      { key: "menunggu_barang" as const, label: "Menunggu Barang", count: menungguBarang.length },
    ] : []),
  ];
  const isStockTab = stockTabs.some((t) => t.key === tab);

  return (
    <div className="jp-page">
      <div className="jp-page-header">
        <div>
          <h1 className="jp-page-title">Sparepart</h1>
          <p className="text-sm text-jp-muted dark:text-jp-muted-dark">{canManage ? "Master sparepart dan stok cabang" : "Cek ketersediaan sparepart di cabang Anda"}</p>
        </div>
        {tab === "request" ? (canCreateRequest && <button type="button" className="btn-primary" onClick={openRequestForm}>+ Request Baru</button>)
          : (tab === "menunggu_pembelian" || tab === "menunggu_barang") ? null
          : (canManage && <button type="button" className="btn-primary" onClick={openCreate}>+ Tambah Sparepart</button>)}
      </div>

      {isStockTab && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="metric-card"><p className="label">Total Sparepart</p><p className="mt-1 jp-page-title">{totalSparepart}</p><p className="mt-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">Semua sparepart</p></div>
          <div className="metric-card"><p className="label">Sparepart Tersedia</p><p className="mt-1 jp-page-title text-jp-teal dark:text-jp-teal">{tersedia.length}</p><p className="mt-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">Siap digunakan</p></div>
          <div className="metric-card"><p className="label">Sedang Dipakai</p><p className="mt-1 jp-page-title">{sedangDipakai.length}</p><p className="mt-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">Sedang digunakan di service</p></div>
          <div className="metric-card"><p className="label">Untuk Dijual</p><p className="mt-1 jp-page-title">{dijual.length}</p><p className="mt-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">Untuk penjualan ke customer</p></div>
        </div>
      )}

      {/* Desktop relies on the sidebar's Sparepart children (identical tabs,
          see nav.ts) as the single navigation for this switch — this row
          would be a pure duplicate there. Mobile keeps it: the sidebar isn't
          visible without opening the drawer, so this is the only way to
          switch tabs. */}
      <div className="flex flex-wrap gap-5 md:hidden">
        <div className="space-y-1.5">
          <p className="label mb-0">Stok</p>
          <div className="segmented-control">
            {stockTabs.map((t) => <button type="button" key={t.key} className={`filter-tab ${tab === t.key ? "filter-tab-active" : ""}`} onClick={() => setTab(t.key)}>{t.label} ({t.count})</button>)}
          </div>
        </div>
        {requestTabs.length > 0 && (
          <div className="space-y-1.5">
            <p className="label mb-0">Request &amp; Pembelian</p>
            <div className="segmented-control">
              {requestTabs.map((t) => <button type="button" key={t.key} className={`filter-tab ${tab === t.key ? "filter-tab-active" : ""}`} onClick={() => setTab(t.key)}>{t.label} ({t.count})</button>)}
            </div>
          </div>
        )}
      </div>

      {tab !== "sedang_dipakai" && tab !== "riwayat" && tab !== "request" && tab !== "menunggu_pembelian" && tab !== "menunggu_barang" && (
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

      {tab === "request" && canSeeRequestTab && (
        <>
          {canCreateRequest && <p className="rounded-jp-sm bg-jp-surface-subtle p-3 text-[11px] text-jp-muted dark:bg-jp-surface-subtle-dark/60 dark:text-jp-muted-dark">
            Tab ini untuk request <span className="font-medium text-jp-text dark:text-jp-text-dark">equipment</span> (alat kerja, tidak terkait tiket servis tertentu). Butuh sparepart untuk perbaikan HP? Buka tiket servisnya di Data Service dan pilih &quot;Request Sparepart&quot; dari sana — supaya otomatis terhubung ke HP yang sedang Anda kerjakan.
          </p>}
          <div className="segmented-control">{REQUEST_STATUS_TABS.map((s) => <button type="button" key={s || "all"} className={`filter-tab ${reqStatusFilter === s ? "filter-tab-active" : ""}`} onClick={() => setReqStatusFilter(s)}>{s ? (REQUEST_STATUS_LABEL[s] ?? s) : "Semua"}</button>)}</div>
          {requestsLoading ? <LoadingSkeleton numberOfRows={5} /> : requestsError ? <ErrorState message={requestsError} onRetry={reloadRequests} /> : (
            <div className="table-wrap overflow-x-auto rounded-jp-md">
              <table className="w-full text-xs">
                <thead className="tbl-head border-b"><tr>{["Foto", "Request", "Sparepart", "Jenis", "Jumlah", "Harga Diajukan/Disetujui", "Cabang", "Status", "Aksi"].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead>
                <tbody>
                  {requests.length ? requests.map((r) => (
                    <tr key={r.id} className="tbl-row">
                      <td className="px-5 py-4">
                        {r.unit_foto_snapshot ? (
                          <img src={r.unit_foto_snapshot} alt={`Foto unit untuk ${r.req_id}`} className="h-10 w-10 rounded-jp-sm object-cover" />
                        ) : (
                          <span className="text-jp-muted dark:text-jp-muted-dark">{NOT_SET}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{r.req_id}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{r.nama_sp}</p>
                        <p className="text-[10px] text-jp-muted dark:text-jp-muted-dark">{r.sp_id || "Custom"}{r.service_id ? ` · ${r.service_id}` : ""}</p>
                        {r.alasan && <p className="mt-0.5 text-[10px] italic text-jp-muted dark:text-jp-muted-dark">&ldquo;{r.alasan}&rdquo;</p>}
                      </td>
                      <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{r.jenis === "equipment" ? "Equipment" : "Repair"}</td>
                      <td className="px-5 py-4">{r.jumlah}</td>
                      <td className="px-5 py-4">{r.harga_disetujui ? formatRupiah(r.harga_disetujui) : r.harga_diajukan ? <span className="text-jp-muted dark:text-jp-muted-dark">{formatRupiah(r.harga_diajukan)} (diajukan)</span> : "-"}</td>
                      <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{r.cabang}</td>
                      <td className="px-5 py-4"><span className="badge badge-booking">{REQUEST_STATUS_LABEL[r.status] ?? r.status}</span></td>
                      <td className="tbl-action-col px-5 py-4">
                        {canApproveRequest && r.status === "Pending" ? (
                          <button type="button" className="btn-ghost" onClick={() => { setSelectedRequest(r); setReqEstimasiTiba(""); setReqCatatan(""); setReqHargaDisetujui(String(r.harga_diajukan ?? "")); }}>Proses</button>
                        ) : <span className="text-jp-muted dark:text-jp-muted-dark">—</span>}
                      </td>
                    </tr>
                  )) : <tr><td colSpan={9}><EmptyState message="Belum ada request sparepart" iconName="packageSvg" /></td></tr>}
                </tbody>
              </table>
              {requests.length > 0 && (
                <div className="flex items-center justify-between gap-3 border-t border-jp-border px-5 py-3 text-[11px] text-jp-muted dark:border-jp-border-dark dark:text-jp-muted-dark">
                  <span>Menampilkan {requests.length} dari {requestsTotal} request</span>
                  {requestsHasMore && <button type="button" className="btn-ghost" disabled={requestsLoadingMore} onClick={() => void loadMoreRequests()}>{requestsLoadingMore ? "Memuat..." : "Muat Lebih Banyak"}</button>}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "menunggu_pembelian" && isKasir && (
        menungguPembelianLoading ? <LoadingSkeleton numberOfRows={5} /> : menungguPembelianError ? <ErrorState message={menungguPembelianError} onRetry={reloadMenungguPembelian} /> : (
          <div className="table-wrap overflow-x-auto rounded-jp-md">
            <table className="w-full text-xs">
              <thead className="tbl-head border-b"><tr>{["ID", "Jenis", "Nama Barang", "Jumlah", "Cabang", "Harga Disetujui", "Aksi"].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>
                {menungguPembelian.length ? menungguPembelian.map((r) => (
                  <tr key={r.id} className="tbl-row">
                    <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{r.req_id}</td>
                    <td className="px-5 py-4">{r.jenis === "equipment" ? "Equipment" : "Repair"}</td>
                    <td className="px-5 py-4 font-medium">{r.nama_sp}{r.service_id ? <span className="ml-1 text-[10px] font-normal text-jp-muted dark:text-jp-muted-dark">({r.service_id})</span> : null}</td>
                    <td className="px-5 py-4">{r.jumlah}</td>
                    <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{r.cabang}</td>
                    <td className="px-5 py-4">{formatRupiah(r.harga_disetujui ?? 0)}</td>
                    <td className="tbl-action-col px-5 py-4"><button type="button" className="btn-primary" onClick={() => openBeli(r)}>Catat Pembelian</button></td>
                  </tr>
                )) : <tr><td colSpan={7}><EmptyState message="Tidak ada request menunggu pembelian" iconName="packageSvg" /></td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "menunggu_barang" && isKasir && (
        menungguBarangLoading ? <LoadingSkeleton numberOfRows={5} /> : menungguBarangError ? <ErrorState message={menungguBarangError} onRetry={reloadMenungguBarang} /> : (
          <div className="table-wrap overflow-x-auto rounded-jp-md">
            <table className="w-full text-xs">
              <thead className="tbl-head border-b"><tr>{["ID", "Jenis", "Nama Barang", "Jumlah", "Cabang", "Harga Beli Aktual", "Aksi"].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>
                {menungguBarang.length ? menungguBarang.map((r) => (
                  <tr key={r.id} className="tbl-row">
                    <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{r.req_id}</td>
                    <td className="px-5 py-4">{r.jenis === "equipment" ? "Equipment" : "Repair"}</td>
                    <td className="px-5 py-4 font-medium">{r.nama_sp}{r.service_id ? <span className="ml-1 text-[10px] font-normal text-jp-muted dark:text-jp-muted-dark">({r.service_id})</span> : null}</td>
                    <td className="px-5 py-4">{r.jumlah}</td>
                    <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{r.cabang}</td>
                    <td className="px-5 py-4">{formatRupiah(r.harga_beli_aktual ?? 0)}</td>
                    <td className="tbl-action-col px-5 py-4"><button type="button" className="btn-primary" onClick={() => { setTerimaTarget(r); setTanggalTerima(""); setCatatanTerima(""); }}>Barang Diterima</button></td>
                  </tr>
                )) : <tr><td colSpan={7}><EmptyState message="Tidak ada request menunggu barang" iconName="packageSvg" /></td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}

      {canManage && (
        <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Tambah Sparepart">
          <div className="space-y-3">
            <LabelledInput label="Nama" required value={name} onChange={(e) => setName(e.target.value)} />
            <LabelledInput label="Kategori" value={cat} onChange={(e) => setCat(e.target.value)} />
            <LabelledSelect label="Jenis" value={jenis} onChange={(e) => setJenis(e.target.value as SparepartJenis)}>
              {JENIS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </LabelledSelect>
            <div className="grid grid-cols-2 gap-3">
              <LabelledInput label="Harga Beli (Modal)" type="number" min={0} value={buy} onChange={(e) => setBuy(e.target.value)} />
              <LabelledInput label="Harga Jual" type="number" min={0} required value={sell} onChange={(e) => setSell(e.target.value)} />
            </div>
            <LabelledInput label="Stok Awal" type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setFormOpen(false)}>Batal</button>
              <button type="button" className="btn-primary flex-1" disabled={!isCreateFormValid} onClick={() => void create()}>Simpan</button>
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

      {canCreateRequest && (
        <Modal isOpen={requestFormOpen} onClose={() => setRequestFormOpen(false)} title="Request Equipment">
          <div className="space-y-3">
            <LabelledSelect label="Tipe" value={reqTipe} onChange={(e) => setReqTipe(e.target.value)}><option>SPAREPART</option><option>Servis</option><option>Barang</option></LabelledSelect>
            <LabelledInput label="Nama Alat/Barang" required value={reqNama} onChange={(e) => setReqNama(e.target.value)} />
            <LabelledInput label="Jumlah" type="number" min={1} required value={reqJumlah} onChange={(e) => setReqJumlah(e.target.value)} />
            <LabelledInput label="Harga yang Diajukan (per satuan, opsional)" type="number" min={1} helper="Boleh dikosongkan — Kepala Cabang/Kasir bisa isi belakangan." value={reqHargaDiajukan} onChange={(e) => setReqHargaDiajukan(e.target.value)} />
            <LabelledTextarea label="Alasan" required rows={2} helper="Jelaskan kenapa alat/barang ini dibutuhkan — dipakai Kepala Cabang untuk review." value={reqAlasan} onChange={(e) => setReqAlasan(e.target.value)} />
            <LabelledInput label="Link Produk (opsional)" type="url" placeholder="https://..." helper="Isi kalau sudah ada referensi barang yang mau dibeli." value={reqProductLink} onChange={(e) => setReqProductLink(e.target.value)} />
            <LabelledTextarea label="Keterangan (Opsional)" rows={2} value={reqKeterangan} onChange={(e) => setReqKeterangan(e.target.value)} />
            <button type="button" className="btn-primary w-full" onClick={() => void createRequest()}>Kirim Request</button>
          </div>
        </Modal>
      )}

      {canApproveRequest && (
        <Modal isOpen={Boolean(selectedRequest)} onClose={() => setSelectedRequest(null)} title={selectedRequest ? `Proses ${selectedRequest.req_id}` : "Proses Request"}>
          <div className="space-y-3">
            {selectedRequest?.unit_foto_snapshot && (
              <img src={selectedRequest.unit_foto_snapshot} alt={`Foto unit untuk ${selectedRequest.req_id}`} className="h-32 w-full rounded-jp-sm object-cover" />
            )}
            <p className="text-sm text-jp-muted dark:text-jp-muted-dark">{selectedRequest?.nama_sp} · {selectedRequest?.jumlah} unit · {selectedRequest?.jenis === "equipment" ? "Equipment" : "Repair"}{selectedRequest?.service_id ? ` · ${selectedRequest.service_id}` : ""}</p>
            {selectedRequest?.alasan && <p className="rounded-jp-sm bg-jp-surface-subtle p-3 text-xs text-jp-muted dark:bg-jp-surface-subtle-dark/60 dark:text-jp-muted-dark"><span className="font-medium text-jp-text dark:text-jp-text-dark">Alasan teknisi: </span>{selectedRequest.alasan}</p>}
            {selectedRequest?.product_link && (
              <p className="text-xs">
                <span className="font-medium text-jp-text dark:text-jp-text-dark">Link Produk: </span>
                <a href={selectedRequest.product_link} target="_blank" rel="noopener noreferrer" className="break-all text-jp-teal underline dark:text-jp-teal-dark">{selectedRequest.product_link}</a>
              </p>
            )}
            <p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">Harga diajukan teknisi: <span className="font-medium text-jp-text dark:text-jp-text-dark">{selectedRequest?.harga_diajukan ? formatRupiah(selectedRequest.harga_diajukan) : "-"}</span>. Menyetujui akan mengunci harga dan meneruskan ke Kasir untuk pembelian.</p>
            <LabelledInput label="Harga yang Disetujui (per satuan)" type="number" min={1} value={reqHargaDisetujui} onChange={(e) => setReqHargaDisetujui(e.target.value)} />
            <LabelledInput label="Estimasi Tiba" type="date" value={reqEstimasiTiba} onChange={(e) => setReqEstimasiTiba(e.target.value)} />
            <LabelledTextarea label="Catatan" rows={3} value={reqCatatan} onChange={(e) => setReqCatatan(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="btn-error flex-1" onClick={() => void respondRequest("Ditolak")}>Tolak</button>
              <button type="button" className="btn-success flex-1" onClick={() => void respondRequest("Diterima")}>Setujui</button>
            </div>
          </div>
        </Modal>
      )}

      {isKasir && (
        <Modal isOpen={beliTarget !== null} onClose={() => setBeliTarget(null)} title={beliTarget ? `Catat Pembelian ${beliTarget.req_id}` : "Catat Pembelian"}>
          <div className="space-y-4">
            <p className="font-medium">{beliTarget?.nama_sp} · {beliTarget?.jumlah} unit</p>
            <p className="rounded-jp-sm bg-jp-surface-subtle p-3 text-xs text-jp-muted dark:bg-jp-surface-subtle-dark/60 dark:text-jp-muted-dark">
              Harga disetujui Kepala Cabang: <span className="font-medium text-jp-text dark:text-jp-text-dark">{formatRupiah(beliTarget?.harga_disetujui ?? 0)}</span> per satuan.
            </p>
            <LabelledInput label="Supplier" required value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            <LabelledInput label="Harga Beli Aktual (per satuan)" type="number" min={1} required value={hargaAktual} onChange={(e) => setHargaAktual(e.target.value)} />
            {Number(hargaAktual) > 0 && beliTarget?.harga_disetujui && (
              Number(hargaAktual) === beliTarget.harga_disetujui
                ? <p className="text-[11px] text-jp-teal dark:text-jp-teal-dark">✓ Harga sesuai approval</p>
                : <p className="text-[11px] text-jp-warning dark:text-jp-warning-dark">Beda dari harga disetujui ({formatRupiah(beliTarget.harga_disetujui)}) — tetap bisa disimpan, hanya sebagai catatan.</p>
            )}
            <ImageUploader id="bukti-nota" maxFiles={1} label="Bukti / Nota Pembelian" onChange={(imgs) => setBuktiUrl(imgs[0]?.secure_url ?? "")} />
            <LabelledTextarea label="Catatan" rows={2} value={catatanBeli} onChange={(e) => setCatatanBeli(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={barangDiTangan} onChange={(e) => setBarangDiTangan(e.target.checked)} />
              Barang sudah di tangan sekarang (beli langsung/COD, tidak perlu tunggu kirim)
            </label>
            {barangDiTangan && <LabelledInput label="Tanggal Terima" type="date" value={tanggalTerimaBeli} onChange={(e) => setTanggalTerimaBeli(e.target.value)} />}
            <button type="button" className="btn-primary w-full" onClick={() => void submitBeli()}>
              {barangDiTangan ? "Simpan & Masukkan ke Inventory" : "Simpan Pembelian"}
            </button>
          </div>
        </Modal>
      )}

      {isKasir && (
        <Modal isOpen={terimaTarget !== null} onClose={() => setTerimaTarget(null)} title={terimaTarget ? `Barang Diterima ${terimaTarget.req_id}` : "Barang Diterima"}>
          <div className="space-y-4">
            <p className="font-medium">{terimaTarget?.nama_sp} · {terimaTarget?.jumlah} unit</p>
            <p className="text-xs text-jp-muted dark:text-jp-muted-dark">Supplier: {terimaTarget?.supplier || "-"} · Harga beli aktual: {formatRupiah(terimaTarget?.harga_beli_aktual ?? 0)}</p>
            {terimaTarget?.service_id && <p className="rounded-jp-sm bg-jp-surface-subtle p-3 text-xs text-jp-muted dark:bg-jp-surface-subtle-dark/60 dark:text-jp-muted-dark">Part ini akan ditahan untuk tiket <span className="font-medium text-jp-text dark:text-jp-text-dark">{terimaTarget.service_id}</span> (tidak masuk stok umum) — teknisi akan diberi notifikasi dan harus konfirmasi &quot;Gunakan Sparepart&quot; sebelum part ini benar-benar tercatat dipakai.</p>}
            <LabelledInput label="Tanggal Terima" type="date" value={tanggalTerima} onChange={(e) => setTanggalTerima(e.target.value)} />
            <LabelledTextarea label="Catatan" rows={2} value={catatanTerima} onChange={(e) => setCatatanTerima(e.target.value)} />
            <button type="button" className="btn-success w-full" onClick={() => void submitTerima()}>Konfirmasi Barang Diterima</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
