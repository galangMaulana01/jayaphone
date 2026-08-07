"use client";

// Bell icon + polling badge + dropdown panel.
//
// This is the Next.js port of the legacy `NOTIF` singleton (poll every 30s,
// dedup with a seen-set persisted to localStorage). Two important behaviours
// preserved from the audit fixes:
//   • FBUG-014: only poll /service/pending-approval for the roles the backend
//     actually allows (kasir / kepala_cabang / owner). Kurir/influencer skip.
//   • Only poll /transfer-stok/notif/{count,pending} for owner + kepala_cabang.

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

const NOTIF_STORAGE_KEY = "jyp_notif";
const NOTIF_SEEN_STORAGE_KEY = "jyp_notif_seen";
const POLL_INTERVAL_MILLIS = 30_000;

function loadInitialEntries(): NotificationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIF_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NotificationEntry[]) : [];
  } catch {
    return [];
  }
}

function loadInitialSeenSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(NOTIF_SEEN_STORAGE_KEY);
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

  const [notificationEntries, setNotificationEntries] = useState<NotificationEntry[]>(() => loadInitialEntries());
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const seenIdsRef = useRef<Set<string>>(loadInitialSeenSet());

  const unreadCount = useMemo(
    () => notificationEntries.filter((entry) => !entry.isRead).length,
    [notificationEntries],
  );

  // Persist to localStorage on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notificationEntries.slice(0, 30)));
  }, [notificationEntries]);

  const enqueueNotification = useCallback((incomingEntry: Omit<NotificationEntry, "emittedAtMillis" | "isRead">): boolean => {
    if (seenIdsRef.current.has(incomingEntry.id)) return false;
    seenIdsRef.current.add(incomingEntry.id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        NOTIF_SEEN_STORAGE_KEY,
        JSON.stringify([...seenIdsRef.current].slice(0, 100)),
      );
    }
    setNotificationEntries((previous) => [
      { ...incomingEntry, emittedAtMillis: Date.now(), isRead: false },
      ...previous,
    ]);
    return true;
  }, []);

  const runPollingCycle = useCallback(async (): Promise<void> => {
    if (!currentUser) return;
    const role = currentUser.role;

    // Pending service-approval — only for kasir/kepala_cabang/owner (FBUG-014).
    if (role === "kasir" || role === "kepala_cabang" || role === "owner") {
      try {
        const response = await Api.service.pendingApproval({ limit: 50 });
        for (const serviceTicket of response.data) {
          enqueueNotification({
            id: serviceTicket.service_id,
            variant: "approval",
            title: "Service Selesai — Butuh Approval",
            body: `${serviceTicket.unit_label || serviceTicket.unit_id} · ${serviceTicket.keluhan ?? ""}`,
            targetPageKey: "approval-repair",
          });
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
            });
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
    (currentUser.role === "kasir" || currentUser.role === "kepala_cabang" || currentUser.role === "owner");
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
