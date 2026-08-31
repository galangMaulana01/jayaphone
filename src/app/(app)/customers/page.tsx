"use client";

import { Suspense, useMemo, useState } from "react";
import { Api } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { LabelledInput, LabelledTextarea } from "@/components/ui/InputField";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useApiList } from "@/hooks/useApiList";
import { useUrlParam } from "@/hooks/useUrlParam";
import { Icon } from "@/lib/icons";
import { CabangFilter } from "@/components/ui/CabangFilter";
import type { Customer } from "@/lib/types";

const CUSTOMER_STATUS_FILTERS = ["", "Pending", "Verified", "Rejected"] as const;
const CUSTOMER_SORT_MODES = ["", "poin"] as const;

export default function CustomersPage(): JSX.Element {
  return <Suspense fallback={null}><CustomersPageInner /></Suspense>;
}

function CustomersPageInner(): JSX.Element {
  const { user } = useAuth(); const { showToast } = useToast();
  const [query, setQuery] = useState("");
  // Deep-link support: sidebar's "Verifikasi"/"Poin Customer" shortcuts land
  // here with ?status= / ?sort=poin — the query params ARE the state, so
  // switching via the sidebar or this page's own filter can't disagree.
  const [status, setStatus] = useUrlParam("status", CUSTOMER_STATUS_FILTERS, "");
  const [sort, setSort] = useUrlParam("sort", CUSTOMER_SORT_MODES, "");
  const [addOpen, setAddOpen] = useState(false); const [rejecting, setRejecting] = useState<Customer | null>(null);
  const [name, setName] = useState(""); const [contact, setContact] = useState(""); const [reason, setReason] = useState(""); const [targetCabang, setTargetCabang] = useState(user?.cabang || "");
  const { items, loading, error, reload: load } = useApiList<Customer>(
    () => Api.customer.list({ status: status || undefined }).then((r) => r.data ?? []),
    [status],
    "Gagal memuat customer",
  );
  const filtered = useMemo(() => {
    const bySearch = items.filter((c) => (user?.role !== "kepala_cabang" || c.cabang === user.cabang) && `${c.nama} ${c.kontak} ${c.cabang}`.toLowerCase().includes(query.toLowerCase()));
    return sort === "poin" ? [...bySearch].sort((a, b) => (b.points || 0) - (a.points || 0)) : bySearch;
  }, [items, query, sort]);
  const isApprover = user?.role === "owner" || user?.role === "kepala_cabang";
  const create = async () => { const cabang = user?.role === "owner" ? targetCabang : user?.cabang; if (!name.trim() || !contact.trim() || !cabang) { showToast("Nama, kontak, dan cabang wajib diisi", "error"); return; } try { await Api.customer.create({ nama: name.trim(), kontak: contact.trim(), cabang }); showToast("Customer berhasil ditambahkan"); setName(""); setContact(""); setAddOpen(false); await load(); } catch (e) { showToast(e instanceof Error ? e.message : "Gagal menambah customer", "error"); } };
  const action = async (kind: "approve" | "reject" | "resubmit", customer: Customer) => { try { if (kind === "approve") await Api.customer.approve(customer.id); else if (kind === "reject") { if (!reason.trim()) { showToast("Alasan reject wajib diisi", "error"); return; } await Api.customer.reject(customer.id, reason.trim()); } else await Api.customer.resubmit(customer.id); showToast(kind === "approve" ? "Customer disetujui" : kind === "reject" ? "Customer ditolak" : "Customer diajukan ulang"); setRejecting(null); setReason(""); await load(); } catch (e) { showToast(e instanceof Error ? e.message : "Aksi customer gagal", "error"); } };
  return <div className="jp-page"><div className="jp-page-header"><div><h1 className="jp-page-title">Data Customer</h1><p className="text-sm text-jp-muted dark:text-jp-muted-dark">Kelola customer dan status verifikasi</p></div><button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>+ Tambah Customer</button></div><div className="jp-toolbar"><input className="field-control search-field w-full sm:max-w-md" placeholder="Cari nama, kontak, cabang..." value={query} onChange={(e) => setQuery(e.target.value)} /><select className="field-control w-full text-xs sm:w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof CUSTOMER_STATUS_FILTERS[number])}><option value="">Semua Status</option><option value="Pending">Pending</option><option value="Verified">Verified</option><option value="Rejected">Rejected</option></select><select className="field-control w-full text-xs sm:w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof CUSTOMER_SORT_MODES[number])}><option value="">Urutan default</option><option value="poin">Poin tertinggi</option></select></div>{loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={load} /> : <div className="table-wrap overflow-x-auto rounded-jp-md"><table className="w-full text-xs"><thead className="tbl-head border-b"><tr>{["Nama","Kontak","Cabang","Status","Poin","Aksi"].map((h) => <th key={h} className={`px-6 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead><tbody>{filtered.length ? filtered.map((c) => <tr key={c.id} className="tbl-row"><td className="px-6 py-4 font-medium">{c.nama}</td><td className="px-6 py-4 text-jp-muted dark:text-jp-muted-dark">{c.kontak}</td><td className="px-6 py-4 text-jp-muted dark:text-jp-muted-dark">{c.cabang}</td><td className="px-6 py-4"><span className={`badge ${c.status === "Verified" ? "badge-tersedia" : c.status === "Rejected" ? "badge-sold" : "badge-booking"}`}>{c.status}</span></td><td className="whitespace-nowrap px-6 py-4"><span className="badge gap-1">{c.points > 0 && <Icon name="starSvg" className="h-3 w-3 text-jp-warning dark:text-jp-warning-dark" />}{c.points || 0} poin</span></td><td className="tbl-action-col px-6 py-4"><div className="flex flex-nowrap gap-1.5">{isApprover && c.status === "Pending" && <><button type="button" className="btn-success" onClick={() => void action("approve", c)}>Setujui</button><button type="button" className="btn-error" onClick={() => setRejecting(c)}>Tolak</button></>}{c.status === "Rejected" && <button type="button" className="btn-warning" onClick={() => void action("resubmit", c)}>Ajukan Ulang</button>}</div></td></tr>) : <tr><td colSpan={6}><EmptyState message="Belum ada customer" iconName="usersSvg" /></td></tr>}</tbody></table></div>}
    <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Tambah Customer"><div className="space-y-5"><LabelledInput label="Nama" value={name} onChange={(e) => setName(e.target.value)} /><LabelledInput label="Kontak" value={contact} onChange={(e) => setContact(e.target.value)} />{user?.role === "owner" && <CabangFilter label="Cabang" value={targetCabang} onChange={setTargetCabang} />}<div className="flex gap-2"><button type="button" className="btn-ghost flex-1" onClick={() => setAddOpen(false)}>Batal</button><button type="button" className="btn-primary flex-1" onClick={() => void create()}>Simpan</button></div></div></Modal>
    <Modal isOpen={Boolean(rejecting)} onClose={() => setRejecting(null)} title="Tolak Customer"><div className="space-y-5"><LabelledTextarea label="Alasan penolakan" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} /><div className="flex gap-2"><button type="button" className="btn-ghost flex-1" onClick={() => setRejecting(null)}>Batal</button><button type="button" className="btn-error flex-1" onClick={() => rejecting && void action("reject", rejecting)}>Tolak</button></div></div></Modal>
  </div>;
}
