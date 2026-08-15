"use client";

import { useEffect, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import { LabelledInput, LabelledSelect, LabelledTextarea } from "@/components/ui/InputField";
import { useToast } from "@/contexts/ToastContext";
import type { KurirListItem } from "@/lib/types";

export default function CodJualPage(): JSX.Element {
  const { showToast } = useToast();
  const [kurirList, setKurirList] = useState<KurirListItem[]>([]);
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [waCustomer, setWaCustomer] = useState("");
  const [kurirId, setKurirId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { void Api.cod.kurirList().then((r) => setKurirList(r.data ?? [])).catch(() => undefined); }, []);

  const submit = async (): Promise<void> => {
    if (!product.trim()) { showToast("Nama produk wajib diisi", "error"); return; }
    if (!deliveryAddress.trim()) { showToast("Alamat pengiriman wajib diisi", "error"); return; }
    // Unlike COD Beli/Delivery (broadcast ke semua kurir aktif), jual selalu
    // menunjuk satu kurir tertentu — backend menolak request tanpa kurir_id
    // untuk type=jual (lihat CODRequestCreate.validate_kurir_id).
    if (!kurirId) { showToast("Pilih kurir wajib diisi", "error"); return; }
    setSaving(true);
    try {
      await Api.cod.create({
        type: "jual",
        product_name: product.trim(),
        offer_price: Number(price) || 0,
        delivery_address: deliveryAddress.trim(),
        wa_customer: waCustomer.trim(),
        kurir_id: kurirId,
        note: note.trim(),
      });
      showToast("COD Jual berhasil dibuat — menunggu kurir accept");
      setProduct(""); setPrice(""); setDeliveryAddress(""); setWaCustomer(""); setKurirId(""); setNote("");
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "COD Jual gagal dibuat", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="jp-page max-w-2xl">
      <div>
        <h1 className="jp-page-title">COD Jual</h1>
        <p className="mt-1 text-sm text-jp-muted dark:text-jp-muted-dark">Kirim unit ke customer lewat kurir untuk transaksi COD di lokasi customer.</p>
      </div>
      <div className="rounded-jp-md border border-jp-border bg-jp-surface p-6 dark:border-jp-border-dark dark:bg-jp-surface-dark">
        <p className="mb-6 text-xs font-medium uppercase tracking-widest text-jp-muted dark:text-jp-muted-dark">Detail order</p>
        <div className="space-y-5">
          <LabelledInput label="Nama Produk" required value={product} onChange={(event) => setProduct(event.target.value)} placeholder="iPhone 15 Pro Max" />
          <LabelledInput label="Harga Jual (Rp)" type="number" min={0} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="5000000" />
          <LabelledTextarea label="Alamat Pengiriman" required rows={2} value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Alamat lengkap customer" />
          <LabelledInput label="WA Customer" value={waCustomer} onChange={(event) => setWaCustomer(event.target.value)} placeholder="08xxx" />
          <LabelledSelect label="Kurir" required value={kurirId} onChange={(event) => setKurirId(event.target.value)}>
            <option value="">Pilih kurir...</option>
            {kurirList.map((k) => <option key={k.kurir_id} value={k.kurir_id}>{k.kurir_name}</option>)}
          </LabelledSelect>
          {kurirList.length === 0 && <p className="text-[11px] text-jp-danger dark:text-jp-danger-dark">Tidak ada kurir aktif di cabang Anda.</p>}
          <LabelledTextarea label="Catatan" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Catatan tambahan" />
          <button type="button" className="btn-primary w-full" disabled={saving || kurirList.length === 0} onClick={() => void submit()}>{saving ? "Menyimpan..." : "Buat Order COD Jual"}</button>
        </div>
      </div>
    </div>
  );
}
