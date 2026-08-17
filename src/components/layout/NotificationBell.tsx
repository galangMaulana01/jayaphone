"use client";

// Bell icon + polling badge + dropdown panel.
//
// This is the Next.js port of the legacy `NOTIF` singleton (poll every 30s,
// dedup with a seen-set persisted to localStorage). Two important behaviours
// preserved from the audit fixes:
//   • FBUG-014: only poll /service/pending-approval for the roles the backend
//     actually allows (kasir / kepala_cabang / owner). Kurir/influencer skip.
//   • Only poll /transfer-stok/notif/{count,pending} for owner + kepala_cabang.
//   • Only poll /request-sparepart/notif/{count,pending} for teknisi — that's
//     the only role a "sparepart Anda sudah tersedia" notification applies to.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationEntry {
  id: string;
  variant: "approval" | "info";
  title: string;
  body: string;
  targetPageKey: string;
  emittedAtMillis: number;
  isRead: boolean;
}

const POLL_INTERVAL_MILLIS = 30_000;

// Storage keys are scoped per-username — these entries are role-derived
// (pending approvals, incoming transfers, sparepart ready) and must never
// leak from one logged-in account to another on a shared browser. Without
// this, an owner/kasir's stale "Service Selesai — Butuh Approval" entries
// (targetPageKey "approval-repair") would still be sitting in a GLOBAL key
// the next time anyone — including a teknisi who can't even open that
// page — logs in on the same device, and clicking one would 404/403.
function notifStorageKey(username: string): string {
  return `jyp_notif_${username}`;
}
function notifSeenStorageKey(username: string): string {
  return `jyp_notif_seen_${username}`;
}

function loadEntriesFor(username: string): NotificationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(notifStorageKey(username));
    return raw ? (JSON.parse(raw) as NotificationEntry[]) : [];
  } catch {
    return [];
  }
}

