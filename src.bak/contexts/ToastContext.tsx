"use client";

// Toast provider — a lightweight queue of transient notifications.
//
// Mirrors the behaviour of the legacy `showToast(msg, type)` global from
// index.html.bak: fire-and-forget, auto-dismiss after ~3.2 seconds, three
// visual variants (success / error / info). Instead of appending DOM nodes
// imperatively, we hold the queue in React state and let a portal-like
// <ToastViewport> below render them.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/lib/icons";

export type ToastVariant = "success" | "error" | "info";

interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DISMISS_MILLIS = 3_200;

let toastEntryIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [activeToasts, setActiveToasts] = useState<ToastEntry[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "success"): void => {
    toastEntryIdCounter += 1;
    const newEntryId = toastEntryIdCounter;
    setActiveToasts((previousList) => [...previousList, { id: newEntryId, message, variant }]);
    // Auto-dismiss after the standard interval.
    setTimeout(() => {
      setActiveToasts((previousList) => previousList.filter((entry) => entry.id !== newEntryId));
    }, TOAST_DISMISS_MILLIS);
  }, []);

  const contextValue = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastViewport toastEntries={activeToasts} />
    </ToastContext.Provider>
  );
}

interface ToastViewportProps {
  toastEntries: ToastEntry[];
}

function ToastViewport({ toastEntries }: ToastViewportProps): JSX.Element {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2"
      aria-live="polite"
      role="status"
    >
      {toastEntries.map((toastEntry) => (
        <div
          key={toastEntry.id}
          className={`toast toast-${toastEntry.variant} pointer-events-auto flex max-w-xs items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-medium`}
        >
          <ToastIcon variant={toastEntry.variant} />
          <span>{toastEntry.message}</span>
        </div>
      ))}
    </div>
  );
}

function ToastIcon({ variant }: { variant: ToastVariant }): JSX.Element {
  // Reuse existing icons from the migrated library — checkCircleSvg for success,
  // warningSvg for error, and packageSvg (info-like) for info. Sized via Tailwind.
  const iconNameByVariant: Record<ToastVariant, string> = {
    success: "checkCircleSvg",
    error: "warningSvg",
    info: "packageSvg",
  };
  return <Icon name={iconNameByVariant[variant]} className="h-3.5 w-3.5 flex-shrink-0" />;
}

/** Hook — throws if used outside <ToastProvider>. */
export function useToast(): ToastContextValue {
  const contextValue = useContext(ToastContext);
  if (!contextValue) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return contextValue;
}
