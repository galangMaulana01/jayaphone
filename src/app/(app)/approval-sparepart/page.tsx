"use client";
import { useState } from "react";
import { Api } from "@/lib/api";
import type { RequestSparepart } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { LabelledInput, LabelledTextarea } from "@/components/ui/InputField";
import { useToast } from "@/contexts/ToastContext";
import { useApiList } from "@/hooks/useApiList";
import { formatRupiah } from "@/lib/utils/formatters";

type Tab = "Menunggu_Pembelian" | "Menunggu_Barang";
const TAB_LABEL: Record<Tab, string> = { Menunggu_Pembelian: "Menunggu Pembelian", Menunggu_Barang: "Menunggu Barang" };

export default function ApprovalSparepartPage(): JSX.Element {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("Menunggu_Pembelian");
  const [beliTarget, setBeliTarget] = useState<RequestSparepart | null>(null);
  const [terimaTarget, setTerimaTarget] = useState<RequestSparepart | null>(null);

  const [supplier, setSupplier] = useState(""); const [hargaAktual, setHargaAktual] = useState("");
  const [buktiUrl, setBuktiUrl] = useState(""); const [catatanBeli, setCatatanBeli] = useState("");
  const [barangDiTangan, setBarangDiTangan] = useState(false); const [tanggalTerimaBeli, setTanggalTerimaBeli] = useState("");
  const [tanggalTerima, setTanggalTerima] = useState(""); const [catatanTerima, setCatatanTerima] = useState("");

  const { items: menungguPembelian, loading: loadingPembelian, error: errorPembelian, reload: reloadPembelian } =
    useApiList<RequestSparepart>(() => Api.requestSparepart.list({ status: "Menunggu_Pembelian" }).then((r) => r.data ?? []), [], "Gagal memuat request menunggu pembelian");
  const { items: menungguBarang, loading: loadingBarang, error: errorBarang, reload: reloadBarang } =
    useApiList<RequestSparepart>(() => Api.requestSparepart.list({ status: "Menunggu_Barang" }).then((r) => r.data ?? []), [], "Gagal memuat request menunggu barang");

  const items = tab === "Menunggu_Pembelian" ? menungguPembelian : menungguBarang;
  const loading = tab === "Menunggu_Pembelian" ? loadingPembelian : loadingBarang;
  const error = tab === "Menunggu_Pembelian" ? errorPembelian : errorBarang;
  const reload = () => { void reloadPembelian(); void reloadBarang(); };

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
      setBeliTarget(null); reload();
    } catch (e) { showToast(e instanceof Error ? e.message : "Catat pembelian gagal", "error"); }
  };

  const submitTerima = async () => {
    if (!terimaTarget) return;
    try {
      await Api.requestSparepart.terima(terimaTarget.req_id, { tanggal_terima: tanggalTerima || undefined, catatan: catatanTerima || undefined });
      showToast("Barang diterima, masuk inventory");
      setTerimaTarget(null); reload();
    } catch (e) { showToast(e instanceof Error ? e.message : "Konfirmasi terima gagal", "error"); }
  };

  return <div className="jp-page">
    <div><h1 className="jp-page-title">Approval Sparepart</h1><p className="text-sm text-jp-muted dark:text-jp-muted-dark">Proses pembelian &amp; penerimaan barang sparepart/equipment yang sudah disetujui Kepala Cabang</p></div>
    <div className="segmented-control">
      {(["Menunggu_Pembelian", "Menunggu_Barang"] as Tab[]).map((t) => (
        <button type="button" key={t} className={`filter-tab ${tab === t ? "filter-tab-active" : ""}`} onClick={() => setTab(t)}>
          {TAB_LABEL[t]} ({t === "Menunggu_Pembelian" ? menungguPembelian.length : menungguBarang.length})
        </button>
      ))}
    </div>

    {loading ? <LoadingSkeleton numberOfRows={5}/> : error ? <ErrorState message={error} onRetry={reload}/> : (
      <div className="table-wrap overflow-x-auto rounded-jp-md">
        <table className="w-full text-xs">
          <thead className="tbl-head"><tr>
            {["ID", "Jenis", "Nama Barang", "Jumlah", "Cabang", tab === "Menunggu_Pembelian" ? "Harga Disetujui" : "Harga Beli Aktual", "Aksi"].map((h) =>
              <th className={`px-5 py-3 text-left ${h === "Aksi" ? "tbl-action-col" : ""}`} key={h}>{h}</th>)}
          </tr></thead>
          <tbody>
            {items.length ? items.map((r) => (
              <tr className="tbl-row" key={r.id}>
                <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{r.req_id}</td>
                <td className="px-5 py-4">{r.jenis === "equipment" ? "Equipment" : "Repair"}</td>
                <td className="px-5 py-4 font-medium">{r.nama_sp}{r.service_id ? <span className="ml-1 text-[10px] font-normal text-jp-muted dark:text-jp-muted-dark">({r.service_id})</span> : null}</td>
                <td className="px-5 py-4">{r.jumlah}</td>
                <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{r.cabang}</td>
                <td className="px-5 py-4">{formatRupiah(tab === "Menunggu_Pembelian" ? (r.harga_disetujui ?? 0) : (r.harga_beli_aktual ?? 0))}</td>
                <td className="tbl-action-col px-5 py-4">
                  {tab === "Menunggu_Pembelian"
                    ? <button className="btn-primary" type="button" onClick={() => openBeli(r)}>Catat Pembelian</button>
                    : <button className="btn-primary" type="button" onClick={() => { setTerimaTarget(r); setTanggalTerima(""); setCatatanTerima(""); }}>Barang Diterima</button>}
                </td>
              </tr>
            )) : <tr><td colSpan={7}><EmptyState message={`Tidak ada request ${TAB_LABEL[tab].toLowerCase()}`} iconName="packageSvg"/></td></tr>}
          </tbody>
        </table>
      </div>
    )}

    <Modal isOpen={beliTarget !== null} onClose={() => setBeliTarget(null)} title={beliTarget ? `Catat Pembelian ${beliTarget.req_id}` : "Catat Pembelian"}>
      <div className="space-y-4">
        <p className="font-medium">{beliTarget?.nama_sp} · {beliTarget?.jumlah} unit</p>
        <p className="rounded-jp-sm bg-jp-surface-subtle p-3 text-xs text-jp-muted dark:bg-jp-surface-subtle-dark/60 dark:text-jp-muted-dark">
          Harga disetujui Kepala Cabang: <span className="font-medium text-jp-text dark:text-jp-text-dark">{formatRupiah(beliTarget?.harga_disetujui ?? 0)}</span> per satuan.
        </p>
        <LabelledInput label="Supplier" required value={supplier} onChange={(e) => setSupplier(e.target.value)}/>
        <LabelledInput label="Harga Beli Aktual (per satuan)" type="number" min={1} required value={hargaAktual} onChange={(e) => setHargaAktual(e.target.value)}/>
        {Number(hargaAktual) > 0 && beliTarget?.harga_disetujui && Number(hargaAktual) !== beliTarget.harga_disetujui &&
          <p className="text-[11px] text-jp-warning dark:text-jp-warning-dark">Beda dari harga disetujui ({formatRupiah(beliTarget.harga_disetujui)}) — tetap bisa disimpan, hanya sebagai catatan.</p>}
        <ImageUploader id="bukti-nota" maxFiles={1} label="Bukti / Nota Pembelian" onChange={(imgs) => setBuktiUrl(imgs[0]?.secure_url ?? "")}/>
        <LabelledTextarea label="Catatan" rows={2} value={catatanBeli} onChange={(e) => setCatatanBeli(e.target.value)}/>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={barangDiTangan} onChange={(e) => setBarangDiTangan(e.target.checked)}/>
          Barang sudah di tangan sekarang (beli langsung/COD, tidak perlu tunggu kirim)
        </label>
        {barangDiTangan && <LabelledInput label="Tanggal Terima" type="date" value={tanggalTerimaBeli} onChange={(e) => setTanggalTerimaBeli(e.target.value)}/>}
        <button className="btn-primary w-full" type="button" onClick={() => void submitBeli()}>
          {barangDiTangan ? "Simpan & Masukkan ke Inventory" : "Simpan Pembelian"}
        </button>
      </div>
    </Modal>

    <Modal isOpen={terimaTarget !== null} onClose={() => setTerimaTarget(null)} title={terimaTarget ? `Barang Diterima ${terimaTarget.req_id}` : "Barang Diterima"}>
      <div className="space-y-4">
        <p className="font-medium">{terimaTarget?.nama_sp} · {terimaTarget?.jumlah} unit</p>
        <p className="text-xs text-jp-muted dark:text-jp-muted-dark">Supplier: {terimaTarget?.supplier || "-"} · Harga beli aktual: {formatRupiah(terimaTarget?.harga_beli_aktual ?? 0)}</p>
        {terimaTarget?.service_id && <p className="rounded-jp-sm bg-jp-surface-subtle p-3 text-xs text-jp-muted dark:bg-jp-surface-subtle-dark/60 dark:text-jp-muted-dark">Part ini akan langsung direservasi ke tiket <span className="font-medium text-jp-text dark:text-jp-text-dark">{terimaTarget.service_id}</span> (Sedang Dipakai) — tidak masuk stok umum.</p>}
        <LabelledInput label="Tanggal Terima" type="date" value={tanggalTerima} onChange={(e) => setTanggalTerima(e.target.value)}/>
        <LabelledTextarea label="Catatan" rows={2} value={catatanTerima} onChange={(e) => setCatatanTerima(e.target.value)}/>
        <button className="btn-success w-full" type="button" onClick={() => void submitTerima()}>Konfirmasi Barang Diterima</button>
      </div>
    </Modal>
  </div>;
}