function loadSeenSetFor(username: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(notifSeenStorageKey(username));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function formatTimeSince(emittedAtMillis: number): string {
  const secondsElapsed = Math.floor((Date.now() - emittedAtMillis) / 1000);
  if (secondsElapsed < 60) return "Baru saja";
  if (secondsElapsed < 3600) return `${Math.floor(secondsElapsed / 60)} menit lalu`;
  if (secondsElapsed < 86400) return `${Math.floor(secondsElapsed / 3600)} jam lalu`;
  return `${Math.floor(secondsElapsed / 86400)} hari lalu`;
}

export function NotificationBell(): JSX.Element | null {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const currentUsername = currentUser?.username ?? null;

  const [notificationEntries, setNotificationEntries] = useState<NotificationEntry[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Which username's data is currently loaded into state/ref above, and
  // whether the persistence effect below should skip its next run (it
  // would otherwise fire right after this effect swaps in the new user's
  // entries and re-save them under... whichever key was current at that
  // instant — harmless in effect order today, but this guard keeps it that
  // way even if effect ordering ever changes).
  const loadedUsernameRef = useRef<string | null>(null);
  const skipNextPersistRef = useRef(false);

  useEffect(() => {
    if (currentUsername === loadedUsernameRef.current) return;
    loadedUsernameRef.current = currentUsername;
    skipNextPersistRef.current = true;
    if (!currentUsername) {
      setNotificationEntries([]);
      seenIdsRef.current = new Set();
      return;
    }
    setNotificationEntries(loadEntriesFor(currentUsername));
    seenIdsRef.current = loadSeenSetFor(currentUsername);
  }, [currentUsername]);

  const unreadCount = useMemo(
    () => notificationEntries.filter((entry) => !entry.isRead).length,
    [notificationEntries],
  );

  // Persist to localStorage on every change — but not the change that just
  // loaded a (possibly different) user's own entries in the effect above.
  useEffect(() => {
    if (typeof window === "undefined" || !currentUsername) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    window.localStorage.setItem(notifStorageKey(currentUsername), JSON.stringify(notificationEntries.slice(0, 30)));
  }, [notificationEntries, currentUsername]);

  const enqueueNotification = useCallback((incomingEntry: Omit<NotificationEntry, "emittedAtMillis" | "isRead">, eventAtIso?: string | null): boolean => {
    if (!currentUsername) return false;
    if (seenIdsRef.current.has(incomingEntry.id)) return false;
    seenIdsRef.current.add(incomingEntry.id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        notifSeenStorageKey(currentUsername),
        JSON.stringify([...seenIdsRef.current].slice(0, 100)),
      );
    }
    // Use the actual backend event time (when the ticket/transfer/sparepart
    // request really happened), not "whenever this browser's poller first
    // saw it" — otherwise a notification that's been sitting unactioned for
    // days shows a misleadingly recent "3 jam lalu" the moment someone
    // finally logs back in. Falls back to now() only if the source has no
    // timestamp or it fails to parse.
    const parsedEventAtMillis = eventAtIso ? new Date(eventAtIso).getTime() : NaN;
    const emittedAtMillis = Number.isFinite(parsedEventAtMillis) ? parsedEventAtMillis : Date.now();
    setNotificationEntries((previous) => [
      { ...incomingEntry, emittedAtMillis, isRead: false },
      ...previous,
    ]);
    return true;
  }, [currentUsername]);

  const runPollingCycle = useCallback(async (): Promise<void> => {
    if (!currentUser) return;
    const role = currentUser.role;

    // Pending service-approval — only for kasir/kepala_cabang/owner (FBUG-014).
    if (role === "kasir" || role === "kepala_cabang" || role === "owner") {
      try {
        const response = await Api.service.pendingApproval({ limit: 50 });
        // Owner/kepala_cabang no longer have a standalone "Approval Repair"
        // nav item (folded into Data Service's own inline Approve, filtered
        // via ?status=Selesai) — kasir still does, so its target is unchanged.
        const targetPageKey = role === "kasir" ? "approval-repair" : "service?status=Selesai";
        for (const serviceTicket of response.data) {
          enqueueNotification({
            id: serviceTicket.service_id,
            variant: "approval",
            title: "Service Selesai — Butuh Approval",
            body: `${serviceTicket.unit_label || serviceTicket.unit_id} · ${serviceTicket.keluhan ?? ""}`,
            targetPageKey,
          }, serviceTicket.updated_at || serviceTicket.created_at);
        }
      } catch {
        /* silent — polling must never disturb the UI */
      }
    }

    // Pending transfer-stok — owner + kepala_cabang only.
    if (role === "kepala_cabang" || role === "owner") {
      try {
        const countResponse = await Api.transferStok.notifCount();
        const pendingCount = countResponse.data?.count ?? 0;
        if (pendingCount > 0) {
          const pendingResponse = await Api.transferStok.notifPending();
          for (const transferEntry of pendingResponse.data) {
            enqueueNotification({
              id: transferEntry.transfer_id,
              variant: "info",
              title: `Transfer Stok Masuk — ${transferEntry.transfer_id}`,
              body: `${transferEntry.jumlah} unit dari ${transferEntry.cabang_asal} menunggu persetujuan`,
              targetPageKey: "transfer-stok",
            }, transferEntry.created_at);
          }
        }
      } catch {
        /* silent */
      }
    }

    // Pending COD Beli approval — kasir only (Approval COD has no nav entry
    // for owner/kepala_cabang, even though the backend technically allows
    // them too — was previously a completely silent queue with no bell/badge
    // anywhere, only discoverable by opening the page).
    if (role === "kasir") {
      try {
        const response = await Api.cod.list({ type: "beli", status: "menunggu_approval_kasir" });
        for (const codEntry of response.data ?? []) {
          enqueueNotification({
            id: codEntry.cod_id,
            variant: "approval",
            title: "COD Beli Menunggu Approval",
            body: `${codEntry.product_name || codEntry.cod_id} · kurir ${codEntry.kurir_name || "-"}`,
            targetPageKey: "approval-cod",
          }, codEntry.updated_at || codEntry.created_at);
        }
      } catch {
        /* silent */
      }
    }

    // Customer baru menunggu verifikasi — hanya kepala_cabang/owner, karena
    // hanya mereka yang backend-nya izinkan approve/reject (kasir bisa lihat
    // daftarnya tapi tidak bisa memutuskan). Was previously silent — the
    // Api.customer.pendingCount() method existed but nothing ever called it.
    if (role === "kepala_cabang" || role === "owner") {
      try {
        const countResponse = await Api.customer.pendingCount();
        const pendingCustomerCount = countResponse.data?.count ?? 0;
        if (pendingCustomerCount > 0) {
          const listResponse = await Api.customer.list({ status: "Pending", limit: 50 });
          for (const customerEntry of listResponse.data ?? []) {
            enqueueNotification({
              id: customerEntry.id,
              variant: "approval",
              title: "Customer Baru Menunggu Verifikasi",
              body: `${customerEntry.nama} · ${customerEntry.kontak}`,
              targetPageKey: "customers?status=Pending",
            }, customerEntry.created_at);
          }
        }
      } catch {
        /* silent */
      }
    }

    // Request sparepart menunggu approval harga — kepala_cabang/owner. Teknisi
    // already gets a "sparepart ready" notification below once a request is
    // Diterima; this is the earlier step nobody was notified about — the KC
    // who must approve the price had no zero-click discovery at all before.
    if (role === "kepala_cabang" || role === "owner") {
      try {
        const response = await Api.requestSparepart.list({ status: "Pending" });
        for (const requestEntry of response.data ?? []) {
          enqueueNotification({
            id: requestEntry.req_id,
            variant: "approval",
            title: "Request Sparepart Menunggu Approval",
            body: `${requestEntry.nama_sp} x${requestEntry.jumlah}` + (requestEntry.service_id ? ` · servis ${requestEntry.service_id}` : ""),
            targetPageKey: "sparepart?tab=request",
          }, requestEntry.created_at);
        }
      } catch {
        /* silent */
      }
    }

    // Sparepart request yang baru diterima/direservasi — teknisi only. Cuma
    // muncul selama beberapa jam setelah diterima (jendela sama dengan tab
    // "Riwayat Pemakaian" di halaman Sparepart), jadi id-based dedup di
    // enqueueNotification sudah cukup untuk mencegah notifikasi berulang
    // tanpa perlu backend menandai "sudah dilihat".
    if (role === "teknisi") {
      try {
        const countResponse = await Api.requestSparepart.notifCount();
        const pendingCount = countResponse.data?.count ?? 0;
        if (pendingCount > 0) {
          const pendingResponse = await Api.requestSparepart.notifPending();
          for (const requestEntry of pendingResponse.data) {
            enqueueNotification({
              id: requestEntry.req_id,
              variant: "info",
              title: `Sparepart Tersedia — ${requestEntry.nama_sp}`,
              body: requestEntry.service_id
                ? `Untuk servis ${requestEntry.service_id}${requestEntry.unit_label ? ` · ${requestEntry.unit_label}` : ""}`
                : `${requestEntry.jumlah} unit sudah masuk stok`,
              // Teknisi has no standalone Sparepart page anymore — land back
              // on their workspace, deep-linked into the exact ticket that's
              // ready so "Gunakan Sparepart" is one click away.
              targetPageKey: requestEntry.service_id ? `service-list?open=${requestEntry.service_id}` : "service-list",
            }, requestEntry.diterima_at);
          }
        }
      } catch {
        /* silent */
      }
    }
  }, [currentUser, enqueueNotification]);

  // Polling lifecycle.
  useEffect(() => {
    if (!currentUser) return;
    void runPollingCycle();
    const intervalHandle = setInterval(() => {
      void runPollingCycle();
    }, POLL_INTERVAL_MILLIS);
    return () => clearInterval(intervalHandle);
  }, [currentUser, runPollingCycle]);

  const markAllAsRead = useCallback((): void => {
    setNotificationEntries((previous) => previous.map((entry) => ({ ...entry, isRead: true })));
  }, []);

  const handlePanelOpen = useCallback((): void => {
    setIsPanelOpen(true);
    markAllAsRead();
  }, [markAllAsRead]);

  const handleNotificationClick = (targetPageKey: string): void => {
    setIsPanelOpen(false);
    if (targetPageKey) router.push(`/${targetPageKey}`);
  };

  const clearAll = useCallback((): void => {
    setNotificationEntries([]);
  }, []);

  // Hide the bell entirely for roles that never receive notifications (matches
  // the polling gate above — no polling means nothing to show).
  const isBellVisible =
    !!currentUser &&
    (currentUser.role === "kasir" || currentUser.role === "kepala_cabang" || currentUser.role === "owner" || currentUser.role === "teknisi");
  if (!isBellVisible) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
        onClick={isPanelOpen ? () => setIsPanelOpen(false) : handlePanelOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-jp-sm text-jp-muted transition-colors hover:bg-jp-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-teal dark:text-jp-muted-dark dark:hover:bg-jp-surface-subtle-dark"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-jp-danger px-1 text-[9px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isPanelOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-jp-md border border-jp-border bg-jp-surface shadow-jp-overlay dark:border-jp-border-dark dark:bg-jp-surface-dark"
          onMouseLeave={() => setIsPanelOpen(false)}
        >
          <div className="flex items-center justify-between border-b border-divider px-4 py-2">
            <span className="text-xs font-semibold">Notifikasi</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-medium text-jp-muted hover:text-jp-danger dark:text-jp-muted-dark dark:hover:text-jp-danger-dark"
            >
              Bersihkan
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificationEntries.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-jp-muted dark:text-jp-muted-dark">
                Tidak ada notifikasi
              </div>
            ) : (
              notificationEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleNotificationClick(entry.targetPageKey)}
                  className={`relative w-full cursor-pointer border-t border-jp-border px-4 py-3.5 text-left transition-colors first:border-t-0 hover:bg-jp-surface-subtle dark:border-jp-border-dark dark:hover:bg-jp-surface-subtle-dark/60 ${
                    entry.isRead ? "" : "bg-jp-teal-soft dark:bg-jp-teal-soft-dark/50"
                  }`}
                >
                  {!entry.isRead ? <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-jp-teal" aria-hidden="true" /> : null}
                  <p className="text-xs font-medium leading-snug text-jp-text dark:text-jp-text-dark">
                    {entry.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-jp-muted dark:text-jp-muted-dark">
                    {entry.body}
                  </p>
                  <p className="mt-1.5 text-[10px] text-jp-faint dark:text-jp-muted-dark">
                    {formatTimeSince(entry.emittedAtMillis)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
