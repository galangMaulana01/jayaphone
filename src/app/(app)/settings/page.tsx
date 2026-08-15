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
import { ImageUploader } from "@/components/ui/ImageUploader";
import { NOT_SET } from "@/lib/utils/formatters";
import type { AuthenticatedUser, UploadedImage } from "@/lib/types";

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

  const handlePhotoChange = async (images: UploadedImage[]): Promise<void> => {
    try {
      const response = await Api.auth.updateProfile({ foto_profil_url: images[0]?.secure_url ?? null });
      setProfileFromServer(response.data);
      await refreshCurrentUser();
      showToast(images.length ? "Foto profil berhasil diperbarui" : "Foto profil dihapus", "success");
    } catch (updateError) {
      const message = updateError instanceof ApiError ? updateError.message : "Gagal memperbarui foto profil";
      showToast(message, "error");
    }
  };

  if (isFetching) return <LoadingSkeleton numberOfRows={4} />;
  if (fetchErrorMessage) return <ErrorState message={fetchErrorMessage} onRetry={loadProfile} />;
  if (!profileFromServer) return <></>;

  return (
    <div className="jp-page max-w-3xl">
      <header><h1 className="jp-page-title">Pengaturan Profil</h1><p className="mt-2 text-sm text-jp-muted dark:text-jp-muted-dark">Kelola identitas akun dan keamanan akses.</p></header>

      <section className="form-section">
        <h3 className="text-sm font-medium text-jp-muted dark:text-jp-muted-dark">Informasi Akun</h3>
        <div className="space-y-3">
          <div>
            <p className="label">Role</p>
            <div className="rounded-jp-sm bg-jp-surface-subtle px-3 py-2 text-sm font-medium dark:bg-jp-surface-subtle-dark">
              {profileFromServer.role}
            </div>
          </div>
          <div>
            <p className="label">Cabang</p>
            <div className="rounded-jp-sm bg-jp-surface-subtle px-3 py-2 text-sm font-medium dark:bg-jp-surface-subtle-dark">
              {profileFromServer.cabang || NOT_SET}
            </div>
          </div>
          <LabelledInput label="Username" value={profileFromServer.username} readOnly />
          <LabelledInput label="Nama Tampil" value={profileFromServer.name ?? ""} readOnly />
          <ImageUploader
            id="settings-foto-profil"
            label="Foto Profil"
            maxFiles={1}
            folder="jayaphone/profile"
            deleteRemoteOnRemove
            initialImages={profileFromServer.foto_profil_url ? [{ secure_url: profileFromServer.foto_profil_url }] : []}
            onChange={(images) => void handlePhotoChange(images)}
          />
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
    <section className="form-section">
      <h3 className="text-sm font-medium text-jp-muted dark:text-jp-muted-dark">Ganti Password</h3>
      <p className="text-xs text-jp-muted dark:text-jp-muted-dark">
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
