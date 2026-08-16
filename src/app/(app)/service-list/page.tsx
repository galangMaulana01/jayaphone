"use client";

// Teknisi workspace — redesigned per client's "WORKFLOW SERVICE & REQUEST
// SPAREPART" diagram (Aug 2026): Antrian (table) -> Pilih HP (read-only
// detail) -> Pilih Kebutuhan (Pakai Stok / Request / Tanpa Sparepart) ->
// [Menunggu Sparepart -> Sparepart Tersedia -> Gunakan Sparepart] ->
// Proses & Estimasi -> Selesai -> Riwayat. This route is teknisi-only per
// nav.ts (landingPageByRole.teknisi = "service-list"); the tiny fallback
// below is defensive, not a real second UI to maintain.

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Api } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { LabelledInput, LabelledTextarea } from "@/components/ui/InputField";
import { formatDateTimeShort, formatRupiah, NOT_SET } from "@/lib/utils/formatters";
import { ServiceStatusBadge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useCabangTimezones, resolveCabangTimezone } from "@/contexts/CabangTzContext";
import { useApiList } from "@/hooks/useApiList";
import { useUrlParam } from "@/hooks/useUrlParam";
import type {
  RequestSparepart, ServiceRiwayatItem, ServiceStatus, ServiceTicket, ServiceTicketDetail, Sparepart, UploadedImage,
} from "@/lib/types";

type Tab = "Antrian" | "Proses" | "Menunggu_Sparepart" | "Selesai" | "Ditolak" | "Riwayat";
const TAB_KEYS: readonly Tab[] = ["Antrian", "Proses", "Menunggu_Sparepart", "Selesai", "Ditolak", "Riwayat"];
const TABS: { key: Tab; label: string }[] = [
  { key: "Antrian", label: "Antrian" },
  { key: "Proses", label: "Proses" },
  { key: "Menunggu_Sparepart", label: "Menunggu Sparepart" },
  { key: "Selesai", label: "Selesai" },
  { key: "Ditolak", label: "Ditolak" },
  { key: "Riwayat", label: "Riwayat" },
];

// Full-screen wizard steps a teknisi walks through for one tiket. Stock
// picking (4A) and Request Sparepart (4B) are sub-modals layered on top of
// "kebutuhan" (and re-used from "in_progress" for a Proses ticket that
// needs more sparepart later) rather than separate steps of their own.
type Step =
  | "detail"           // step 2: Pilih HP (read-only) + foto before
  | "kebutuhan"        // step 3: Pakai Stok / Request / Tanpa Sparepart
  | "tanpa_sparepart"  // step 4C confirmation
  | "menunggu"         // step 5/6/7: waiting, or ready-to-claim ("Sparepart Tersedia")
  | "proses_estimasi"  // step 8 for the 4A/4C branch
  | "in_progress"      // ticket already Proses — ongoing work / mark Selesai
  | "selesai_view"     // step 9, read-only
  | "ditolak_view";    // read-only

function resolveInitialStep(detail: ServiceTicketDetail): Step {
  if (detail.status === "Antrian") return "detail";
  if (detail.status === "Proses") return "in_progress";
  if (detail.status === "Menunggu_Sparepart") return "menunggu";
  if (detail.status === "Selesai") return "selesai_view";
  return "ditolak_view";
}

const REQUEST_STATUS_LABEL: Record<string, string> = {
  Pending: "Menunggu Approval Kepala Cabang",
  Menunggu_Pembelian: "Menunggu Pembelian Kasir",
  Menunggu_Barang: "Menunggu Barang Datang",
  Diterima: "Sparepart Tersedia",
};

export default function ServiceListPage(): JSX.Element {
  return <Suspense fallback={null}><ServiceListPageInner /></Suspense>;
}

