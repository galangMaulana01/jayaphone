"use client";
import { useCallback, useEffect, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import type { CODRequest, Unit } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { LabelledInput, LabelledSelect, LabelledTextarea } from "@/components/ui/InputField";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { useToast } from "@/contexts/ToastContext";
import { KATEGORI_OPTIONS, KONDISI_OPTIONS, labelForKatKode, labelForKondisiKode } from "@/lib/config/unitCodes";
import { formatDateTimeShort } from "@/lib/utils/formatters";

// kat_kode/kondisi_kode are NOT part of the stored Unit shape (they only
// exist to drive unit_id generation + the kategori/kondisi labels at
// creation time — see lib/config/unitCodes.ts), so they're tracked
// separately from the rest of the Partial<Unit> draft.
type UnitDraft = Partial<Unit> & { imei: string; merk: string; tipe: string; kat_kode: string; kondisi_kode: string };
const EMPTY_DRAFT: UnitDraft = { imei: "", merk: "", tipe: "", storage: "-", ram: "-", warna: "-", kondisi_hp: "Mulus", battery: 100, garansi_toko: 7, catatan: "", kat_kode: "", kondisi_kode: "" };
const money = (value?: number): string => value ? `Rp ${value.toLocaleString("id-ID")}` : "-";
export default function ApprovalCodPage(): JSX.Element {
  const { showToast } = useToast(); const [items, setItems] = useState<CODRequest[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [selected, setSelected] = useState<CODRequest | null>(null); const [rejecting, setRejecting] = useState<CODRequest | null>(null); const [reason, setReason] = useState(""); const [draft, setDraft] = useState<UnitDraft>(EMPTY_DRAFT); const [hargaJual, setHargaJual] = useState(""); const [foto, setFoto] = useState<string[]>([]);
  const load = useCallback(async () => { setLoading(true); setError(""); try { setItems((await Api.cod.list({ type: "beli", status: "menunggu_approval_kasir" })).data ?? []); } catch (e) { setError(e instanceof ApiError ? e.message : "Gagal memuat approval COD"); } finally { setLoading(false); } }, []); useEffect(() => { void load(); }, [load]);
  // Kategori/kondisi selalu diminta ulang di sini — jangan bawa nilai dari
  // approval sebelumnya, dan jangan mengisi default apa pun (NF-001).
  const openApprove = (item: CODRequest): void => { const unit = (item as CODRequest & { unit_data?: Partial<Unit> }).unit_data ?? {}; setSelected(item); setDraft({ ...EMPTY_DRAFT, ...unit, imei: String(unit.imei ?? ""), merk: String(unit.merk ?? ""), tipe: String(unit.tipe ?? ""), kat_kode: "", kondisi_kode: "" }); setHargaJual(""); setFoto([]); };
  const approve = async (): Promise<void> => {
    if (!selected || !draft.imei || !draft.merk || !draft.tipe) { showToast("IMEI, merk, dan tipe wajib diisi", "error"); return; }
    if (!draft.kat_kode || !draft.kondisi_kode) { showToast("Kategori dan Kondisi Awal unit wajib dipilih sebelum approve", "error"); return; }
    const repair = draft.kondisi_hp === "Repair"; if (!repair && !Number(hargaJual)) { showToast("Harga jual wajib diisi", "error"); return; }
    try {
      await Api.cod.approve(selected.cod_id, {
        harga_jual: repair ? 0 : Number(hargaJual),
        unit_data: { ...draft, kategori: labelForKatKode(draft.kat_kode), kondisi: labelForKondisiKode(draft.kondisi_kode), foto_url: foto[0] },
        garansi_toko: Number(draft.garansi_toko) || 0,
        catatan: String(draft.catatan ?? ""),
      });
      showToast("COD disetujui — unit masuk inventory"); setSelected(null); await load();
    } catch (e) { showToast(e instanceof Error ? e.message : "Approval gagal", "error"); }
  };
  const reject = async (): Promise<void> => { if (!rejecting || !reason.trim()) { showToast("Alasan reject wajib diisi", "error"); return; } try { await Api.cod.reject(rejecting.cod_id, reason.trim()); showToast("COD ditolak"); setRejecting(null); setReason(""); await load(); } catch (e) { showToast(e instanceof Error ? e.message : "Reject gagal", "error"); } };
  const set = (key: keyof UnitDraft, value: string | number): void => setDraft((old) => ({ ...old, [key]: value }));
  return <div className="space-y-8"><div className="flex items-center justify-between"><div><h1 className="text-3xl font-semibold tracking-[-0.03em] text-jp-text dark:text-jp-text-dark">Approval COD Beli</h1><p className="text-sm text-jp-muted dark:text-jp-muted-dark">Validasi unit yang sudah dibawa kurir</p></div><span className="badge">{items.length} menunggu</span></div>{loading ? <LoadingSkeleton numberOfRows={5}/> : error ? <ErrorState message={error} onRetry={load}/> : <div className="table-wrap overflow-x-auto rounded-2xl"><table className="w-full text-xs"><thead className="tbl-head"><tr>{["Waktu","Produk","Harga Deal","Kurir","Kondisi","Aksi"].map((h) => <th key={h} className="px-5 py-3.5 text-left font-medium">{h}</th>)}</tr></thead><tbody>{items.length ? items.map((item) => <tr key={item.cod_id} className="tbl-row"><td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(item.created_at)}</td><td className="px-5 py-4 font-medium">{item.product_name || "-"}</td><td className="px-5 py-4">{money(item.deal_price)}</td><td className="px-5 py-4">{item.kurir_name || "-"}</td><td className="px-5 py-4">{(item as CODRequest & { unit_data?: { kondisi_hp?: string } }).unit_data?.kondisi_hp || "-"}</td><td className="px-5 py-4"><button type="button" className="btn-primary mr-2" onClick={() => openApprove(item)}>Approve</button><button type="button" className="btn-error" onClick={() => { setRejecting(item); setReason(""); }}>Reject</button></td></tr>) : <tr><td colSpan={6}><EmptyState message="Tidak ada COD menunggu approval" iconName="checkSvg"/></td></tr>}</tbody></table></div>}
    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Approve COD ${selected.cod_id}` : "Approve COD"} maxWidthClassName="max-w-3xl"><div className="space-y-3"><p className="text-sm text-jp-muted dark:text-jp-muted-dark">{selected?.product_name} · harga beli {money(selected?.deal_price)}</p><p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">Kategori dan Kondisi Awal menentukan ID unit yang dibuat (contoh: JYP-IP-BN-005) dan kategori stok pada laporan — pilih sesuai kondisi HP sebenarnya, bukan default.</p><div className="grid grid-cols-2 gap-3"><LabelledSelect label="Kategori" required value={draft.kat_kode} onChange={(e) => set("kat_kode", e.target.value)}><option value="">Pilih kategori</option>{KATEGORI_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.label}</option>)}</LabelledSelect><LabelledSelect label="Kondisi Awal" required value={draft.kondisi_kode} onChange={(e) => set("kondisi_kode", e.target.value)}><option value="">Pilih kondisi</option>{KONDISI_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.label}</option>)}</LabelledSelect><LabelledInput label="Merk" required value={draft.merk} onChange={(e) => set("merk", e.target.value)}/><LabelledInput label="Tipe" required value={draft.tipe} onChange={(e) => set("tipe", e.target.value)}/><LabelledInput label="IMEI" required value={draft.imei} onChange={(e) => set("imei", e.target.value)}/><LabelledInput label="Storage" value={draft.storage || ""} onChange={(e) => set("storage", e.target.value)}/><LabelledInput label="RAM" value={draft.ram || ""} onChange={(e) => set("ram", e.target.value)}/><LabelledInput label="Warna" value={draft.warna || ""} onChange={(e) => set("warna", e.target.value)}/><LabelledSelect label="Kondisi HP" value={draft.kondisi_hp} onChange={(e) => set("kondisi_hp", e.target.value)}><option>Mulus</option><option>Repair</option></LabelledSelect><LabelledInput label="Battery %" type="number" value={draft.battery ?? 100} onChange={(e) => set("battery", Number(e.target.value))}/><LabelledInput label="Harga Jual Toko" type="number" value={hargaJual} onChange={(e) => setHargaJual(e.target.value)} helper={draft.kondisi_hp === "Repair" ? "Tidak wajib untuk unit Repair" : undefined}/><LabelledInput label="Garansi Toko (hari)" type="number" value={draft.garansi_toko ?? 7} onChange={(e) => set("garansi_toko", Number(e.target.value))}/></div><LabelledTextarea label="Catatan" rows={2} value={draft.catatan || ""} onChange={(e) => set("catatan", e.target.value)}/><ImageUploader id="approval-cod-foto" maxFiles={5} folder="jayaphone/units/cod-beli" onChange={(images) => setFoto(images.map((image) => image.secure_url))}/><button type="button" className="btn-primary w-full" onClick={() => void approve()}>Approve & Simpan</button></div></Modal>
    <Modal isOpen={Boolean(rejecting)} onClose={() => setRejecting(null)} title="Reject COD Beli"><div className="space-y-3"><LabelledTextarea label="Alasan Reject" required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Harga deal terlalu rendah atau kondisi berbeda"/><div className="flex gap-2"><button type="button" className="btn-error flex-1" onClick={() => void reject()}>Reject</button><button type="button" className="btn-ghost flex-1" onClick={() => setRejecting(null)}>Batal</button></div></div></Modal></div>;
}
