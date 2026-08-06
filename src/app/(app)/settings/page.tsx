"use client";

// Settings — profile info + change-password. Available to every role.
//
// Migrated from `renderSettings()` / `simpanProfil()` / `gantiPassword()` in
// index.html.bak (approx. lines 3737–3862). Split into two clearly-separated
// forms so state doesn't get tangled.

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { LabelledInput } from "@/components/ui/InputField";
import { UserAvatar } from "@/components/layout/UserAvatar";
import type { AuthenticatedUser } from "@/lib/types";

export default function SettingsPage(): JSX.Element {
  const { refreshCurrentUser } = useAuth();
  const { showToast } = useToast();

  const [profileFromServer, setProfileFromServer] = useState<AuthenticatedUser | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [fetchErrorMessage, setFetchErrorMessage] = useState<string>("");

  const loadProfile = useCallback(async (): Promise<void> => {
    setIsFetching(true);
    setFetchErrorMessage("");
    try {
      const response = await Api.auth.me();
      setProfileFromServer(response.data);
    } catch (loadError) {
      const message = loadError instanceof ApiError ? loadError.message : "Gagal memuat profil";
      setFetchErrorMessage(message);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (isFetching) return <LoadingSkeleton numberOfRows={4} />;
  if (fetchErrorMessage) return <ErrorState message={fetchErrorMessage} onRetry={loadProfile} />;
  if (!profileFromServer) return <></>;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">Pengaturan Profil</h2>

      <section className="space-y-5 rounded-2xl border border-jp-border bg-jp-surface p-5 dark:border-jp-border-dark dark:bg-jp-surface-dark">
        <h3 className="text-sm font-medium text-jp-muted dark:text-jp-muted-dark dark:text-jp-muted dark:text-jp-muted-dark">Informasi Akun</h3>
        <div className="space-y-3">
          <div>
            <p className="label">Role</p>
            <div className="rounded-xl bg-jp-surface-subtle px-3 py-2 text-sm font-medium dark:bg-jp-surface-subtle-dark">
              {profileFromServer.role}
            </div>
          </div>
          <div>
            <p className="label">Cabang</p>
            <div className="rounded-xl bg-jp-surface-subtle px-3 py-2 text-sm font-medium dark:bg-jp-surface-subtle-dark">
              {profileFromServer.cabang || "-"}
            </div>
          </div>
          <LabelledInput label="Username" value={profileFromServer.username} readOnly />
          <LabelledInput label="Nama Tampil" value={profileFromServer.name ?? ""} readOnly />
          <div>
            <p className="label">Foto Profil</p>
            <div className="flex items-center gap-4">
              <UserAvatar
                fotoProfileUrl={profileFromServer.foto_profil_url}
                altText={profileFromServer.name ?? "Foto profil"}
                sizeClassName="h-16 w-16"
              />
              <p className="text-xs text-jp-muted dark:text-jp-muted-dark dark:text-jp-muted dark:text-jp-muted-dark">
                Untuk mengganti foto profil, gunakan komponen ImageUploader — masih dalam
                antrian porting. Sementara ini update via endpoint /auth/me/profile secara
                langsung.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ChangePasswordCard onPasswordChanged={() => showToast("Password berhasil diubah. Anda tetap login.", "success")} />

      {/* Refresh handle so the header avatar picks up any profile change made
          via another tab or a future ImageUploader integration. */}
      <button
        type="button"
        className="btn-ghost"
        onClick={() => {
          void refreshCurrentUser();
          void loadProfile();
        }}
      >
        Muat Ulang Data Profil
      </button>
    </div>
  );
}

// ── Change-password subsection kept in the same file to avoid a one-off dir. ──

interface ChangePasswordCardProps {
  onPasswordChanged: () => void;
}

function ChangePasswordCard({ onPasswordChanged }: ChangePasswordCardProps): JSX.Element {
  const { showToast } = useToast();
  const [oldPasswordValue, setOldPasswordValue] = useState<string>("");
  const [newPasswordValue, setNewPasswordValue] = useState<string>("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement>): Promise<void> => {
    formEvent.preventDefault();
    if (!oldPasswordValue || !newPasswordValue || !confirmPasswordValue) {
      showToast("Semua field wajib diisi", "error");
      return;
    }
    if (newPasswordValue !== confirmPasswordValue) {
      showToast("Konfirmasi password tidak cocok", "error");
      return;
    }
    if (newPasswordValue.length < 6) {
      showToast("Password minimal 6 karakter", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      await Api.auth.changePassword({
        password_lama: oldPasswordValue,
        password_baru: newPasswordValue,
        password_konfirmasi: confirmPasswordValue,
      });
      setOldPasswordValue("");
      setNewPasswordValue("");
      setConfirmPasswordValue("");
      onPasswordChanged();
    } catch (submitError) {
      const message = submitError instanceof ApiError ? submitError.message : "Gagal mengubah password";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border border-jp-border bg-jp-surface p-5 dark:border-jp-border-dark dark:bg-jp-surface-dark">
      <h3 className="text-sm font-medium text-jp-muted dark:text-jp-muted-dark dark:text-jp-muted dark:text-jp-muted-dark">Ganti Password</h3>
      <p className="text-xs text-jp-muted dark:text-jp-muted-dark dark:text-jp-muted dark:text-jp-muted-dark">
        Masukkan password lama dan password baru (minimal 6 karakter).
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <LabelledInput
          label="Password Lama"
          required
          type="password"
          autoComplete="current-password"
          value={oldPasswordValue}
          onChange={(inputEvent) => setOldPasswordValue(inputEvent.target.value)}
        />
        <LabelledInput
          label="Password Baru"
          required
          type="password"
          autoComplete="new-password"
          value={newPasswordValue}
          onChange={(inputEvent) => setNewPasswordValue(inputEvent.target.value)}
        />
        <LabelledInput
          label="Konfirmasi Password Baru"
          required
          type="password"
          autoComplete="new-password"
          value={confirmPasswordValue}
          onChange={(inputEvent) => setConfirmPasswordValue(inputEvent.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner" /> Mengubah...
            </>
          ) : (
            "Ganti Password"
          )}
        </button>
      </form>
    </section>
  );
}
