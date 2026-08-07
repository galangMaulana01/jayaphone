"use client";
import { useState } from "react";
import { Api } from "@/lib/api";
import type { ActivityLog } from "@/lib/types";
import { DateFilterBar } from "@/components/ui/DateFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useToast } from "@/contexts/ToastContext";
import { useApiList } from "@/hooks/useApiList";
import { createDefaultDateFilter, toApiQueryParams, type DateFilterState } from "@/lib/utils/dateFilter";
import { formatDateTimeShort, NOT_SET } from "@/lib/utils/formatters";
export default function KurirLogPage(): JSX.Element { const { showToast } = useToast(); const [filter, setFilter] = useState<DateFilterState>(createDefaultDateFilter()); const { items, loading, error, reload: load } = useApiList<ActivityLog>(() => Api.cod.kurirLog(toApiQueryParams(filter)).then((r) => r.data ?? []), [filter], "Gagal memuat log kurir", (message) => showToast(message, "error")); return <div className="jp-page"><div className="jp-page-header"><div><h1 className="jp-page-title">Log Aktivitas Kurir</h1><p className="text-sm text-jp-muted dark:text-jp-muted-dark">Riwayat penerimaan dan pembaruan status COD</p></div><DateFilterBar currentFilterState={filter} onFilterStateChange={setFilter}/></div>{loading ? <LoadingSkeleton numberOfRows={6}/> : error ? <ErrorState message={error} onRetry={load}/> : <div className="log-list">{items.length ? items.map((item) => <div key={item.id} className="flex items-start gap-4 border-b border-jp-border dark:border-jp-border-dark px-6 py-4 last:border-0"><div className="mt-2 h-1.5 w-1.5 rounded-full bg-jp-faint"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium">{item.user}</span><span className="badge">{item.action||item.aksi||"-"}</span></div><p className="mt-1 text-[11px] text-jp-muted dark:text-jp-muted-dark">{item.target || item.detail || "-"}{item.cabang ? ` · ${item.cabang}` : ""}</p></div><span className="whitespace-nowrap text-[10px] text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(item.timestamp||item.waktu)||"-"}</span></div>) : <EmptyState message="Belum ada log aktivitas" iconName="clockSvg"/>}</div>}</div>; }
