"use client";

import { useMemo, useRef, useState } from "react";
import { Api } from "@/lib/api";
import type { Karyawan, KaryawanStats } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { LabelledInput, LabelledSelect } from "@/components/ui/InputField";
import { KaryawanStatsChart } from "./_components/KaryawanStatsChart";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useApiList } from "@/hooks/useApiList";

type StatsPreset = "7d" | "30d" | "90d" | "1y" | "custom";
interface StatsFilter { preset: StatsPreset; start: string | null; end: string | null; }

const STATS_PRESET_TABS: Array<{ key: StatsPreset; label: string }> = [
  { key: "7d", label: "7 Hari" },
  { key: "30d", label: "30 Hari" },
  { key: "90d", label: "3 Bulan" },
  { key: "1y", label: "1 Tahun" },
];
const STATS_PRESET_DAYS: Record<StatsPreset, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365, custom: 30 };
const DEFAULT_STATS_FILTER: StatsFilter = { preset: "30d", start: null, end: null };

export default function KaryawanPage(): JSX.Element {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isOwner = user?.role === "owner";
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Karyawan | null>(null);
  const [pendingDeactivation, setPendingDeactivation] = useState<Karyawan | null>(null);
  const [statsEmployee, setStatsEmployee] = useState<Karyawan | null>(null);
  const [stats, setStats] = useState<KaryawanStats | null>(null);
  const [statsFilter, setStatsFilter] = useState<StatsFilter>(DEFAULT_STATS_FILTER);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customDateError, setCustomDateError] = useState("");
  const [password, setPassword] = useState("");
  const [isResetPending, setIsResetPending] = useState(false);
  const [isDeactivatePending, setIsDeactivatePending] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const statsRequestRef = useRef(0);
  const [form, setForm] = useState({ nama: "", username: "", jabatan: "Kasir", cabang: user?.cabang || "", gaji: "", password: "" });

  const { items, loading, error, reload: load } = useApiList<Karyawan>(
    () => Api.karyawan.list(isOwner ? {} : { cabang: user?.cabang }).then((r) => r.data || []),
    [isOwner, user],
    "Gagal memuat karyawan",
  );

  const roleOptions = useMemo(() => Array.from(new Set(items.map((employee) => employee.jabatan))).sort(), [items]);
  const branchOptions = useMemo(() => Array.from(new Set(items.map((employee) => employee.cabang))).sort(), [items]);
  const filteredEmployees = useMemo(() => {
    const query = searchInputValue.trim().toLowerCase();
    return items.filter((employee) => {
      const matchesQuery = !query || `${employee.nama} ${employee.username}`.toLowerCase().includes(query);
      return matchesQuery
        && (!roleFilter || employee.jabatan === roleFilter)
        && (!statusFilter || String(employee.aktif) === statusFilter)
        && (!isOwner || !branchFilter || employee.cabang === branchFilter);
    });
  }, [branchFilter, isOwner, items, roleFilter, searchInputValue, statusFilter]);
  const activeCount = items.filter((employee) => employee.aktif).length;
  const inactiveCount = items.length - activeCount;

  const create = async (): Promise<void> => {
    if (!form.nama || !form.username || !form.password) { showToast("Nama, username, dan password wajib diisi", "error"); return; }
    try {
      await Api.karyawan.create({ ...form, gaji: Number(form.gaji) || 0 });
      showToast("Karyawan berhasil ditambahkan");
      setOpen(false);
      await load();
    } catch (createError) {
      showToast(createError instanceof Error ? createError.message : "Tambah karyawan gagal", "error");
    }
  };

  const fetchStats = async (karyawanId: string, filter: StatsFilter): Promise<void> => {
    const requestId = ++statsRequestRef.current;
    setStatsLoading(true);
    try {
      const params = filter.preset === "custom" && filter.start && filter.end
        ? { date_from: filter.start, date_to: filter.end }
        : { hari: STATS_PRESET_DAYS[filter.preset] };
      const response = await Api.karyawan.stats(karyawanId, params);
      if (requestId === statsRequestRef.current) setStats(response.data);
    } catch (statsError) {
      if (requestId === statsRequestRef.current) showToast(statsError instanceof Error ? statsError.message : "Gagal memuat statistik", "error");
    } finally {
      if (requestId === statsRequestRef.current) setStatsLoading(false);
    }
  };

  const openStats = (employee: Karyawan): void => {
    setStatsEmployee(employee);
    setStats(null);
    setStatsFilter(DEFAULT_STATS_FILTER);
    setShowCustomDate(false);
    setCustomDateError("");
    void fetchStats(employee.id, DEFAULT_STATS_FILTER);
  };
  const closeStats = (): void => {
    statsRequestRef.current += 1;
    setStatsEmployee(null);
    setStats(null);
    setShowCustomDate(false);
    setCustomDateError("");
  };
  const selectPreset = (preset: StatsPreset): void => {
    if (!statsEmployee) return;
    const nextFilter: StatsFilter = { preset, start: null, end: null };
    setStatsFilter(nextFilter);
    setShowCustomDate(false);
    setCustomDateError("");
    void fetchStats(statsEmployee.id, nextFilter);
  };
  const applyCustomDate = (): void => {
    if (!statsEmployee) return;
    if (!customFrom || !customTo) { setCustomDateError("Lengkapi tanggal dari dan sampai"); return; }
    if (customTo < customFrom) { setCustomDateError("Tanggal sampai tidak boleh lebih awal dari tanggal dari"); return; }
    const nextFilter: StatsFilter = { preset: "custom", start: customFrom, end: customTo };
    setStatsFilter(nextFilter);
    setShowCustomDate(false);
    setCustomDateError("");
    void fetchStats(statsEmployee.id, nextFilter);
  };

  const reset = async (): Promise<void> => {
    if (!selected || isResetPending) return;
    if (password.length < 6) { showToast("Password minimal 6 karakter", "error"); return; }
    setIsResetPending(true);
    try {
      await Api.karyawan.resetPassword(selected.id, { password });
      showToast("Password berhasil direset");
      setSelected(null);
    } catch (resetError) {
      showToast(resetError instanceof Error ? resetError.message : "Reset password gagal", "error");
    } finally {
      setIsResetPending(false);
    }
  };
  const deactivate = async (): Promise<void> => {
    if (!pendingDeactivation || isDeactivatePending) return;
    setIsDeactivatePending(true);
    try {
      await Api.cabang.pecatKaryawan(pendingDeactivation.id);
      showToast("Karyawan dinonaktifkan");
      setPendingDeactivation(null);
      await load();
    } catch (deactivateError) {
      showToast(deactivateError instanceof Error ? deactivateError.message : "Gagal menonaktifkan", "error");
    } finally {
      setIsDeactivatePending(false);
    }
  };

  const isKasir = statsEmployee?.jabatan === "Kasir";
  const trend = stats ? (isKasir ? stats.kasir.trend_harian : stats.teknisi.trend_harian) : [];
  const canShowStats = (employee: Karyawan): boolean => employee.jabatan === "Kasir" || employee.jabatan === "Teknisi";
  const canManageEmployee = (employee: Karyawan): boolean => Boolean(isOwner && employee.aktif && employee.username !== user?.username);
  const resetFilters = (): void => { setSearchInputValue(""); setRoleFilter(""); setStatusFilter(""); setBranchFilter(""); };

  return (
    <div className="jp-page space-y-6">
      <header className="jp-page-header">
        <div>
          <h1 className="jp-page-title">Karyawan</h1>
          <p className="mt-1 text-sm text-jp-muted dark:text-jp-muted-dark">Direktori pemantauan akun dan peran karyawan.</p>
        </div>
        {user?.role === "kepala_cabang" && <button className="btn-primary" type="button" onClick={() => setOpen(true)}>+ Tambah Karyawan</button>}
      </header>

      <section aria-label="Ringkasan karyawan" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="metric-card p-4"><p className="label">Total</p><p className="mt-1 text-xl font-bold">{items.length}</p></div>
        <div className="metric-card p-4"><p className="label">Aktif</p><p className="mt-1 text-xl font-bold text-jp-success dark:text-jp-success-dark">{activeCount}</p></div>
        <div className="metric-card p-4"><p className="label">Nonaktif</p><p className="mt-1 text-xl font-bold text-jp-muted dark:text-jp-muted-dark">{inactiveCount}</p></div>
        {roleOptions.map((role) => <div key={role} className="metric-card p-4"><p className="label truncate">{role}</p><p className="mt-1 text-xl font-bold">{items.filter((employee) => employee.jabatan === role).length}</p></div>)}
      </section>

      <section className="jp-toolbar">
        <input value={searchInputValue} onChange={(event) => setSearchInputValue(event.target.value)} placeholder="Cari nama atau username..." className="field-control min-w-[220px] flex-1" />
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="field-control w-full sm:w-auto"><option value="">Semua jabatan</option>{roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}</select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="field-control w-full sm:w-auto"><option value="">Semua status</option><option value="true">Aktif</option><option value="false">Nonaktif</option></select>
        {isOwner ? <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="field-control w-full sm:w-auto"><option value="">Semua cabang</option>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select> : null}
        {(searchInputValue || roleFilter || statusFilter || branchFilter) ? <button className="btn-ghost w-full sm:w-auto" type="button" onClick={resetFilters}>Reset</button> : null}
      </section>

      {loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={load} /> : filteredEmployees.length === 0 ? <EmptyState message={items.length ? "Belum ada karyawan sesuai filter" : "Belum ada karyawan"} iconName="userSvg" /> : (
        <>
          <section className="list-card hidden overflow-hidden md:block">
            <table className="w-full text-[13px]">
              <thead className="border-b border-jp-border text-left text-[11px] font-medium text-jp-muted dark:border-jp-border-dark dark:text-jp-muted-dark"><tr><th className="px-6 py-3.5">Karyawan</th><th className="px-5 py-3.5">Jabatan</th><th className="px-5 py-3.5">Cabang</th>{isOwner ? <th className="px-5 py-3.5 text-right">Gaji</th> : null}<th className="px-5 py-3.5">Status</th><th className="tbl-action-col px-6 py-3.5 text-right">Aksi</th></tr></thead>
              <tbody>{filteredEmployees.map((employee) => <tr key={employee.id} className="h-14 border-b border-jp-border/80 last:border-0 hover:bg-jp-surface-subtle/70 dark:border-jp-border-dark dark:hover:bg-jp-surface-subtle-dark/60"><td className="px-6"><p className="font-medium text-jp-text dark:text-jp-text-dark">{employee.nama}</p><p className="mt-0.5 text-[11px] text-jp-muted dark:text-jp-muted-dark">@{employee.username}</p></td><td className="px-5"><span className="badge">{employee.jabatan}</span></td><td className="px-5 text-jp-muted dark:text-jp-muted-dark">{employee.cabang}</td>{isOwner ? <td className="px-5 text-right font-mono text-[12px]">Rp {(employee.gaji || 0).toLocaleString("id-ID")}</td> : null}<td className="px-5"><span className={employee.aktif ? "text-jp-success dark:text-jp-success-dark" : "text-jp-muted dark:text-jp-muted-dark"}>{employee.aktif ? "Aktif" : "Nonaktif"}</span></td><td className="tbl-action-col px-6"><div className="flex items-center justify-end gap-1">{canShowStats(employee) ? <button className="btn-ghost" type="button" onClick={() => openStats(employee)}>Lihat statistik</button> : null}{canManageEmployee(employee) ? <ActionMenu ariaLabel={`Menu aksi ${employee.nama}`} items={[{ label: "Reset password", onClick: () => { setSelected(employee); setPassword(""); } }, { label: "Nonaktifkan akun", onClick: () => setPendingDeactivation(employee), destructive: true }]} /> : null}</div></td></tr>)}</tbody>
            </table>
          </section>
          <section className="grid gap-3 md:hidden">{filteredEmployees.map((employee) => <article key={employee.id} className="list-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium text-jp-text dark:text-jp-text-dark">{employee.nama}</p><p className="mt-0.5 truncate text-xs text-jp-muted dark:text-jp-muted-dark">@{employee.username}</p></div><span className={employee.aktif ? "text-xs font-medium text-jp-success dark:text-jp-success-dark" : "text-xs font-medium text-jp-muted dark:text-jp-muted-dark"}>{employee.aktif ? "Aktif" : "Nonaktif"}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><p><span className="block text-jp-muted dark:text-jp-muted-dark">Jabatan</span><span className="badge mt-1 inline-block">{employee.jabatan}</span></p><p><span className="block text-jp-muted dark:text-jp-muted-dark">Cabang</span><span className="mt-1 block">{employee.cabang}</span></p>{isOwner ? <p><span className="block text-jp-muted dark:text-jp-muted-dark">Gaji</span><span className="mt-1 block font-mono">Rp {(employee.gaji || 0).toLocaleString("id-ID")}</span></p> : null}</div><div className="mt-4 flex items-center justify-between gap-2">{canShowStats(employee) ? <button className="btn-ghost" type="button" onClick={() => openStats(employee)}>Lihat statistik</button> : <span />}{canManageEmployee(employee) ? <ActionMenu ariaLabel={`Menu aksi ${employee.nama}`} items={[{ label: "Reset password", onClick: () => { setSelected(employee); setPassword(""); } }, { label: "Nonaktifkan akun", onClick: () => setPendingDeactivation(employee), destructive: true }]} /> : null}</div></article>)}</section>
        </>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Tambah Karyawan">
        <div className="space-y-3"><LabelledInput label="Nama Lengkap" required value={form.nama} onChange={(event) => setForm({ ...form, nama: event.target.value })} /><div className="grid gap-3 sm:grid-cols-2"><LabelledInput label="Username" required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /><LabelledSelect label="Jabatan" value={form.jabatan} onChange={(event) => setForm({ ...form, jabatan: event.target.value })}><option>Kasir</option><option>Teknisi</option><option>Kurir</option><option>Influencer</option></LabelledSelect></div>{isOwner ? <LabelledInput label="Cabang" required value={form.cabang} onChange={(event) => setForm({ ...form, cabang: event.target.value })} /> : null}{isOwner ? <LabelledInput label="Gaji" type="number" value={form.gaji} onChange={(event) => setForm({ ...form, gaji: event.target.value })} /> : null}<LabelledInput label="Password" type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button className="btn-primary w-full" type="button" onClick={() => void create()}>Simpan Karyawan</button></div>
      </Modal>

      <Modal isOpen={selected !== null} onClose={() => !isResetPending && setSelected(null)} title="Reset Password">
        <div className="space-y-3"><p className="text-sm">{selected?.nama} · @{selected?.username}</p><LabelledInput label="Password Baru" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /><button className="btn-primary w-full" type="button" disabled={isResetPending} onClick={() => void reset()}>{isResetPending ? "Mereset..." : "Reset Password"}</button></div>
      </Modal>

      <Modal isOpen={pendingDeactivation !== null} onClose={() => !isDeactivatePending && setPendingDeactivation(null)} title="Nonaktifkan akun">
        <div className="space-y-4"><p className="text-sm text-jp-muted dark:text-jp-muted-dark">Nonaktifkan akun {pendingDeactivation?.nama}? Akun tidak dapat lagi digunakan untuk masuk.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button className="btn-ghost" type="button" disabled={isDeactivatePending} onClick={() => setPendingDeactivation(null)}>Batal</button><button className="btn-secondary" type="button" disabled={isDeactivatePending} onClick={() => void deactivate()}>{isDeactivatePending ? "Menonaktifkan..." : "Nonaktifkan akun"}</button></div></div>
      </Modal>

      <Modal isOpen={statsEmployee !== null} onClose={closeStats} title={statsEmployee ? "Statistik " + statsEmployee.nama : "Statistik Karyawan"} maxWidthClassName="max-w-2xl">
        <div className="space-y-5"><div className="flex flex-wrap items-center gap-2"><div className="segmented-control">{STATS_PRESET_TABS.map((tab) => <button key={tab.key} type="button" onClick={() => selectPreset(tab.key)} className={statsFilter.preset === tab.key ? "filter-tab filter-tab-active" : "filter-tab"}>{tab.label}</button>)}</div><button type="button" onClick={() => { setShowCustomDate((value) => !value); setCustomDateError(""); }} className={`btn-ghost px-4 py-1.5 text-xs ${statsFilter.preset === "custom" ? "text-jp-teal dark:text-jp-teal" : ""}`}>{statsFilter.preset === "custom" && statsFilter.start && statsFilter.end ? `${statsFilter.start} → ${statsFilter.end}` : "Custom"}</button></div>{showCustomDate ? <div className="rounded-jp-sm bg-jp-surface-subtle p-4 dark:bg-jp-surface-subtle-dark/60"><div className="grid gap-3 sm:grid-cols-3 sm:items-end"><LabelledInput label="Dari" type="date" value={customFrom} onChange={(event) => { setCustomFrom(event.target.value); setCustomDateError(""); }} /><LabelledInput label="Sampai" type="date" value={customTo} onChange={(event) => { setCustomTo(event.target.value); setCustomDateError(""); }} /><button type="button" className="btn-primary w-full" onClick={applyCustomDate}>Terapkan</button></div>{customDateError ? <p className="mt-2 text-xs text-jp-danger dark:text-jp-danger-dark" role="alert">{customDateError}</p> : null}</div> : null}{statsLoading ? <LoadingSkeleton numberOfRows={3} /> : stats ? <><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{isKasir ? <><div className="metric-card p-4"><p className="label">Transaksi</p><p className="text-xl font-bold">{stats.kasir.jumlah_transaksi}</p><p className="mt-0.5 text-[10px] text-jp-muted dark:text-jp-muted-dark">≈ {stats.kasir.rata_per_hari}/hari</p></div><div className="metric-card p-4"><p className="label">Omzet</p><p className="text-xl font-bold font-mono text-jp-teal dark:text-jp-teal">Rp {stats.kasir.total_omzet.toLocaleString("id-ID")}</p></div><div className="metric-card p-4"><p className="label">Profit</p><p className="text-xl font-bold font-mono text-jp-success dark:text-jp-success-dark">Rp {stats.kasir.total_profit.toLocaleString("id-ID")}</p></div></> : <><div className="metric-card p-4"><p className="label">Total Service</p><p className="text-xl font-bold">{stats.teknisi.total_service}</p></div><div className="metric-card p-4"><p className="label">Selesai</p><p className="text-xl font-bold text-jp-success dark:text-jp-success-dark">{stats.teknisi.jumlah_selesai}</p><p className="mt-0.5 text-[10px] text-jp-muted dark:text-jp-muted-dark">≈ {stats.teknisi.rata_selesai_per_hari}/hari</p></div><div className="metric-card p-4"><p className="label mb-1">Status</p>{Object.entries(stats.teknisi.status_breakdown).map(([status, count]) => <div key={status} className="flex justify-between text-[11px]"><span className="text-jp-muted dark:text-jp-muted-dark">{status}</span><span className="font-semibold">{count}</span></div>)}</div></>}</div><div className="rounded-jp-md bg-jp-surface-subtle p-4 dark:bg-jp-surface-subtle-dark/60"><p className="mb-3 text-xs font-medium text-jp-muted dark:text-jp-muted-dark">{isKasir ? "Omzet" : "Service Selesai"} — Trend Harian</p><KaryawanStatsChart trend={trend} isKasir={Boolean(isKasir)} /></div><p className="text-center text-[10px] text-jp-muted dark:text-jp-muted-dark">{stats.periode.dari} → {stats.periode.sampai}</p></> : null}</div>
      </Modal>
    </div>
  );
}
