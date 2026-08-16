"use client";

import { useState } from "react";
import { Api } from "@/lib/api";
import type { Karyawan, KaryawanStats } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
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
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Karyawan | null>(null);
  const [statsEmployee, setStatsEmployee] = useState<Karyawan | null>(null);
  const [stats, setStats] = useState<KaryawanStats | null>(null);
  const [statsFilter, setStatsFilter] = useState<StatsFilter>(DEFAULT_STATS_FILTER);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [form, setForm] = useState({ nama: "", username: "", jabatan: "Kasir", cabang: user?.cabang || "", gaji: "", password: "" });

  const { items, loading, error, reload: load } = useApiList<Karyawan>(
    () => Api.karyawan.list(user?.role === "owner" ? {} : { cabang: user?.cabang }).then((r) => r.data || []),
    [user],
    "Gagal memuat karyawan",
  );

  const create = async () => {
    if (!form.nama || !form.username || !form.password) { showToast("Nama, username, dan password wajib diisi", "error"); return; }
    try { await Api.karyawan.create({ ...form, gaji: Number(form.gaji) || 0 }); showToast("Karyawan berhasil ditambahkan"); setOpen(false); await load(); }
    catch (e) { showToast(e instanceof Error ? e.message : "Tambah karyawan gagal", "error"); }
  };

  const fetchStats = async (karyawanId: string, filter: StatsFilter) => {
    setStatsLoading(true);
    try {
      const params = filter.preset === "custom" && filter.start && filter.end
        ? { date_from: filter.start, date_to: filter.end }
        : { hari: STATS_PRESET_DAYS[filter.preset] };
      setStats((await Api.karyawan.stats(karyawanId, params)).data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal memuat statistik", "error");
    } finally {
      setStatsLoading(false);
    }
  };

  const openStats = (k: Karyawan) => {
    setStatsEmployee(k);
    setStats(null);
    setStatsFilter(DEFAULT_STATS_FILTER);
    setShowCustomDate(false);
    void fetchStats(k.id, DEFAULT_STATS_FILTER);
  };

  const closeStats = () => { setStatsEmployee(null); setStats(null); setShowCustomDate(false); };

  const selectPreset = (preset: StatsPreset) => {
    if (!statsEmployee) return;
    const nextFilter: StatsFilter = { preset, start: null, end: null };
    setStatsFilter(nextFilter);
    setShowCustomDate(false);
    void fetchStats(statsEmployee.id, nextFilter);
  };

  const applyCustomDate = () => {
    if (!statsEmployee) return;
    if (!customFrom || !customTo) { showToast("Lengkapi tanggal dari dan sampai", "error"); return; }
    const nextFilter: StatsFilter = { preset: "custom", start: customFrom, end: customTo };
    setStatsFilter(nextFilter);
    setShowCustomDate(false);
    void fetchStats(statsEmployee.id, nextFilter);
  };

  const isResetPasswordValid = password.length >= 6 && password === confirmPassword;

  const reset = async () => {
    if (!selected) return;
    if (password.length < 6) { showToast("Password minimal 6 karakter", "error"); return; }
    if (password !== confirmPassword) { showToast("Konfirmasi password tidak cocok", "error"); return; }
    try {
      await Api.karyawan.resetPassword(selected.id, { password });
      showToast("Password berhasil direset");
      setSelected(null); setPassword(""); setConfirmPassword(""); setShowNewPassword(false);
    } catch (e) { showToast(e instanceof Error ? e.message : "Reset password gagal", "error"); }
  };

  const fire = async (k: Karyawan) => {
    if (!window.confirm("Nonaktifkan akun " + k.nama + "?")) return;
    try { await Api.cabang.pecatKaryawan(k.id); showToast("Karyawan dinonaktifkan"); await load(); }
    catch (e) { showToast(e instanceof Error ? e.message : "Gagal menonaktifkan", "error"); }
  };

  const isKasir = statsEmployee?.jabatan === "Kasir";
  const trend = stats ? (isKasir ? stats.kasir.trend_harian : stats.teknisi.trend_harian) : [];

  return (
    <div className="jp-page">
      <div className="jp-page-header">
        <div>
          <h1 className="jp-page-title">Karyawan</h1>
          <p className="text-sm text-jp-muted dark:text-jp-muted-dark">{items.length} karyawan</p>
        </div>
        {user?.role === "kepala_cabang" && <button className="btn-primary" type="button" onClick={() => setOpen(true)}>+ Tambah Karyawan</button>}
      </div>

      {loading ? <LoadingSkeleton numberOfRows={5} /> : error ? <ErrorState message={error} onRetry={load} /> : items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((k) => (
            <div className="svc-card" key={k.id}>
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-semibold">{k.nama}</p><span className="badge">{k.jabatan}</span></div>
                <span className={k.aktif ? "text-jp-success dark:text-jp-success-dark" : "text-jp-danger dark:text-jp-danger-dark"}>{k.aktif ? "Aktif" : "Nonaktif"}</span>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <p className="flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Username</span><span>{k.username}</span></p>
                <p className="flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Cabang</span><span>{k.cabang}</span></p>
                <p className="flex justify-between"><span className="text-jp-muted dark:text-jp-muted-dark">Gaji</span><span>Rp {(k.gaji || 0).toLocaleString("id-ID")}</span></p>
              </div>
              {(k.jabatan === "Kasir" || k.jabatan === "Teknisi") && <button className="btn-ghost mt-4 w-full" type="button" onClick={() => openStats(k)}>Detail Statistik</button>}
              {user?.role === "owner" && k.aktif && k.username !== user.username && (
                <div className="mt-4 flex gap-2">
                  <button className="btn-ghost flex-1" type="button" onClick={() => { setSelected(k); setPassword(""); setConfirmPassword(""); setShowNewPassword(false); }}>Reset PW</button>
                  <button className="btn-error flex-1" type="button" onClick={() => void fire(k)}>Pecat</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : <EmptyState message="Belum ada karyawan" iconName="userSvg" />}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Tambah Karyawan">
        <div className="space-y-3">
          <LabelledInput label="Nama Lengkap" required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <LabelledInput label="Username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <LabelledSelect label="Jabatan" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })}>
              <option>Kasir</option><option>Teknisi</option><option>Kurir</option><option>Influencer</option>
            </LabelledSelect>
          </div>
          <LabelledInput label="Gaji" type="number" value={form.gaji} onChange={(e) => setForm({ ...form, gaji: e.target.value })} />
          <LabelledInput label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="btn-primary w-full" type="button" onClick={() => void create()}>Simpan Karyawan</button>
        </div>
      </Modal>

      <Modal isOpen={selected !== null} onClose={() => setSelected(null)} title="Reset Password">
        <div className="space-y-3">
          <p className="text-sm">{selected?.nama} · @{selected?.username}</p>
          <LabelledInput
            label="Password Baru"
            type={showNewPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helper="Minimal 6 karakter"
          />
          <LabelledInput
            label="Konfirmasi Password Baru"
            type={showNewPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            errorMessage={confirmPassword && password !== confirmPassword ? "Konfirmasi password tidak cocok" : undefined}
          />
          <label className="flex items-center gap-1.5 text-xs text-jp-muted dark:text-jp-muted-dark">
            <input type="checkbox" className="h-3.5 w-3.5 accent-jp-teal" checked={showNewPassword} onChange={(e) => setShowNewPassword(e.target.checked)} />
            Tampilkan password
          </label>
          <button className="btn-primary w-full" type="button" disabled={!isResetPasswordValid} onClick={() => void reset()}>Reset Password</button>
        </div>
      </Modal>

      <Modal isOpen={statsEmployee !== null} onClose={closeStats} title={statsEmployee ? "Statistik " + statsEmployee.nama : "Statistik Karyawan"} maxWidthClassName="max-w-2xl">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="segmented-control">
              {STATS_PRESET_TABS.map((tab) => (
                <button key={tab.key} type="button" onClick={() => selectPreset(tab.key)}
                  className={statsFilter.preset === tab.key ? "filter-tab filter-tab-active" : "filter-tab"}>
                  {tab.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setShowCustomDate((v) => !v)}
              className={`btn-ghost px-4 py-1.5 text-xs ${statsFilter.preset === "custom" ? "text-jp-teal dark:text-jp-teal" : ""}`}>
              {statsFilter.preset === "custom" && statsFilter.start && statsFilter.end ? `${statsFilter.start} → ${statsFilter.end}` : "Custom"}
            </button>
          </div>

          {showCustomDate && (
            <div className="flex flex-wrap items-end gap-3 rounded-jp-sm bg-jp-surface-subtle p-4 dark:bg-jp-surface-subtle-dark/60">
              <LabelledInput label="Dari" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="min-w-0" />
              <LabelledInput label="Sampai" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="min-w-0" />
              <button type="button" className="btn-primary" onClick={applyCustomDate}>Terapkan</button>
            </div>
          )}

          {statsLoading ? <LoadingSkeleton numberOfRows={3} /> : stats && (
            <>
              {isKasir ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="metric-card p-4">
                    <p className="label">Transaksi</p>
                    <p className="text-xl font-bold">{stats.kasir.jumlah_transaksi}</p>
                    <p className="mt-0.5 text-[10px] text-jp-muted dark:text-jp-muted-dark">≈ {stats.kasir.rata_per_hari}/hari</p>
                  </div>
                  <div className="metric-card p-4">
                    <p className="label">Omzet</p>
                    <p className="text-xl font-bold font-mono text-jp-teal dark:text-jp-teal">Rp {stats.kasir.total_omzet.toLocaleString("id-ID")}</p>
                  </div>
                  <div className="metric-card p-4">
                    <p className="label">Profit</p>
                    <p className="text-xl font-bold font-mono text-jp-success dark:text-jp-success-dark">Rp {stats.kasir.total_profit.toLocaleString("id-ID")}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="metric-card p-4">
                    <p className="label">Total Service</p>
                    <p className="text-xl font-bold">{stats.teknisi.total_service}</p>
                  </div>
                  <div className="metric-card p-4">
                    <p className="label">Selesai</p>
                    <p className="text-xl font-bold text-jp-success dark:text-jp-success-dark">{stats.teknisi.jumlah_selesai}</p>
                    <p className="mt-0.5 text-[10px] text-jp-muted dark:text-jp-muted-dark">≈ {stats.teknisi.rata_selesai_per_hari}/hari</p>
                  </div>
                  <div className="metric-card p-4">
                    <p className="label mb-1">Status</p>
                    {Object.entries(stats.teknisi.status_breakdown).map(([status, count]) => (
                      <div key={status} className="flex justify-between text-[11px]">
                        <span className="text-jp-muted dark:text-jp-muted-dark">{status}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-jp-md bg-jp-surface-subtle p-4 dark:bg-jp-surface-subtle-dark/60">
                <p className="mb-3 text-xs font-medium text-jp-muted dark:text-jp-muted-dark">{isKasir ? "Omzet" : "Service Selesai"} — Trend Harian</p>
                <KaryawanStatsChart trend={trend} isKasir={Boolean(isKasir)} />
              </div>
              <p className="text-center text-[10px] text-jp-muted dark:text-jp-muted-dark">{stats.periode.dari} → {stats.periode.sampai}</p>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
