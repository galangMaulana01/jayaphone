"use client";

import { useState } from "react";
import { Api } from "@/lib/api";
import { CodStatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useApiList } from "@/hooks/useApiList";
import { formatDateTimeShort, formatRupiah, NOT_SET } from "@/lib/utils/formatters";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import type { CODRequest } from "@/lib/types";

const TYPES = [{ value: "", label: "Semua" }, { value: "beli", label: "Beli" }, { value: "jual", label: "Jual" }, { value: "delivery", label: "Delivery" }] as const;
export default function CodMonitoringPage(): JSX.Element {
  const [type, setType] = useState<string>(""); const cabangTz = useCabangTimezones();
  const { items, loading, error, reload } = useApiList<CODRequest>(() => Api.cod.list({ type: type || undefined, limit: 100 }).then((r) => r.data ?? []), [type], "Gagal memuat monitoring COD");
  return <div className="jp-page"><header className="jp-page-header"><div><h1 className="jp-page-title">Monitoring COD</h1><p className="jp-page-description">Pantau posisi order COD Beli, Jual, dan Delivery dalam satu tempat.</p></div></header><div className="segmented-control">{TYPES.map((option) => <button type="button" key={option.value || "all"} className={`filter-tab ${type === option.value ? "filter-tab-active" : ""}`} onClick={() => setType(option.value)}>{option.label}</button>)}</div>{loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={reload} /> : <div className="table-wrap overflow-x-auto"><table className="w-full min-w-[780px] text-xs"><thead className="tbl-head"><tr>{["Waktu", "Tipe", "Produk", "Lokasi / Alamat", "Kurir", "Harga", "Status"].map((heading) => <th key={heading} className="px-5 py-3 text-left">{heading}</th>)}</tr></thead><tbody>{items.length ? items.map((item) => <tr key={item.cod_id} className="tbl-row"><td className="px-5 py-4">{formatDateTimeShort(item.created_at, resolveCabangTimezone(cabangTz, item.cabang))}</td><td className="px-5 py-4"><span className="badge">{item.type}</span></td><td className="px-5 py-4 font-medium">{item.product_name || item.trx_id || NOT_SET}</td><td className="max-w-[240px] truncate px-5 py-4">{item.location || item.delivery_address || NOT_SET}</td><td className="px-5 py-4">{item.kurir_name || NOT_SET}</td><td className="px-5 py-4">{formatRupiah(item.deal_price || item.offer_price || 0)}</td><td className="px-5 py-4"><CodStatusBadge status={item.status}>{item.status.replaceAll("_", " ")}</CodStatusBadge></td></tr>) : <tr><td colSpan={7}><EmptyState message="Belum ada order COD" iconName="truckSvg" /></td></tr>}</tbody></table></div>}</div>;
}
