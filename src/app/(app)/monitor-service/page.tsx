"use client";

import { useMemo } from "react";
import { Api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ServiceStatusBadge } from "@/components/ui/Badge";
import { useApiList } from "@/hooks/useApiList";
import type { ServiceTicket } from "@/lib/types";

export default function MonitorServicePage(): JSX.Element {
  const { user } = useAuth();
  const scopedCabang = user?.role === "kepala_cabang" ? user.cabang : undefined;
  const { items, loading, error, reload } = useApiList<ServiceTicket>(() => Api.service.list({ limit: 100, cabang: scopedCabang }).then((response) => response.data ?? []), [scopedCabang], "Gagal memuat monitor service");
  const summary = useMemo(() => ({ antrian: items.filter((item) => item.status === "Antrian").length, proses: items.filter((item) => item.status === "Proses").length, menunggu: items.filter((item) => item.status === "Menunggu_Sparepart").length, selesai: items.filter((item) => item.status === "Selesai").length }), [items]);
  return <div className="jp-page"><header className="jp-page-header"><div><h1 className="jp-page-title">Monitor Service</h1><p className="jp-page-description">Pantau antrian perbaikan dan kebutuhan sparepart seluruh cabang.</p></div></header><section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Antrian", summary.antrian], ["Proses", summary.proses], ["Menunggu Sparepart", summary.menunggu], ["Selesai", summary.selesai]].map(([label, value]) => <div key={String(label)} className="metric-card"><p className="label">{label}</p><strong className="text-2xl">{value}</strong></div>)}</section>{loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={reload} /> : <div className="table-wrap overflow-x-auto"><table className="w-full min-w-[700px] text-xs"><thead className="tbl-head"><tr>{["Service ID", "Unit", "Keluhan", "Teknisi", "Status"].map((heading) => <th key={heading} className="px-5 py-3 text-left">{heading}</th>)}</tr></thead><tbody>{items.length ? items.map((ticket) => <tr key={ticket.service_id} className="tbl-row"><td className="px-5 py-4 font-mono">{ticket.service_id}</td><td className="px-5 py-4 font-medium">{ticket.unit_label}</td><td className="px-5 py-4">{ticket.keluhan}</td><td className="px-5 py-4">{ticket.teknisi || "Belum ditugaskan"}</td><td className="px-5 py-4"><ServiceStatusBadge status={ticket.status} /></td></tr>) : <tr><td colSpan={5}><EmptyState message="Belum ada tiket service" iconName="wrenchSvg" /></td></tr>}</tbody></table></div>}</div>;
}
