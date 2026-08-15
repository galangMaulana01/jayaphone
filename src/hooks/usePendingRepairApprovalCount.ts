"use client";

// Shared count for units in "Selesai" status awaiting a sale-price approval
// (Api.units.approveRepair). Used in two places that must never disagree:
//   • Sidebar — badge on "Data Service" so owner/kepala_cabang get the same
//     zero-click discovery the standalone "Approval Repair" page used to give.
//   • Data Service page — the "Perlu Persetujuan" quick-filter chip label.
// Kasir is untouched: it still has its own standalone Approval Repair page
// and doesn't need this (no Data Service nav entry to badge).
//
// Sidebar and Data Service each mount their own instance of this hook (no
// shared context), so a plain 30s poll would leave the sidebar badge showing
// a stale count for up to 30s right after Data Service approves one —
// dispatchPendingRepairApprovalRefresh() lets the action that just resolved
// the approval tell every mounted instance to re-poll immediately.

import { useEffect, useState } from "react";
import { Api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const POLL_INTERVAL_MILLIS = 30_000;
const REFRESH_EVENT_NAME = "jyp:pending-repair-approval-refresh";

/** Call right after an approveRepair mutation resolves, so the sidebar badge and the Data Service quick-filter count don't wait out the next 30s poll. */
export function dispatchPendingRepairApprovalRefresh(): void {
  window.dispatchEvent(new Event(REFRESH_EVENT_NAME));
}

export function usePendingRepairApprovalCount(): number {
  const { user: currentUser } = useAuth();
  const [count, setCount] = useState(0);
  const isEligibleRole = currentUser?.role === "owner" || currentUser?.role === "kepala_cabang";

  useEffect(() => {
    if (!isEligibleRole) {
      setCount(0);
      return;
    }
    let isCancelled = false;
    const poll = async (): Promise<void> => {
      try {
        const response = await Api.service.pendingApproval({ limit: 50 });
        if (!isCancelled) setCount(response.data.length);
      } catch {
        /* silent — a stale/missing badge count must never disturb the UI */
      }
    };
    void poll();
    const intervalHandle = setInterval(() => void poll(), POLL_INTERVAL_MILLIS);
    const onRefreshRequested = (): void => void poll();
    window.addEventListener(REFRESH_EVENT_NAME, onRefreshRequested);
    return () => {
      isCancelled = true;
      clearInterval(intervalHandle);
      window.removeEventListener(REFRESH_EVENT_NAME, onRefreshRequested);
    };
  }, [isEligibleRole]);

  return count;
}
