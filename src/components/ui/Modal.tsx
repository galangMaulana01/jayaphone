"use client";

// Modal primitive — replaces the legacy openModal/closeModal pair.
// Consumers own the isOpen state; we only render the shell.
//
// UX audit 2026-08-07: previously this unmounted instantly on close with no
// transition at all (isOpen=false -> return null, no exit animation). Now
// the backdrop fades and the dialog fades+scales in on both open AND close —
// `shouldRender` keeps the DOM mounted for one transition duration after
// `isOpen` flips false so the exit actually gets to play out.

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

// DESIGN.md §9 — motion durations sit in the 120–220ms range app-wide.
const TRANSITION_MS = 180;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Optional max width class, e.g. "max-w-2xl". Default is "max-w-lg". */
  maxWidthClassName?: string;
  /** Hide the "×" corner button — use when the body already has an explicit close action (e.g. "Tutup" alongside another button), so there's only one way to close, not two. */
  hideCloseButton?: boolean;
  children: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidthClassName = "max-w-lg",
  hideCloseButton = false,
  children,
}: ModalProps): JSX.Element | null {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Mount first with the "hidden" state, then flip to visible on the next
      // frame so the browser actually has something to transition from.
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsVisible(false);
    const timeout = setTimeout(() => setShouldRender(false), TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!shouldRender) return;
    const handleEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [shouldRender, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 transition-opacity duration-[180ms] ease-out motion-reduce:transition-none sm:items-center sm:p-4 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={(clickEvent) => {
        // Close when clicking the backdrop, not the inner card.
        if (clickEvent.target === clickEvent.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${maxWidthClassName} max-h-[92vh] overflow-y-auto rounded-t-jp-lg border border-jp-border bg-jp-surface p-5 shadow-jp-modal transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transition-none sm:rounded-jp-lg sm:p-6 dark:border-jp-border-dark dark:bg-jp-surface-dark ${
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.98] opacity-0 sm:translate-y-0"
        }`}
      >
        {(title || subtitle) && (
          <div className="mb-5 flex items-start justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold tracking-[-0.015em] text-jp-text dark:text-jp-text-dark">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs text-jp-muted dark:text-jp-muted-dark">{subtitle}</p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="-mr-1 -mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-jp-sm text-jp-muted transition-colors hover:bg-jp-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a1f] dark:text-jp-muted-dark dark:hover:bg-jp-surface-subtle-dark"
                aria-label="Tutup modal"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
