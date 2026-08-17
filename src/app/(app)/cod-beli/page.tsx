"use client";

import { Suspense, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import { LabelledInput, LabelledTextarea } from "@/components/ui/InputField";
import { CodStatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useToast } from "@/contexts/ToastContext";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { useApiList } from "@/hooks/useApiList";
import { useUrlParam } from "@/hooks/useUrlParam";
import { formatDateTimeShort, formatRupiah, NOT_SET } from "@/lib/utils/formatters";
import type { CODRequest, CODStatus } from "@/lib/types";

const TAB_KEYS = ["buat", "monitoring"] as const;
type Tab = (typeof TAB_KEYS)[number];
const TABS: { key: Tab; label: string }[] = [
  { key: "buat", label: "Buat Order" },
  { key: "monitoring", label: "Monitoring" },
];

const STATUS_LABEL: Record<string, string> = {
  menunggu_kurir: "Menunggu Kurir", diterima: "Diterima", kurir_menuju_lokasi: "Menuju Lokasi",
  sudah_bertemu_penjual: "Sudah Bertemu", menunggu_approval_kasir: "Menunggu Approval",
  processing_approval: "Diproses", selesai: "Selesai", ditolak: "Ditolak",
};

export default function CodBeliPage(): JSX.Element {
  return <Suspense fallback={null}><CodBeliPageInner /></Suspense>;
}

function CodBeliPageInner(): JSX.Element {
  const { showToast } = useToast();
  const cabangTz = useCabangTimezones();
  // Deep-link support: the sidebar's "Monitoring Beli" shortcut (see nav.ts)
  // lands here with ?tab=monitoring applied.
  const [tab, setTab] = useUrlParam<Tab>("tab", TAB_KEYS, "buat");

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

  // Every "beli" ticket regardless of status — Approval COD Beli only shows
  // the ones already at menunggu_approval_kasir, so a kasir had no way to
  // see where an order stood while a kurir was still working it.
  const { items, loading, error, reload } = useApiList<CODRequest>(
    () => (tab === "monitoring" ? Api.cod.list({ type: "beli" }).then((r) => r.data ?? []) : Promise.resolve([])),
    [tab], "Gagal memuat monitoring COD Beli",
  );

  return (
    <div className="jp-page">
      <div>
        <h1 className="jp-page-title">COD Beli</h1>
        <p className="mt-1 text-sm text-jp-muted dark:text-jp-muted-dark">
          {tab === "buat" ? "Buat permintaan penjemputan unit dari penjual." : "Pantau posisi order COD Beli yang sudah dibuat."}
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
              <LabelledInput label="Harga Offer (Rp)" type="number" min={0} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="5000000" />
              <LabelledInput label="Lokasi Penjual" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Alamat lokasi penjual" />
              <LabelledInput label="WA Penjual" value={wa} onChange={(event) => setWa(event.target.value)} placeholder="08xxx" />
              <LabelledTextarea label="Catatan" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Catatan tambahan" />
              <button type="button" className="btn-primary w-full" disabled={saving} onClick={() => void submit()}>{saving ? "Menyimpan..." : "Buat Order COD Beli"}</button>
            </div>
          </div>
        </div>
      ) : (
        loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={reload} /> : (
          <div className="table-wrap overflow-x-auto rounded-jp-md">
            <table className="w-full text-xs">
              <thead className="tbl-head border-b"><tr>{["Waktu", "Produk", "Lokasi Penjual", "Kurir", "Harga", "Status"].map((h) => <th key={h} className="px-5 py-3.5 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {items.length ? items.map((item) => (
                  <tr key={item.cod_id} className="tbl-row">
                    <td className="whitespace-nowrap px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(item.created_at, resolveCabangTimezone(cabangTz, item.cabang))}</td>
                    <td className="px-5 py-4 font-medium">{item.product_name || NOT_SET}</td>
                    <td className="max-w-[220px] truncate px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{item.location || NOT_SET}</td>
                    <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{item.kurir_name || NOT_SET}</td>
                    <td className="px-5 py-4 font-mono">{formatRupiah(item.deal_price ?? item.offer_price)}</td>
                    <td className="px-5 py-4"><CodStatusBadge status={item.status as CODStatus}>{STATUS_LABEL[item.status] ?? item.status}</CodStatusBadge></td>
                  </tr>
                )) : <tr><td colSpan={6}><EmptyState message="Belum ada order COD Beli" iconName="truckSvg" /></td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
