"use client";
import { FormEvent, useEffect, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { LabelledCheckboxGroup, LabelledInput, LabelledSelect, LabelledTextarea } from "@/components/ui/InputField";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { Sparepart, UploadedImage } from "@/lib/types";
import { formatRupiah } from "@/lib/utils/formatters";
import { KATEGORI_OPTIONS, KONDISI_OPTIONS, IMEI_PATTERN, TIPE_SIM_OPTIONS, KEAMANAN_OPTIONS, SPEAKER_OPTIONS, LCD_OPTIONS } from "@/lib/config/unitCodes";
// Ex Inter/Reject aren't real intake grades for stock being freshly added here —
// they stay available in KONDISI_OPTIONS for Approval COD-Beli, where a
// courier-sourced unit's actual condition can legitimately be either.
const KONDISI_AWAL_OPTIONS_TAMBAH_UNIT = KONDISI_OPTIONS.filter((opt) => opt.code === "BN" || opt.code === "MN");
const EMPTY_FORM = { kat_kode: "", kondisi_kode: "", merk: "", tipe: "", storage: "", ram: "", warna: "", imei: "", imei2: "", tipe_sim: "Single SIM", keamanan: "Tidak Ada", speaker: "Normal", lcd: "Original", kondisi_hp: "Mulus", battery: "100", harga_modal: "", harga_jual: "", garansi_toko: "7", catatan: "", keluhan: "" };

interface RepairCartItem { sp_id: string; nama: string; harga_beli: number; jumlah: number }

// GAP-003 (LEGACY_GAP_ANALYSIS.md) — legacy toggleKeluhanField/loadSpRepairList/
// toggleSpRepair/renderSpRepairKeranjang/ubahJmlSpRepair (index.html:1594-1688):
// when Kondisi HP = Repair, the kasir/teknisi picks which spareparts were
// consumed fixing the incoming unit. Sent as sparepart_items on
// Api.units.create() — the field already existed in the API type, this page
// just never collected it.
function SparepartRepairCart({ cart, setCart }: { cart: RepairCartItem[]; setCart: (next: RepairCartItem[]) => void }): JSX.Element {
  const [spareparts, setSpareparts] = useState<Sparepart[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Api.sparepart
      .list({})
      .then((response) => { if (!cancelled) setSpareparts(response.data ?? []); })
      .catch((e) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : "Gagal memuat sparepart"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggle = (sp: Sparepart): void => {
    const existingIndex = cart.findIndex((item) => item.sp_id === sp.sp_id);
    if (existingIndex === -1) setCart([...cart, { sp_id: sp.sp_id, nama: sp.nama, harga_beli: sp.harga_beli, jumlah: 1 }]);
    else setCart(cart.filter((item) => item.sp_id !== sp.sp_id));
  };

  const changeQty = (sp_id: string, delta: number): void => {
    const next = cart
      .map((item) => (item.sp_id === sp_id ? { ...item, jumlah: item.jumlah + delta } : item))
      .filter((item) => item.jumlah > 0);
    setCart(next);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="label mb-0">Sparepart yang Dipakai (opsional)</p>
        <p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">Pilih sparepart yang dipakai untuk memperbaiki unit ini — stok sparepart akan diproses lewat tiket service yang dibuat otomatis.</p>
      </div>
      {loading ? (
        <p className="py-2 text-center text-xs text-jp-muted dark:text-jp-muted-dark">Memuat sparepart...</p>
      ) : loadError ? (
        <p className="py-2 text-center text-xs text-jp-danger dark:text-jp-danger-dark">{loadError}</p>
      ) : spareparts.length === 0 ? (
        <p className="py-2 text-center text-xs text-jp-muted dark:text-jp-muted-dark">Belum ada sparepart</p>
      ) : (
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-jp-sm border border-jp-border p-1.5 dark:border-jp-border-dark">
          {spareparts.map((sp) => {
            const isSelected = cart.some((item) => item.sp_id === sp.sp_id);
            const isOutOfStock = sp.stok <= 0;
            return (
              <button
                type="button"
                key={sp.sp_id}
                disabled={isOutOfStock}
                onClick={() => toggle(sp)}
                className={`flex w-full items-center justify-between rounded-jp-xs p-2.5 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isSelected ? "bg-jp-surface-subtle dark:bg-jp-surface-subtle-dark" : "hover:bg-jp-surface-subtle/60 dark:hover:bg-jp-surface-subtle-dark/60"}`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-md border ${isSelected ? "border-jp-text bg-jp-text dark:border-jp-text-dark dark:bg-jp-text-dark" : "border-jp-border dark:border-jp-border-dark"}`}>
                    {isSelected ? <span className="h-1.5 w-1.5 rounded-sm bg-jp-surface dark:bg-jp-surface-dark" /> : null}
                  </span>
                  <span>
                    <span className="block text-xs font-medium text-jp-text dark:text-jp-text-dark">{sp.nama}</span>
                    <span className="block text-[11px] text-jp-muted dark:text-jp-muted-dark">Stok: {sp.stok} {sp.satuan}</span>
                  </span>
                </span>
                <span className="text-[11px] text-jp-muted dark:text-jp-muted-dark">{formatRupiah(sp.harga_beli)}</span>
              </button>
            );
          })}
        </div>
      )}
      {cart.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">Dipilih:</p>
          {cart.map((item) => (
            <div key={item.sp_id} className="flex items-center justify-between rounded-jp-xs border border-jp-border bg-jp-surface-subtle p-2.5 dark:border-jp-border-dark dark:bg-jp-surface-subtle-dark">
              <span className="text-xs font-medium text-jp-text dark:text-jp-text-dark">{item.nama}</span>
              <span className="flex items-center gap-1.5">
                <button type="button" onClick={() => changeQty(item.sp_id, -1)} className="flex h-6 w-6 items-center justify-center rounded-jp-xs bg-jp-surface text-xs dark:bg-jp-surface-dark">−</button>
                <span className="w-4 text-center text-xs font-semibold text-jp-text dark:text-jp-text-dark">{item.jumlah}</span>
                <button type="button" onClick={() => changeQty(item.sp_id, 1)} className="flex h-6 w-6 items-center justify-center rounded-jp-xs bg-jp-surface text-xs dark:bg-jp-surface-dark">+</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TambahUnitPage(): JSX.Element {
  const { user } = useAuth(); const { showToast } = useToast(); const [saving, setSaving] = useState(false); const [photos, setPhotos] = useState<UploadedImage[]>([]); const [uploaderKey, setUploaderKey] = useState(0); const [lastSavedUnitId, setLastSavedUnitId] = useState(""); const [form, setForm] = useState(EMPTY_FORM); const [repairCart, setRepairCart] = useState<RepairCartItem[]>([]); const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const isRepair = form.kondisi_hp === "Repair";
  const submit = async () => {
    const required = ["kat_kode","kondisi_kode","merk","tipe","imei", ...(isRepair ? [] : ["harga_jual"])];
    if (required.some((key) => !form[key as keyof typeof form].trim())) { showToast(isRepair ? "Kategori, kondisi awal, merk, tipe, dan IMEI wajib diisi" : "Kategori, kondisi awal, merk, tipe, IMEI, dan harga jual wajib diisi", "error"); return; }
    if (isRepair && !form.keluhan.trim()) { showToast("Keluhan wajib diisi untuk unit kondisi Repair", "error"); return; }
    if (form.imei !== "-" && !IMEI_PATTERN.test(form.imei)) { showToast("IMEI harus 14-16 digit angka, atau isi \"-\" jika tidak ada IMEI", "error"); return; }
    if (form.imei2 && form.imei2 !== "-" && !IMEI_PATTERN.test(form.imei2)) { showToast("IMEI 2 harus 14-16 digit angka, atau isi \"-\" jika tidak ada", "error"); return; }
    setSaving(true);
    try {
      const response = await Api.units.create({ ...form, kondisi_hp: form.kondisi_hp as "Mulus" | "Repair", battery: Number(form.battery) || 0, harga_modal: Number(form.harga_modal) || undefined, harga_jual: isRepair ? 0 : Number(form.harga_jual), garansi_toko: Number(form.garansi_toko) || 0, cabang: user?.cabang || "JYP", foto_url: photos[0]?.secure_url || null, keluhan: isRepair ? form.keluhan : undefined, sparepart_items: isRepair && repairCart.length ? repairCart.map((item) => ({ sp_id: item.sp_id, jumlah: item.jumlah })) : undefined });
      showToast(response.message || (isRepair ? "Unit masuk ke tiket service (Antrian)" : "Unit berhasil ditambahkan"));
      setLastSavedUnitId(response.data.unit_id);
      setForm(EMPTY_FORM); setPhotos([]); setUploaderKey((key) => key + 1); setRepairCart([]);
    } catch (e) { showToast(e instanceof ApiError ? e.message : "Gagal menambah unit", "error"); } finally { setSaving(false); }
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>): void => { event.preventDefault(); void submit(); };
  return <form className="jp-page max-w-4xl kasir-intake" onSubmit={onSubmit}><div><h1 className="jp-page-title">Tambah Unit</h1><p className="text-sm text-jp-muted dark:text-jp-muted-dark">Input unit baru ke stok cabang {user?.cabang || ""}</p></div><div className="form-section"><h2 className="text-sm font-semibold">Identitas Unit</h2><p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">Unit ID dibuat otomatis oleh sistem dari Kategori + Kondisi Awal + cabang (contoh: JYP-IP-BN-004).</p><div className="grid gap-3 sm:grid-cols-2"><LabelledSelect label="Kategori" required value={form.kat_kode} onChange={(e) => set("kat_kode", e.target.value)}><option value="">Pilih kategori</option>{KATEGORI_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.label}</option>)}</LabelledSelect><LabelledSelect label="Kondisi Awal" required value={form.kondisi_kode} onChange={(e) => set("kondisi_kode", e.target.value)}><option value="">Pilih kondisi</option>{KONDISI_AWAL_OPTIONS_TAMBAH_UNIT.map((opt) => <option key={opt.code} value={opt.code}>{opt.label}</option>)}</LabelledSelect><LabelledInput label="IMEI 1" required inputMode="numeric" helper="14-16 digit angka, atau isi &quot;-&quot; jika tidak ada" value={form.imei} onChange={(e) => set("imei", e.target.value)}/><LabelledInput label="Merk" required value={form.merk} onChange={(e) => set("merk", e.target.value)}/><LabelledInput label="Tipe" required value={form.tipe} onChange={(e) => set("tipe", e.target.value)}/><LabelledInput label="Storage" value={form.storage} onChange={(e) => set("storage", e.target.value)}/><LabelledInput label="RAM" value={form.ram} onChange={(e) => set("ram", e.target.value)}/><LabelledInput label="Warna" value={form.warna} onChange={(e) => set("warna", e.target.value)}/><LabelledInput label="IMEI 2" inputMode="numeric" helper="Opsional — 14-16 digit angka, atau &quot;-&quot;" value={form.imei2} onChange={(e) => set("imei2", e.target.value)}/><LabelledSelect label="Tipe SIM" value={form.tipe_sim} onChange={(e) => set("tipe_sim", e.target.value)}>{TIPE_SIM_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</LabelledSelect><LabelledSelect label="Kondisi HP" value={form.kondisi_hp} onChange={(e) => set("kondisi_hp", e.target.value)}><option value="Mulus">Mulus — langsung masuk stok jual</option><option value="Repair">Repair — masuk antrian service teknisi</option></LabelledSelect><LabelledInput label="Battery (%)" type="number" min={0} max={100} value={form.battery} onChange={(e) => set("battery", e.target.value)}/></div></div><div className="form-section"><h2 className="text-sm font-semibold">Pemeriksaan Fisik</h2><div className="grid gap-3 sm:grid-cols-2"><LabelledCheckboxGroup label="Keamanan" options={KEAMANAN_OPTIONS} value={form.keamanan} onChange={(v) => set("keamanan", v)} exclusiveOption="Tidak Ada"/><LabelledSelect label="Speaker" value={form.speaker} onChange={(e) => set("speaker", e.target.value)}>{SPEAKER_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</LabelledSelect><LabelledSelect label="LCD" value={form.lcd} onChange={(e) => set("lcd", e.target.value)}>{LCD_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</LabelledSelect><LabelledTextarea label="Catatan" rows={2} value={form.catatan} onChange={(e) => set("catatan", e.target.value)}/></div><ImageUploader key={uploaderKey} id="unit-photo" maxFiles={5} label="Foto Unit" folder="jayaphone/units" onChange={setPhotos}/></div>{isRepair && <div className="rounded-jp-md border border-jp-warning/30 bg-jp-warning/5 space-y-4 p-5"><h2 className="text-sm font-semibold text-jp-text dark:text-jp-text-dark">Perbaikan (Kondisi Repair)</h2><p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">Unit ini akan masuk sebagai tiket service (status Antrian), bukan langsung ke stok Tersedia — harga jual ditentukan nanti lewat Approval Repair setelah selesai diperbaiki.</p><LabelledTextarea label="Keluhan" required rows={2} placeholder="Contoh: LCD retak, baterai boros" value={form.keluhan} onChange={(e) => set("keluhan", e.target.value)}/><SparepartRepairCart cart={repairCart} setCart={setRepairCart}/></div>}<div className="form-section"><h2 className="text-sm font-semibold">Harga & Garansi</h2><div className="grid gap-3 sm:grid-cols-3"><LabelledInput label="Harga Modal" type="number" value={form.harga_modal} onChange={(e) => set("harga_modal", e.target.value)}/>{!isRepair && <LabelledInput label="Harga Jual" required type="number" value={form.harga_jual} onChange={(e) => set("harga_jual", e.target.value)}/>}<LabelledInput label="Garansi Toko (hari)" type="number" value={form.garansi_toko} onChange={(e) => set("garansi_toko", e.target.value)}/></div>{isRepair && <p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">Harga jual ditentukan nanti setelah unit selesai diperbaiki (lihat Approval Repair).</p>}<button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Menyimpan..." : "Simpan Unit"}</button>{lastSavedUnitId && <p className="text-center text-xs text-jp-success">Unit <span className="font-mono">{lastSavedUnitId}</span> tersimpan. Form siap untuk input unit berikutnya.</p>}</div></form>;
}
