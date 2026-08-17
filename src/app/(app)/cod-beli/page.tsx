"use client";

import { useState } from "react";
import { Api, ApiError } from "@/lib/api";
import { LabelledInput, LabelledTextarea } from "@/components/ui/InputField";
import { useToast } from "@/contexts/ToastContext";

export default function CodBeliPage(): JSX.Element {
  const { showToast } = useToast();

  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [wa, setWa] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (): Promise<void> => {
    if (!product.trim()) { showToast("Nama produk wajib diisi", "error"); return; }
    setSaving(true);
    try {
      await Api.cod.create({ type: "beli", product_name: product.trim(), offer_price: Number(price) || 0, location: location.trim() || "Toko", wa_number: wa.trim(), note: note.trim() });
      showToast("COD Beli berhasil dibuat — menunggu kurir accept");
      setProduct(""); setPrice(""); setLocation(""); setWa(""); setNote("");
    } catch (error) { showToast(error instanceof ApiError ? error.message : "COD gagal dibuat", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="jp-page">
      <div>
        <h1 className="jp-page-title">COD Beli</h1>
        <p className="mt-1 text-sm text-jp-muted dark:text-jp-muted-dark">Buat permintaan penjemputan unit dari penjual. Cek posisi order yang sudah dibuat di Monitoring COD.</p>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-jp-md border border-jp-border bg-jp-surface p-6 dark:border-jp-border-dark dark:bg-jp-surface-dark">
          <p className="mb-6 text-xs font-medium uppercase tracking-widest text-jp-muted dark:text-jp-muted-dark">Detail order</p>
          <div className="space-y-5">
            <LabelledInput label="Nama Produk" required value={product} onChange={(event) => setProduct(event.target.value)} placeholder="iPhone 15 Pro Max" />
            <LabelledInput label="Harga Offer (Rp)" type="number" min={0} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="5000000" />
            <LabelledInput label="Lokasi Penjual" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Alamat lokasi penjual" />
            <LabelledInput label="WA Penjual" value={wa} onChange={(event) => setWa(event.target.value)} placeholder="08xxx" />
            <LabelledTextarea label="Catatan" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Catatan tambahan" />
            <button type="button" className="btn-primary w-full" disabled={saving} onClick={() => void submit()}>{saving ? "Menyimpan..." : "Buat Order COD Beli"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