function ServiceListPageInner(): JSX.Element {
  const { user } = useAuth();
  const { showToast } = useToast();
  const cabangTz = useCabangTimezones();
  const isTeknisi = user?.role === "teknisi";
  // Deep-link support: the sidebar's "Data Service" group children (see
  // nav.ts) can land here with ?tab= already applied — the query param IS
  // the state, so the sidebar and this page's own segmented control can't
  // disagree about which tab is active.
  const [tab, setTab] = useUrlParam<Tab>("tab", TAB_KEYS, "Antrian");

  const { items, loading, error, reload: load } = useApiList<ServiceTicket>(
    () => (tab === "Riwayat" ? Promise.resolve([]) : Api.service.list({ status: tab, limit: 100 }).then((r) => r.data ?? [])),
    [tab], "Gagal memuat service",
  );
  const { items: riwayat, loading: riwayatLoading, error: riwayatError, reload: reloadRiwayat } = useApiList<ServiceRiwayatItem>(
    () => (tab === "Riwayat" ? Api.service.riwayat().then((r) => r.data ?? []) : Promise.resolve([])),
    [tab], "Gagal memuat riwayat service",
  );

  // ── Wizard state ────────────────────────────────────────────────────────
  const [active, setActive] = useState<ServiceTicketDetail | null>(null);
  const [step, setStep] = useState<Step>("detail");
  const [busy, setBusy] = useState(false);

  const [catatanKerusakan, setCatatanKerusakan] = useState("");
  const [estimasi, setEstimasi] = useState("");
  const [catatanProses, setCatatanProses] = useState("");
  const [afterPhotos, setAfterPhotos] = useState<UploadedImage[]>([]);
  const [ditolakConfirmOpen, setDitolakConfirmOpen] = useState(false);
  const [ditolakReason, setDitolakReason] = useState("");

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stokQuery, setStokQuery] = useState("");
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [reqNama, setReqNama] = useState("");
  const [reqJumlah, setReqJumlah] = useState("1");
  const [reqHarga, setReqHarga] = useState("");
  const [reqAlasan, setReqAlasan] = useState("");
  const [reqLink, setReqLink] = useState("");
  const [reqKeterangan, setReqKeterangan] = useState("");

  const { items: stokItems, loading: stokLoading, reload: reloadStok } = useApiList<Sparepart>(
    () => (stockModalOpen ? Api.sparepart.list({ jenis: "repair" }).then((r) => r.data ?? []) : Promise.resolve([])),
    [stockModalOpen], "Gagal memuat stok sparepart",
  );
  const visibleStok = useMemo(
    () => stokItems.filter((s) => `${s.nama} ${s.sp_id}`.toLowerCase().includes(stokQuery.toLowerCase())),
    [stokItems, stokQuery],
  );

  // Request-sparepart list isn't filterable by service_id server-side —
  // filtered client-side, same pattern the old sparepart/page.tsx already
  // used for "myOpenTickets".
  const { items: allRequests, reload: reloadRequests } = useApiList<RequestSparepart>(
    () => (active ? Api.requestSparepart.list().then((r) => r.data ?? []) : Promise.resolve([])),
    [active?.service_id], "Gagal memuat request sparepart",
  );
  const myRequests = useMemo(
    () => allRequests.filter((r) => r.service_id === active?.service_id && r.jenis === "repair"),
    [allRequests, active],
  );
  const readyRequest = myRequests.find((r) => r.status === "Diterima");
  const pendingRequests = myRequests.filter((r) => !["Diterima", "Digunakan", "Ditolak"].includes(r.status));

  const openTicket = async (serviceId: string) => {
    try {
      const detail = (await Api.service.detail(serviceId)).data;
      setActive(detail);
      setStep(resolveInitialStep(detail));
      setAfterPhotos((detail.foto_after_urls || []).map((secure_url) => ({ secure_url })));
      setCatatanKerusakan(detail.catatan_kerusakan || "");
      setEstimasi(detail.estimasi_selesai ? detail.estimasi_selesai.replace(" ", "T").slice(0, 16) : "");
      setCatatanProses(""); setDitolakReason(""); setDitolakConfirmOpen(false);
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal memuat detail tiket", "error"); }
  };

  // Deep-link from the "Sparepart Tersedia" bell notification (?open=<service_id>)
  // — teknisi has no standalone Sparepart page to fall back to anymore, so
  // clicking that notification must land directly on the ticket's wizard.
  const searchParams = useSearchParams();
  const openParam = searchParams.get("open");
  useEffect(() => {
    if (openParam) void openTicket(openParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the deep-link param itself changes, not on every openTicket identity change.
  }, [openParam]);

  const closeWizard = () => { if (!busy) setActive(null); };
  const refreshActive = async (): Promise<ServiceTicketDetail | null> => {
    if (!active) return null;
    const detail = (await Api.service.detail(active.service_id)).data;
    setActive(detail);
    return detail;
  };
  const backToList = async () => { setActive(null); await load(); };

  // ── Step 2: Pilih HP -> Pilih Kebutuhan ─────────────────────────────────
  const goKebutuhan = async () => {
    if (!active) return;
    if (catatanKerusakan === (active.catatan_kerusakan || "")) { setStep("kebutuhan"); return; }
    setBusy(true);
    try {
      await Api.service.update(active.service_id, { catatan_kerusakan: catatanKerusakan || undefined });
      setStep("kebutuhan");
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal menyimpan foto", "error"); } finally { setBusy(false); }
  };

  // ── 4A: Pakai Sparepart dari Stok ────────────────────────────────────────
  const pickFromStock = async (sp: Sparepart) => {
    if (!active) return;
    const input = window.prompt(`Jumlah ${sp.nama} yang dipakai:`, "1");
    if (input === null) return;
    const jumlah = Number(input);
    if (!jumlah || jumlah <= 0) { showToast("Jumlah harus lebih dari 0", "error"); return; }
    try {
      await Api.service.useSparepart(active.service_id, { sp_id: sp.sp_id, jumlah });
      showToast(`${sp.nama} ditambahkan`);
      await refreshActive(); await reloadStok();
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal menambahkan sparepart", "error"); }
  };
  const removeFromStock = async (spId: string) => {
    if (!active) return;
    try {
      await Api.service.removeSparepart(active.service_id, spId);
      showToast("Sparepart dibatalkan");
      await refreshActive(); await reloadStok();
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal membatalkan sparepart", "error"); }
  };
  const finishStockPicking = () => {
    if (!active?.sparepart_items?.length) { showToast("Pilih minimal satu sparepart dulu", "error"); return; }
    setStockModalOpen(false);
    setStep("proses_estimasi");
  };

  // ── 4B: Request Sparepart ───────────────────────────────────────────────
  const openRequestForm = () => {
    setReqNama(""); setReqJumlah("1"); setReqHarga(""); setReqAlasan(""); setReqLink(""); setReqKeterangan("");
    setRequestModalOpen(true);
  };
  const submitRequest = async () => {
    if (!active || !user) return;
    if (!reqNama.trim() || !reqAlasan.trim()) { showToast("Nama sparepart dan alasan wajib diisi", "error"); return; }
    if (!Number(reqJumlah) || Number(reqJumlah) <= 0) { showToast("Jumlah harus lebih dari 0", "error"); return; }
    setBusy(true);
    try {
      await Api.requestSparepart.create({
        tipe: "SPAREPART", jenis: "repair", service_id: active.service_id,
        nama_sp: reqNama.trim(), jumlah: Number(reqJumlah),
        harga_diajukan: reqHarga ? Number(reqHarga) : undefined,
        alasan: reqAlasan.trim(), product_link: reqLink.trim() || undefined,
        keterangan: reqKeterangan || undefined, cabang: user.cabang || "JYP",
      });
      showToast("Request sparepart terkirim, menunggu approval Kepala Cabang");
      setRequestModalOpen(false);
      const detail = await refreshActive();
      await reloadRequests();
      if (detail) setStep(resolveInitialStep(detail));
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal mengirim request", "error"); } finally { setBusy(false); }
  };

  // ── 4C: Tanpa Sparepart ──────────────────────────────────────────────────
  const confirmTanpaSparepart = () => setStep("proses_estimasi");

  // ── Step 8: Proses & Estimasi (4A/4C branch) ────────────────────────────
  const submitProsesEstimasi = async () => {
    if (!active) return;
    if (!estimasi) { showToast("Estimasi selesai wajib diisi", "error"); return; }
    setBusy(true);
    try {
      await Api.service.update(active.service_id, {
        status: "Proses", estimasi_selesai: estimasi,
        catatan_kerusakan: catatanProses || catatanKerusakan || undefined,
      });
      showToast("Tiket masuk Proses");
      const detail = await refreshActive();
      if (detail) setStep(resolveInitialStep(detail));
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal memulai proses", "error"); } finally { setBusy(false); }
  };

  // ── Step 7: Gunakan Sparepart (4B branch, request sudah Diterima) ───────
  const submitGunakanSparepart = async () => {
    if (!readyRequest) return;
    setBusy(true);
    try {
      await Api.requestSparepart.gunakan(readyRequest.req_id, { estimasi_selesai: estimasi || undefined });
      showToast(`${readyRequest.nama_sp} digunakan di tiket ini`);
      const detail = await refreshActive();
      await reloadRequests();
      if (detail) setStep(resolveInitialStep(detail));
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal konfirmasi pemakaian sparepart", "error"); } finally { setBusy(false); }
  };

  // ── Selesai / Ditolak (dari in_progress) ────────────────────────────────
  const submitSelesai = async () => {
    if (!active) return;
    if (!afterPhotos.length) { showToast("Foto AFTER wajib diupload", "error"); return; }
    setBusy(true);
    try {
      await Api.service.update(active.service_id, { status: "Selesai", foto_after_urls: afterPhotos.map((i) => i.secure_url) });
      showToast("Servis ditandai Selesai");
      await backToList();
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal menandai selesai", "error"); } finally { setBusy(false); }
  };
  const submitDitolak = async () => {
    if (!active) return;
    if (!ditolakReason.trim()) { showToast("Alasan wajib diisi", "error"); return; }
    setBusy(true);
    try {
      await Api.service.update(active.service_id, { status: "Ditolak", catatan_kerusakan: ditolakReason.trim() });
      showToast("Tiket ditandai Gagal");
      setDitolakConfirmOpen(false);
      await backToList();
    } catch (e) { showToast(e instanceof Error ? e.message : "Gagal update status", "error"); } finally { setBusy(false); }
  };

  if (!isTeknisi) {
    // Nav-gated to teknisi only (landingPageByRole.teknisi = "service-list")
    // — this is a defensive fallback, not a maintained second UI.
    return (
      <div className="jp-page">
        <h1 className="jp-page-title">Data Service</h1>
        {loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={load} /> : (
          <div className="table-wrap overflow-x-auto rounded-jp-md">
            <table className="w-full text-xs">
              <thead className="tbl-head border-b"><tr>{["No. Service", "Unit", "Status", "Teknisi"].map((h) => <th key={h} className="px-5 py-3.5 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.service_id} className="tbl-row">
                    <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{s.service_id}</td>
                    <td className="px-5 py-4">{s.unit_label}</td>
                    <td className="px-5 py-4"><ServiceStatusBadge status={s.status as ServiceStatus} /></td>
                    <td className="px-5 py-4">{s.teknisi || NOT_SET}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="jp-page">
      {!active ? (
        <>
          <div>
            <h1 className="jp-page-title">Data Service</h1>
            <p className="text-sm text-jp-muted dark:text-jp-muted-dark">Workspace teknisi untuk memproses tiket</p>
          </div>
          {/* Desktop relies on the sidebar's Data Service children (identical
              tabs, see nav.ts) as the single navigation for this switch — this
              row would be a pure duplicate there. Mobile keeps it: the sidebar
              isn't visible without opening the drawer, so this is the only way
              to switch tabs. */}
          <div className="segmented-control md:hidden">
            {TABS.map((t) => <button type="button" key={t.key} className={`filter-tab ${tab === t.key ? "filter-tab-active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
          </div>

          {tab === "Riwayat" ? (
            riwayatLoading ? <LoadingSkeleton numberOfRows={5} /> : riwayatError ? <ErrorState message={riwayatError} onRetry={reloadRiwayat} /> : (
              <div className="table-wrap overflow-x-auto rounded-jp-md">
                <table className="w-full text-xs">
                  <thead className="tbl-head border-b"><tr>{["No. Service", "HP/IMEI", "Sparepart", "Harga Modal", "Selesai", "Status"].map((h) => <th key={h} className="px-5 py-3.5 text-left font-medium">{h}</th>)}</tr></thead>
                  <tbody>
                    {riwayat.length ? riwayat.map((r) => (
                      <tr key={r.service_id} className="tbl-row">
                        <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{r.service_id}</td>
                        <td className="px-5 py-4"><p className="font-medium">{r.unit_label}</p><p className="font-mono text-[10px] text-jp-muted dark:text-jp-muted-dark">{r.imei || NOT_SET}</p></td>
                        <td className="px-5 py-4">{r.sparepart_items.length ? r.sparepart_items.map((it) => <p key={it.sp_id}>{it.nama} x{it.jumlah}</p>) : <span className="text-jp-muted dark:text-jp-muted-dark">Tanpa sparepart</span>}</td>
                        <td className="px-5 py-4">{r.harga_modal_total > 0 ? formatRupiah(r.harga_modal_total) : "-"}</td>
                        <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{r.selesai_at ? formatDateTimeShort(r.selesai_at) : NOT_SET}</td>
                        <td className="px-5 py-4"><span className="badge badge-selesai">Selesai</span></td>
                      </tr>
                    )) : <tr><td colSpan={6}><EmptyState message="Belum ada servis yang selesai" iconName="wrenchSvg" /></td></tr>}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={load} /> : (
              <div className="table-wrap overflow-x-auto rounded-jp-md">
                <table className="w-full text-xs">
                  <thead className="tbl-head border-b"><tr>{["No. Service", "HP/IMEI", "Keluhan", "Masuk", "Aksi"].map((h) => <th key={h} className={`px-5 py-3.5 text-left font-medium ${h === "Aksi" ? "tbl-action-col" : ""}`}>{h}</th>)}</tr></thead>
                  <tbody>
                    {items.length ? items.map((s) => (
                      <tr key={s.service_id} className="tbl-row">
                        <td className="px-5 py-4 font-mono text-jp-muted dark:text-jp-muted-dark">{s.service_id}</td>
                        <td className="px-5 py-4"><p className="font-medium">{s.unit_label}</p><p className="font-mono text-[10px] text-jp-muted dark:text-jp-muted-dark">{s.imei || NOT_SET}</p></td>
                        <td className="px-5 py-4">{s.keluhan}</td>
                        <td className="px-5 py-4 text-jp-muted dark:text-jp-muted-dark">{formatDateTimeShort(s.created_at, resolveCabangTimezone(cabangTz, s.cabang))}</td>
                        <td className="tbl-action-col px-5 py-4">
                          <button type="button" className={tab === "Antrian" ? "btn-primary" : "btn-ghost"} onClick={() => void openTicket(s.service_id)}>
                            {tab === "Antrian" ? "Proses" : tab === "Selesai" || tab === "Ditolak" ? "Lihat" : "Lanjutkan"}
                          </button>
                        </td>
                      </tr>
                    )) : <tr><td colSpan={5}><EmptyState message="Tidak ada tiket service" iconName="wrenchSvg" /></td></tr>}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      ) : (
        <div className="space-y-5">
          <button type="button" className="text-xs font-medium text-jp-muted hover:text-jp-text dark:text-jp-muted-dark dark:hover:text-jp-text-dark" onClick={closeWizard}>&larr; Kembali ke Antrian</button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{active.service_id}</h2>
              <ServiceStatusBadge status={active.status} />
            </div>
          </div>

          {/* ── Step: Pilih HP (detail read-only) ── */}
          {step === "detail" && (
            <div className="section-panel space-y-4">
              {active.unit_foto_url && (
                <img src={active.unit_foto_url} alt={active.unit_label} className="h-48 w-full rounded-jp-sm bg-jp-surface-subtle object-contain dark:bg-jp-surface-subtle-dark" />
              )}
              <p className="text-sm font-semibold text-jp-text dark:text-jp-text-dark">{active.unit_label}</p>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div><p className="text-jp-muted dark:text-jp-muted-dark">Warna</p><p className="font-medium">{active.warna || NOT_SET}</p></div>
                <div><p className="text-jp-muted dark:text-jp-muted-dark">Kondisi</p><p className="font-medium">{active.kondisi || NOT_SET}</p></div>
                <div><p className="text-jp-muted dark:text-jp-muted-dark">Kelengkapan</p><p className="font-medium">{active.kelengkapan || NOT_SET}</p></div>
                <div><p className="text-jp-muted dark:text-jp-muted-dark">Masuk</p><p className="font-medium">{formatDateTimeShort(active.created_at, resolveCabangTimezone(cabangTz, active.cabang))}</p></div>
              </div>
              <div className="grid grid-cols-1 gap-3 rounded-jp-sm bg-jp-surface-subtle p-3 dark:bg-jp-surface-subtle-dark/60 sm:grid-cols-2">
                <div><p className="text-xs text-jp-muted dark:text-jp-muted-dark">Keluhan</p><p className="text-sm">{active.keluhan}</p></div>
                <div><p className="text-xs text-jp-muted dark:text-jp-muted-dark">IMEI</p><p className="font-mono text-sm">{active.imei || NOT_SET}</p></div>
              </div>
              <LabelledTextarea label="Catatan Kerusakan" rows={2} value={catatanKerusakan} onChange={(e) => setCatatanKerusakan(e.target.value)} />
              <button type="button" disabled={busy} className="btn-primary w-full" onClick={() => void goKebutuhan()}>{busy ? "Menyimpan..." : "Lanjut Proses"}</button>
            </div>
          )}

          {/* ── Step: Pilih Kebutuhan ── */}
          {step === "kebutuhan" && (
            <div className="section-panel space-y-4">
              <p className="text-sm font-semibold text-jp-text dark:text-jp-text-dark">Apa kebutuhan untuk service ini?</p>
              <p className="text-xs text-jp-muted dark:text-jp-muted-dark">Pilih salah satu opsi di bawah</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button type="button" className="panel space-y-1 rounded-jp-md p-4 text-left hover:border-jp-teal-muted" onClick={() => setStockModalOpen(true)}>
                  <p className="font-semibold">Pakai Sparepart dari Stok</p>
                  <p className="text-xs text-jp-muted dark:text-jp-muted-dark">Gunakan sparepart yang tersedia di cabang.</p>
                </button>
                <button type="button" className="panel space-y-1 rounded-jp-md p-4 text-left hover:border-jp-teal-muted" onClick={openRequestForm}>
                  <p className="font-semibold">Request Sparepart</p>
                  <p className="text-xs text-jp-muted dark:text-jp-muted-dark">Minta sparepart baru karena tidak tersedia di stok.</p>
                </button>
                <button type="button" className="panel space-y-1 rounded-jp-md p-4 text-left hover:border-jp-teal-muted" onClick={() => setStep("tanpa_sparepart")}>
                  <p className="font-semibold">Tidak Menggunakan Sparepart</p>
                  <p className="text-xs text-jp-muted dark:text-jp-muted-dark">Perbaikan tanpa sparepart (software, setting, dll).</p>
                </button>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setStep("detail")}>Kembali</button>
            </div>
          )}

          {/* ── Step: Tanpa Sparepart ── */}
          {step === "tanpa_sparepart" && (
            <div className="section-panel flex flex-col items-center gap-4 py-10 text-center">
              <div className="icon-container h-14 w-14 rounded-full bg-jp-teal-soft text-jp-teal dark:bg-jp-teal-soft-dark dark:text-jp-teal-dark">✓</div>
              <p className="font-semibold">Tidak menggunakan sparepart</p>
              <p className="max-w-xs text-sm text-jp-muted dark:text-jp-muted-dark">Service akan dilanjutkan tanpa menggunakan sparepart.</p>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={() => setStep("kebutuhan")}>Kembali</button>
                <button type="button" className="btn-primary" onClick={confirmTanpaSparepart}>Lanjut Proses</button>
              </div>
            </div>
          )}

          {/* ── Step: Proses & Estimasi (4A/4C) ── */}
          {step === "proses_estimasi" && (
            <div className="section-panel space-y-4">
              <p className="text-sm font-semibold text-jp-text dark:text-jp-text-dark">Tentukan estimasi selesai</p>
              <LabelledInput label="Estimasi Selesai" type="datetime-local" required value={estimasi} onChange={(e) => setEstimasi(e.target.value)} />
              <LabelledTextarea label="Catatan (Opsional)" rows={2} value={catatanProses} onChange={(e) => setCatatanProses(e.target.value)} />
              <p className="rounded-jp-sm bg-jp-info-soft p-3 text-[11px] text-jp-text-soft dark:bg-jp-surface-subtle-dark dark:text-jp-info-dark">Silakan kerjakan service sesuai estimasi waktu di atas. Status akan berubah otomatis jika selesai.</p>
              <button type="button" disabled={busy} className="btn-primary w-full" onClick={() => void submitProsesEstimasi()}>{busy ? "Menyimpan..." : "Mulai Proses"}</button>
            </div>
          )}

          {/* ── Step: Menunggu Sparepart / Sparepart Tersedia (4B) ── */}
          {step === "menunggu" && (
            <div className="section-panel space-y-4">
              {readyRequest ? (
                <>
                  <span className="badge badge-tersedia">Sparepart Tersedia</span>
                  <p className="text-sm">Sparepart <span className="font-semibold">{readyRequest.nama_sp}</span> x{readyRequest.jumlah} sudah tersedia di cabang. Silakan gunakan sparepart untuk melanjutkan service.</p>
                  <div className="rounded-jp-sm bg-jp-surface-subtle p-3 text-xs dark:bg-jp-surface-subtle-dark/60">
                    <div className="flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Sparepart</span><span className="font-medium">{readyRequest.nama_sp}</span></div>
                    <div className="flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Jumlah</span><span className="font-mono">{readyRequest.jumlah} pcs</span></div>
                    <div className="flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Harga Modal</span><span className="font-mono">{readyRequest.harga_beli_aktual ? formatRupiah(readyRequest.harga_beli_aktual) : NOT_SET}</span></div>
                  </div>
                  <LabelledInput label="Estimasi Selesai" type="datetime-local" helper="Wajib diisi kalau ini sparepart terakhir yang ditunggu tiket ini." value={estimasi} onChange={(e) => setEstimasi(e.target.value)} />
                  <button type="button" disabled={busy} className="btn-success w-full" onClick={() => void submitGunakanSparepart()}>{busy ? "Menyimpan..." : "Gunakan & Lanjut Proses"}</button>
                </>
              ) : (
                <>
                  <span className="badge badge-booking">Menunggu Sparepart</span>
                  <p className="text-sm text-jp-muted dark:text-jp-muted-dark">Menunggu sparepart datang. Service akan dilanjutkan setelah sparepart tersedia.</p>
                  {pendingRequests.map((r) => (
                    <div key={r.req_id} className="rounded-jp-sm bg-jp-surface-subtle p-3 text-xs dark:bg-jp-surface-subtle-dark/60">
                      <div className="flex justify-between"><span className="font-medium">{r.nama_sp}</span><span className="font-mono text-jp-muted dark:text-jp-muted-dark">{r.req_id}</span></div>
                      <p className="mt-1 text-jp-muted dark:text-jp-muted-dark">Jumlah: {r.jumlah} pcs</p>
                      <p className="mt-1 text-jp-muted dark:text-jp-muted-dark">Status: <span className="font-medium text-jp-text dark:text-jp-text-dark">{REQUEST_STATUS_LABEL[r.status] ?? r.status}</span></p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Step: Sedang Dikerjakan (Proses) ── */}
          {step === "in_progress" && (
            <div className="section-panel space-y-4">
              <p className="text-sm font-semibold text-jp-text dark:text-jp-text-dark">{active.unit_label}</p>
              <p className="text-sm text-jp-muted dark:text-jp-muted-dark">{active.keluhan}</p>
              {active.estimasi_selesai && <p className="text-xs text-jp-muted dark:text-jp-muted-dark">Estimasi selesai: <span className="font-medium text-jp-text dark:text-jp-text-dark">{active.estimasi_selesai}</span></p>}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-jp-text dark:text-jp-text-dark">Sparepart Digunakan</p>
                {active.sparepart_items?.length ? (
                  <ul className="space-y-1">
                    {active.sparepart_items.map((it) => (
                      <li key={it.sp_id} className="flex items-center justify-between rounded-jp-sm bg-jp-surface-subtle px-2.5 py-1.5 text-[11px] dark:bg-jp-surface-subtle-dark/60">
                        <span>{it.nama} x{it.jumlah} <span className="text-jp-muted dark:text-jp-muted-dark">({formatRupiah(it.harga_modal * it.jumlah)})</span></span>
                        <button type="button" className="text-jp-danger hover:underline dark:text-jp-danger-dark" onClick={() => void removeFromStock(it.sp_id)}>Batal</button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-jp-muted dark:text-jp-muted-dark">Belum ada sparepart digunakan.</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setStockModalOpen(true)}>+ Pakai dari Stok</button>
                  <button type="button" className="btn-ghost" onClick={openRequestForm}>+ Request Sparepart</button>
                </div>
              </div>
              <div className="border-t border-jp-border pt-4 dark:border-jp-border-dark">
                <p className="mb-2 text-xs font-semibold text-jp-text dark:text-jp-text-dark">Foto kondisi HP setelah dikerjakan (wajib sebelum Selesai)</p>
                <ImageUploader id="svc-after" maxFiles={5} initialImages={afterPhotos} folder="jayaphone/service/after" onChange={setAfterPhotos} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-error" onClick={() => setDitolakConfirmOpen(true)}>Gagal</button>
                  {/* Same requirement submitSelesai already guards on (afterPhotos.length) — this only
                      surfaces it before the click instead of after, via a toast, so a teknisi never
                      submits knowing it will fail. */}
                  <button type="button" disabled={busy || !afterPhotos.length} className="btn-success flex-1" onClick={() => void submitSelesai()}>{busy ? "Menyimpan..." : "Tandai Selesai"}</button>
                </div>
                {!afterPhotos.length && <p className="text-[11px] text-jp-muted dark:text-jp-muted-dark">Upload minimal 1 foto AFTER di atas untuk mengaktifkan tombol Tandai Selesai.</p>}
              </div>
            </div>
          )}

          {/* ── Step: Selesai (read-only) ── */}
          {step === "selesai_view" && (
            <div className="section-panel space-y-3">
              <p className="text-sm font-semibold text-jp-text dark:text-jp-text-dark">{active.unit_label}</p>
              <p className="text-xs font-mono text-jp-muted dark:text-jp-muted-dark">{active.imei}</p>
              <div className="rounded-jp-sm bg-jp-surface-subtle p-3 text-xs dark:bg-jp-surface-subtle-dark/60">
                <p className="mb-1 font-semibold text-jp-text dark:text-jp-text-dark">Detail Service</p>
                {active.sparepart_items?.length ? active.sparepart_items.map((it) => (
                  <div key={it.sp_id} className="flex justify-between"><span>{it.nama}</span><span>{it.jumlah} pcs · {formatRupiah(it.harga_modal * it.jumlah)}</span></div>
                )) : <p className="text-jp-muted dark:text-jp-muted-dark">Tanpa sparepart</p>}
                <div className="mt-2 flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Estimasi</span><span>{active.estimasi_selesai || NOT_SET}</span></div>
                <div className="flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Selesai</span><span>{active.updated_at ? formatDateTimeShort(active.updated_at, resolveCabangTimezone(cabangTz, active.cabang)) : NOT_SET}</span></div>
                <div className="flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Teknisi</span><span>{active.teknisi || NOT_SET}</span></div>
              </div>
            </div>
          )}

          {/* ── Step: Ditolak (read-only) ── */}
          {step === "ditolak_view" && (
            <div className="section-panel space-y-2">
              <p className="text-sm font-semibold text-jp-text dark:text-jp-text-dark">{active.unit_label}</p>
              <p className="text-xs text-jp-muted dark:text-jp-muted-dark">{active.catatan_kerusakan || "Tidak ada catatan"}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Pakai Sparepart dari Stok (4A, juga dipakai dari in_progress) ── */}
      <Modal isOpen={stockModalOpen} onClose={() => setStockModalOpen(false)} title="Pilih Sparepart dari Stok" maxWidthClassName="max-w-2xl">
        <div className="space-y-3">
          <input className="field-control" placeholder="Cari sparepart..." value={stokQuery} onChange={(e) => setStokQuery(e.target.value)} />
          {stokLoading ? <LoadingSkeleton numberOfRows={3} /> : (
            <div className="table-wrap overflow-x-auto rounded-jp-md">
              <table className="w-full text-xs">
                <thead className="tbl-head border-b"><tr>{["Nama Sparepart", "Stok Tersedia", "Harga Modal", "Aksi"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {visibleStok.length ? visibleStok.map((sp) => (
                    <tr key={sp.sp_id} className="tbl-row">
                      <td className="px-4 py-2.5">{sp.nama}</td>
                      <td className={`px-4 py-2.5 font-mono ${sp.stok <= 0 ? "text-jp-danger dark:text-jp-danger-dark" : ""}`}>{sp.stok} {sp.satuan}</td>
                      <td className="px-4 py-2.5">{formatRupiah(sp.harga_beli)}</td>
                      <td className="px-4 py-2.5"><button type="button" className="btn-ghost" disabled={sp.stok <= 0} onClick={() => void pickFromStock(sp)}>Pilih</button></td>
                    </tr>
                  )) : <tr><td colSpan={4}><EmptyState message="Tidak ada sparepart yang cocok" iconName="wrenchSvg" /></td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {step === "kebutuhan" && <button type="button" className="btn-primary w-full" onClick={finishStockPicking}>Lanjut ke Estimasi</button>}
        </div>
      </Modal>

      {/* ── Modal: Request Sparepart (4B, juga dipakai dari in_progress) ── */}
      <Modal isOpen={requestModalOpen} onClose={() => setRequestModalOpen(false)} title="Request Sparepart">
        <div className="space-y-3">
          <LabelledInput label="Sparepart yang dibutuhkan" required value={reqNama} onChange={(e) => setReqNama(e.target.value)} />
          <LabelledInput label="Jumlah" type="number" min={1} required value={reqJumlah} onChange={(e) => setReqJumlah(e.target.value)} />
          <LabelledInput label="Harga yang Diajukan (per satuan, opsional)" type="number" min={1} helper="Boleh dikosongkan — Kepala Cabang/Kasir bisa isi belakangan." value={reqHarga} onChange={(e) => setReqHarga(e.target.value)} />
          <LabelledTextarea label="Alasan" required rows={2} helper="Jelaskan kenapa sparepart ini dibutuhkan — dipakai Kepala Cabang untuk review." value={reqAlasan} onChange={(e) => setReqAlasan(e.target.value)} />
          <LabelledInput label="Link Produk (opsional)" type="url" placeholder="https://..." helper="Isi kalau sudah ada referensi barang yang mau dibeli." value={reqLink} onChange={(e) => setReqLink(e.target.value)} />
          <LabelledTextarea label="Keterangan (Opsional)" rows={2} value={reqKeterangan} onChange={(e) => setReqKeterangan(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setRequestModalOpen(false)}>Batal</button>
            <button type="button" disabled={busy} className="btn-primary flex-1" onClick={() => void submitRequest()}>{busy ? "Mengirim..." : "Kirim Request"}</button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Konfirmasi Gagal ── */}
      <Modal isOpen={ditolakConfirmOpen} onClose={() => setDitolakConfirmOpen(false)} title="Tandai Gagal">
        <div className="space-y-3">
          <LabelledTextarea label="Alasan" required rows={3} value={ditolakReason} onChange={(e) => setDitolakReason(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setDitolakConfirmOpen(false)}>Batal</button>
            <button type="button" disabled={busy} className="btn-error flex-1" onClick={() => void submitDitolak()}>{busy ? "Menyimpan..." : "Tandai Gagal"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
