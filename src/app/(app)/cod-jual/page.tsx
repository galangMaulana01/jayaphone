"use client";

import { Suspense, useEffect, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import { LabelledInput, LabelledSelect, LabelledTextarea } from "@/components/ui/InputField";
import { CodStatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useToast } from "@/contexts/ToastContext";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { useApiList } from "@/hooks/useApiList";
import { useUrlParam } from "@/hooks/useUrlParam";
import { formatDateTimeShort, formatRupiah, NOT_SET } from "@/lib/utils/formatters";
import type { CODRequest, CODStatus, KurirListItem } from "@/lib/types";

const TAB_KEYS = ["buat", "monitoring"] as const;
type Tab = (typeof TAB_KEYS)[number];
const TABS: { key: Tab; label: string }[] = [
  { key: "buat", label: "Buat Order" },
  { key: "monitoring", label: "Monitoring" },
];

const STATUS_LABEL: Record<string, string> = {
  menunggu_kurir: "Menunggu Kurir", diterima: "Diterima", barang_akan_dijemput: "Akan Dijemput",
  barang_sudah_diambil: "Barang Diambil", kurir_sedang_transaksi: "Sedang Transaksi",
  transaksi_berhasil: "Berhasil", gagal: "Gagal", ditolak: "Ditolak",
};

export default function CodJualPage(): JSX.Element {
  return <Suspense fallback={null}><CodJualPageInner /></Suspense>;
}

function CodJualPageInner(): JSX.Element {
  const { showToast } = useToast();
  const cabangTz = useCabangTimezones();
  // Deep-link support: the sidebar's "Monitoring Jual" shortcut (see nav.ts)
  // lands here with ?tab=monitoring applied.
  const [tab, setTab] = useUrlParam<Tab>("tab", TAB_KEYS, "buat");

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

  // Every "jual" ticket regardless of status — before this there was no
  // page at all where a kasir could check a COD Jual order's progress.
  const { items, loading, error, reload } = useApiList<CODRequest>(
    () => (tab === "monitoring" ? Api.cod.list({ type: "jual" }).then((r) => r.data ?? []) : Promise.resolve([])),
    [tab], "Gagal memuat monitoring COD Jual",
  );

  return (
    <div className="jp-page">
      <div>
        <h1 className="jp-page-title">COD Jual</h1>
        <p className="mt-1 text-sm text-jp-muted dark:text-jp-muted-dark">
          {tab === "buat" ? "Kirim unit ke customer lewat kurir untuk transaksi COD di lokasi customer." : "Pantau posisi order COD Jual yang sudah dibuat."}
        </p>
      </div>

      <div className="segmented-control md:hidden">
        {TABS.map((t) => <button type="button" key={t.key} className={`filter-tab ${tab === t.key ? "filter-tab-active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {tab === "buat" ? (
        <div className="max-w-2xl">
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
      ) : (
        loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={reload} /> : (
          <div className="table-wrap overflow-x-auto rounded-jp-md">
            <table className="w-full text-xs">
              <thead className="tbl-head border-b"><tr>{["Waktu", "Produk", "Alamat Pengiriman", "Kurir", "Harga", "Status"].map((h) => <th key={h} className="px-5 py-3.5 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {items.length ? items.map((item) => (
                  <tr key={item.cod_id} className="tbl-row">
                    <td className="whitespace-nowrap px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(item.created_at, resolveCabangTimezone(cabangTz, item.cabang))}</td>
                    <td className="px-5 py-4 font-medium">{item.product_name || NOT_SET}</td>
                    <td className="max-w-[220px] truncate px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{item.delivery_address || NOT_SET}</td>
                    <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{item.kurir_name || NOT_SET}</td>
                    <td className="px-5 py-4 font-mono">{formatRupiah(item.offer_price)}</td>
                    <td className="px-5 py-4"><CodStatusBadge status={item.status as CODStatus}>{STATUS_LABEL[item.status] ?? item.status}</CodStatusBadge></td>
                  </tr>
                )) : <tr><td colSpan={6}><EmptyState message="Belum ada order COD Jual" iconName="truckSvg" /></td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
