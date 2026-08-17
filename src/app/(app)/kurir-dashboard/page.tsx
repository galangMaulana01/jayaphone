"use client";
import { useState } from "react";
import { Api } from "@/lib/api";
import { useApiList } from "@/hooks/useApiList";
import type { CODRequest, CODStatus } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { CodStatusBadge } from "@/components/ui/Badge";
import { LabelledCheckboxGroup, LabelledInput, LabelledSelect, LabelledTextarea } from "@/components/ui/InputField";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { useToast } from "@/contexts/ToastContext";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { formatDateTimeShort, NOT_SET, waLink } from "@/lib/utils/formatters";
import { IMEI_PATTERN, TIPE_SIM_OPTIONS, KEAMANAN_OPTIONS, SPEAKER_OPTIONS, LCD_OPTIONS } from "@/lib/config/unitCodes";
const labels: Record<string, string> = { menunggu_kurir: "Menunggu kurir", diterima: "Diterima", kurir_menuju_lokasi: "Menuju lokasi penjual", sudah_bertemu_penjual: "Sudah bertemu", barang_akan_dijemput: "Akan dijemput", barang_sudah_diambil: "Barang diambil", kurir_menuju_toko: "Menuju toko", sedang_diantar: "Sedang diantar", terkirim: "Terkirim", kurir_sedang_transaksi: "Sedang transaksi", transaksi_berhasil: "Transaksi berhasil", menunggu_approval_kasir: "Menunggu approval", selesai: "Selesai", ditolak: "Ditolak", gagal: "Gagal" };
type UnitDraft = { imei: string; imei2: string; merk: string; tipe: string; storage: string; ram: string; warna: string; tipe_sim: string; keamanan: string; speaker: string; lcd: string; battery: number; kondisi_hp: "Mulus" | "Repair"; kondisi: string; catatan: string; foto_url?: string };
const EMPTY_UNIT: UnitDraft = { imei: "", imei2: "-", merk: "", tipe: "", storage: "-", ram: "-", warna: "-", tipe_sim: "Single SIM", keamanan: "Tidak Ada", speaker: "Normal", lcd: "Original", battery: 100, kondisi_hp: "Mulus", kondisi: "BN", catatan: "" };
export default function KurirDashboardPage(): JSX.Element {
  const { showToast } = useToast(); const cabangTz = useCabangTimezones(); const [selected, setSelected] = useState<CODRequest | null>(null); const [unit, setUnit] = useState<UnitDraft>(EMPTY_UNIT); const [foto, setFoto] = useState<string[]>([]); const [deal, setDeal] = useState("");
  const [deliveringItem, setDeliveringItem] = useState<CODRequest | null>(null); const [unitProof, setUnitProof] = useState<string[]>([]); const [customerProof, setCustomerProof] = useState<string[]>([]); const [confirmingDelivery, setConfirmingDelivery] = useState(false); const [dealPriceFinal, setDealPriceFinal] = useState("");
  const [rejectTarget, setRejectTarget] = useState<{ item: CODRequest; mode: "generic" | "beli" } | null>(null); const [rejectReason, setRejectReason] = useState(""); const [rejecting, setRejecting] = useState(false);
  const { items, loading, error, reload: load } = useApiList<CODRequest>(() => Api.cod.kurirDashboard({}).then((r) => r.data ?? []), [], "Gagal memuat dashboard kurir");
  const status = async (item: CODRequest, next: CODStatus, note?: string, fotoUrls?: string[], dealPrice?: number): Promise<void> => { try { await Api.cod.kurirUpdateStatus(item.cod_id, next, note, fotoUrls, dealPrice); showToast(`Status diperbarui: ${labels[next] || next}`); await load(); } catch (e) { showToast(e instanceof Error ? e.message : "Status gagal diperbarui", "error"); } };
  const accept = async (item: CODRequest): Promise<void> => { try { await Api.cod.kurirAccept(item.cod_id); showToast("COD diterima"); await load(); } catch (e) { showToast(e instanceof Error ? e.message : "Gagal menerima COD", "error"); } };
  // Generic reject — valid while the job is still at menunggu_kurir (only if
  // already assigned to me, not a still-unclaimed broadcast) or, for COD
  // beli, at kurir_menuju_lokasi (before meeting the seller). Reason is
  // optional here — the backend accepts `note` as optional on this path.
  const openReject = (item: CODRequest): void => { setRejectTarget({ item, mode: "generic" }); setRejectReason(""); };
  // Dedicated reject-beli — required once the kurir has already met the
  // seller (sudah_bertemu_penjual); the backend rejects the generic path
  // here specifically because it has no field for a mandatory reason.
  const openRejectBeli = (item: CODRequest): void => { setRejectTarget({ item, mode: "beli" }); setRejectReason(""); };
  const confirmReject = async (): Promise<void> => {
    if (!rejectTarget) return;
    if (rejectTarget.mode === "beli" && !rejectReason.trim()) { showToast("Alasan wajib diisi", "error"); return; }
    setRejecting(true);
    try {
      if (rejectTarget.mode === "beli") await Api.cod.kurirRejectBeli(rejectTarget.item.cod_id, rejectReason.trim());
      else await Api.cod.kurirReject(rejectTarget.item.cod_id, rejectReason.trim() || undefined);
      showToast("Tugas ditolak");
      setRejectTarget(null);
      await load();
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal menolak tugas", "error"); }
    finally { setRejecting(false); }
  };
  const validateUnitDraft = (): boolean => {
    if (!unit.imei || !unit.merk.trim() || !unit.tipe.trim()) { showToast("IMEI, merk, dan tipe wajib diisi", "error"); return false; }
    if (unit.imei !== "-" && !IMEI_PATTERN.test(unit.imei)) { showToast("IMEI harus 14-16 digit angka, atau isi \"-\" jika tidak ada", "error"); return false; }
    if (unit.imei2 && unit.imei2 !== "-" && !IMEI_PATTERN.test(unit.imei2)) { showToast("IMEI 2 harus 14-16 digit angka, atau isi \"-\" jika tidak ada", "error"); return false; }
    return true;
  };
  const inputStok = async (): Promise<void> => { if (!selected || !validateUnitDraft()) return; try { await Api.cod.kurirInputStok({ ...unit, foto_url: foto[0] }); showToast("Unit berhasil dimasukkan ke stok"); setSelected(null); await load(); } catch (e) { showToast(e instanceof Error ? e.message : "Input stok gagal", "error"); } };
  const submitBeli = async (): Promise<void> => { if (!selected || !Number(deal)) { showToast("Harga deal wajib diisi", "error"); return; } if (!validateUnitDraft()) return; try { await Api.cod.kurirSubmitBeli(selected.cod_id, { deal_price: Number(deal), unit_data: { ...unit, foto_url: foto[0] } }); showToast("Data COD beli dikirim untuk approval"); setSelected(null); await load(); } catch (e) { showToast(e instanceof Error ? e.message : "Submit COD beli gagal", "error"); } };
  const openUnit = (item: CODRequest): void => { setSelected(item); setDeal(String(item.offer_price || "")); setFoto([]); setUnit(EMPTY_UNIT); };
  const update = (key: keyof UnitDraft, value: string | number): void => setUnit((old) => ({ ...old, [key]: value }));
  const openDeliveryProof = (item: CODRequest): void => { setDeliveringItem(item); setUnitProof([]); setCustomerProof([]); setDealPriceFinal(""); };
  const confirmDelivered = async (): Promise<void> => {
    if (!deliveringItem) return;
    if (!unitProof.length || !customerProof.length) { showToast("Foto unit dan foto bersama customer wajib diupload", "error"); return; }
    setConfirmingDelivery(true);
    try { await status(deliveringItem, "terkirim", undefined, [unitProof[0], customerProof[0]], dealPriceFinal ? Number(dealPriceFinal) : undefined); setDeliveringItem(null); }
    finally { setConfirmingDelivery(false); }
  };
  // Seller's number for beli, customer's for jual/delivery — whichever the
  // kasir actually captured at creation. Kurir had no in-app way to reach
  // either side before this; both numbers were saved but never surfaced.
  const phoneOf = (item: CODRequest): string | undefined => item.wa_customer || item.wa_number || undefined;
  const waButton = (item: CODRequest): JSX.Element | null => {
    const phone = phoneOf(item);
    return phone ? <a href={waLink(phone)} target="_blank" rel="noopener noreferrer" className="btn-ghost" title="Hubungi via WhatsApp">WA</a> : null;
  };
  const action = (item: CODRequest): JSX.Element => { if (item.status === "menunggu_kurir") return <>{item.kurir_id && <button type="button" className="btn-error mr-2" onClick={() => openReject(item)}>Tolak</button>}<button type="button" className="btn-primary" onClick={() => void accept(item)}>Accept</button></>; if (item.status === "diterima") return <button type="button" className="btn-primary" onClick={() => void status(item, item.type === "beli" ? "kurir_menuju_lokasi" : item.type === "delivery" ? "kurir_menuju_toko" : "barang_akan_dijemput")}>Mulai Tugas</button>; if (item.status === "barang_akan_dijemput" || item.status === "kurir_menuju_toko") return <button type="button" className="btn-primary" onClick={() => void status(item, "barang_sudah_diambil")}>Barang Sudah Diambil</button>; if (item.status === "kurir_menuju_lokasi") return <><button type="button" className="btn-error mr-2" onClick={() => openReject(item)}>Tolak</button><button type="button" className="btn-primary" onClick={() => void status(item, "sudah_bertemu_penjual")}>Sudah Bertemu</button></>; if (item.status === "sudah_bertemu_penjual") return <>{item.type === "beli" && <button type="button" className="btn-error mr-2" onClick={() => openRejectBeli(item)}>Tolak</button>}<button type="button" className="btn-primary" onClick={() => openUnit(item)}>{item.type === "beli" ? "Submit Data Beli" : "Input Stok"}</button></>; if (item.status === "barang_sudah_diambil" && item.type === "delivery") return <button type="button" className="btn-primary" onClick={() => void status(item, "sedang_diantar")}>Mulai Antar</button>; if (item.status === "sedang_diantar") return <><button type="button" className="btn-success mr-2" onClick={() => openDeliveryProof(item)}>Terkirim</button><button type="button" className="btn-error" onClick={() => void status(item, "gagal")}>Gagal</button></>; if (item.status === "barang_sudah_diambil" && item.type === "jual") return <button type="button" className="btn-primary" onClick={() => void status(item, "kurir_sedang_transaksi")}>Mulai Transaksi</button>; if (item.status === "kurir_sedang_transaksi") return <><button type="button" className="btn-success mr-2" onClick={() => void status(item, "transaksi_berhasil")}>Berhasil</button><button type="button" className="btn-error" onClick={() => void status(item, "gagal")}>Gagal</button></>; return <span className="text-jp-muted dark:text-jp-muted-dark">{labels[item.status] || item.status}</span>; };
  return <div className="jp-page"><div><h1 className="jp-page-title">Dashboard Kurir</h1><p className="text-sm text-jp-muted dark:text-jp-muted-dark">Kelola tugas COD beli, jual, dan delivery</p></div>{loading ? <LoadingSkeleton numberOfRows={5}/> : error ? <ErrorState message={error} onRetry={load}/> : <>
    {/* Mobile: stacked cards so Lokasi/Status never end up scrolled off-screen like the table does on a phone. */}
    <div className="md:hidden space-y-3">{items.length ? items.map((item) => <div key={item.cod_id} className="panel rounded-jp-md p-4 space-y-2"><div className="flex items-center justify-between"><span className="badge">{item.type}</span><span className="text-[10px] text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(item.created_at, resolveCabangTimezone(cabangTz, item.cabang))}</span></div><p className="text-sm font-medium">{item.product_name || item.trx_id || item.items?.map((x) => x.nama).join(", ") || "COD"}</p><div className="flex items-center justify-between gap-2 text-xs"><span className="text-jp-muted dark:text-jp-muted-dark">{item.delivery_address || item.location || NOT_SET}</span><CodStatusBadge status={item.status}>{labels[item.status] || item.status}</CodStatusBadge></div><div className="flex flex-wrap gap-2 pt-1">{waButton(item)}{action(item)}</div></div>) : <EmptyState message="Belum ada tugas COD" iconName="truckSvg"/>}</div>
    {/* Desktop: original table. */}
    <div className="hidden md:block table-wrap overflow-x-auto rounded-jp-md"><table className="w-full text-xs"><thead className="tbl-head"><tr>{["Waktu","Tipe","Detail","Lokasi","Status","Aksi"].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead><tbody>{items.length ? items.map((item) => <tr key={item.cod_id} className="tbl-row"><td className="whitespace-nowrap px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(item.created_at, resolveCabangTimezone(cabangTz, item.cabang))}</td><td className="px-5 py-4"><span className="badge">{item.type}</span></td><td className="px-5 py-4 font-medium">{item.product_name || item.trx_id || item.items?.map((x) => x.nama).join(", ") || "COD"}</td><td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{item.delivery_address || item.location || NOT_SET}</td><td className="px-5 py-4"><CodStatusBadge status={item.status}>{labels[item.status] || item.status}</CodStatusBadge></td><td className="tbl-action-col px-5 py-4 whitespace-nowrap"><div className="flex flex-wrap items-center gap-2">{waButton(item)}{action(item)}</div></td></tr>) : <tr><td colSpan={6}><EmptyState message="Belum ada tugas COD" iconName="truckSvg"/></td></tr>}</tbody></table></div>
  </>}
    <Modal isOpen={Boolean(selected) && selected?.status === "sudah_bertemu_penjual"} onClose={() => setSelected(null)} title={selected?.type === "beli" ? "Submit COD Beli" : "Input Stok Unit"} maxWidthClassName="max-w-3xl">
      <div className="space-y-4">
        <p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">Isi data fisik unit sesuai kondisi sebenarnya di lokasi — kategori dan kondisi awal akan dikonfirmasi ulang oleh kasir saat approval.</p>
        <div className="grid grid-cols-2 gap-3">
          <LabelledInput label="Harga Deal (Rp)" type="number" value={deal} onChange={(e) => setDeal(e.target.value)}/>
          <LabelledInput label="Merk" required value={unit.merk} onChange={(e) => update("merk", e.target.value)} placeholder="Contoh: Apple, Samsung, Xiaomi"/>
          <LabelledInput label="Tipe" required value={unit.tipe} onChange={(e) => update("tipe", e.target.value)} placeholder="Contoh: iPhone 13, Galaxy A54"/>
          <LabelledInput label="IMEI 1" required inputMode="numeric" value={unit.imei} onChange={(e) => update("imei", e.target.value)} placeholder="14-16 digit angka" helper="Isi &quot;-&quot; jika tidak ada IMEI"/>
          <LabelledInput label="IMEI 2" inputMode="numeric" value={unit.imei2} onChange={(e) => update("imei2", e.target.value)} placeholder="Opsional — 14-16 digit angka" helper="Isi &quot;-&quot; jika tidak ada"/>
          <LabelledInput label="Storage" value={unit.storage} onChange={(e) => update("storage", e.target.value)} placeholder="Contoh: 128GB"/>
          <LabelledInput label="RAM" value={unit.ram} onChange={(e) => update("ram", e.target.value)} placeholder="Contoh: 6GB"/>
          <LabelledInput label="Warna" value={unit.warna} onChange={(e) => update("warna", e.target.value)} placeholder="Contoh: Midnight Black"/>
          <LabelledSelect label="Tipe SIM" value={unit.tipe_sim} onChange={(e) => update("tipe_sim", e.target.value)}>{TIPE_SIM_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</LabelledSelect>
          <LabelledCheckboxGroup label="Keamanan" options={KEAMANAN_OPTIONS} value={unit.keamanan} onChange={(v) => update("keamanan", v)} exclusiveOption="Tidak Ada"/>
          <LabelledSelect label="Speaker" value={unit.speaker} onChange={(e) => update("speaker", e.target.value)}>{SPEAKER_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</LabelledSelect>
          <LabelledSelect label="LCD" value={unit.lcd} onChange={(e) => update("lcd", e.target.value)}>{LCD_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</LabelledSelect>
          <LabelledSelect label="Kondisi HP" value={unit.kondisi_hp} onChange={(e) => update("kondisi_hp", e.target.value)}><option>Mulus</option><option>Repair</option></LabelledSelect>
          <LabelledInput label="Battery (%)" type="number" min={0} max={100} value={unit.battery} onChange={(e) => update("battery", Number(e.target.value))}/>
        </div>
        <LabelledTextarea label="Catatan" rows={2} value={unit.catatan} onChange={(e) => update("catatan", e.target.value)} placeholder="Kondisi tambahan yang perlu dicatat"/>
        <ImageUploader id="kurir-unit-foto" maxFiles={1} label="Foto Unit" folder="jayaphone/units/cod-beli" onChange={(images) => setFoto(images.map((image) => image.secure_url))}/>
        <button type="button" className="btn-primary w-full" onClick={() => void (selected?.type === "beli" ? submitBeli() : inputStok())}>{selected?.type === "beli" ? "Kirim untuk Approval" : "Simpan ke Stok"}</button>
      </div>
    </Modal>
    <Modal isOpen={Boolean(deliveringItem)} onClose={() => setDeliveringItem(null)} title="Konfirmasi Terkirim">
      <div className="space-y-4">
        <p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">Foto bukti serah terima wajib diupload sebelum delivery ditandai selesai.</p>
        <ImageUploader id="delivery-proof-unit" maxFiles={1} required label="Foto Unit / HP yang Diserahkan" folder="jayaphone/cod/delivery-proof" onChange={(images) => setUnitProof(images.map((image) => image.secure_url))}/>
        <ImageUploader id="delivery-proof-customer" maxFiles={1} required label="Foto Bersama Customer" folder="jayaphone/cod/delivery-proof" onChange={(images) => setCustomerProof(images.map((image) => image.secure_url))}/>
        <LabelledInput label="Harga Deal Akhir (Rp)" type="number" min={0} value={dealPriceFinal} onChange={(e) => setDealPriceFinal(e.target.value)} helper="Isi hanya kalau nego di lokasi ketemu harga beda dari yang tercatat. Kosongkan kalau sesuai."/>
        <button type="button" className="btn-success w-full" disabled={confirmingDelivery} onClick={() => void confirmDelivered()}>{confirmingDelivery ? "Menyimpan..." : "Konfirmasi Terkirim"}</button>
      </div>
    </Modal>
    <Modal isOpen={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} title="Tolak Tugas">
      <div className="space-y-4">
        <p className="text-sm text-jp-muted dark:text-jp-muted-dark">{rejectTarget?.item.product_name || rejectTarget?.item.trx_id || "Tugas ini"} akan ditolak dan dilepas dari daftar Anda.</p>
        <LabelledTextarea label="Alasan" required={rejectTarget?.mode === "beli"} rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={rejectTarget?.mode === "beli" ? "Wajib diisi — contoh: harga deal tidak sesuai" : "Opsional"}/>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={() => setRejectTarget(null)}>Batal</button>
          <button type="button" disabled={rejecting} className="btn-error flex-1" onClick={() => void confirmReject()}>{rejecting ? "Menyimpan..." : "Tolak Tugas"}</button>
        </div>
      </div>
    </Modal>
  </div>;
}
