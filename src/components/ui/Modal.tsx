"use client";

// Modal primitive — replaces the legacy openModal/closeModal pair.
// Consumers own the isOpen state; we only render the shell.

import type { ReactNode } from "react";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Optional max width class, e.g. "max-w-2xl". Default is "max-w-lg". */
  maxWidthClassName?: string;
  children: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidthClassName = "max-w-lg",
  children,
}: ModalProps): JSX.Element | null {
  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={(clickEvent) => {
        // Close when clicking the backdrop, not the inner card.
        if (clickEvent.target === clickEvent.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${maxWidthClassName} max-h-[92vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl dark:bg-zinc-900`}
      >
        {(title || subtitle) && (
          <div className="mb-5 flex items-start justify-between">
            <div>
              {title && (
                <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 -mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-800"
              aria-label="Tutup modal"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
