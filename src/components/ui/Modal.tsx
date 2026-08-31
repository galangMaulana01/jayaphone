"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

const TRANSITION_MS = 180;
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Optional max width class, e.g. "max-w-2xl". Default is "max-w-lg". */
  maxWidthClassName?: string;
  /** Hide the corner close control when the modal body owns an explicit exit action. */
  hideCloseButton?: boolean;
  children: ReactNode;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
  );
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
  const dialogElementRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setShouldRender(true);
      const raf = requestAnimationFrame(() => {
        setIsVisible(true);
        dialogElementRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    previouslyFocusedElement.current?.focus();
    const timeout = setTimeout(() => setShouldRender(false), TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (keyboardEvent: KeyboardEvent): void => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault();
        onClose();
        return;
      }
      if (keyboardEvent.key !== "Tab") return;

      const dialogElement = dialogElementRef.current;
      if (!dialogElement) return;
      const focusableElements = getFocusableElements(dialogElement);
      if (!focusableElements.length) {
        keyboardEvent.preventDefault();
        dialogElement.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      if (keyboardEvent.shiftKey && (activeElement === firstFocusableElement || activeElement === dialogElement)) {
        keyboardEvent.preventDefault();
        lastFocusableElement.focus();
      } else if (!keyboardEvent.shiftKey && activeElement === lastFocusableElement) {
        keyboardEvent.preventDefault();
        firstFocusableElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 transition-opacity duration-[180ms] ease-out motion-reduce:transition-none sm:items-center sm:p-4 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={(clickEvent) => {
        if (clickEvent.target === clickEvent.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogElementRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Dialog"}
        tabIndex={-1}
        className={`w-full ${maxWidthClassName} max-h-[92vh] overflow-y-auto rounded-t-jp-lg border border-jp-border bg-jp-surface p-5 shadow-jp-modal transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transition-none sm:rounded-jp-lg sm:p-6 dark:border-jp-border-dark dark:bg-jp-surface-dark ${
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.98] opacity-0 sm:translate-y-0"
        }`}
      >
        {(title || subtitle) && (
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              {title && <h3 id={titleId} className="text-lg font-semibold tracking-[-0.015em] text-jp-text dark:text-jp-text-dark">{title}</h3>}
              {subtitle && <p className="mt-0.5 text-xs text-jp-muted dark:text-jp-muted-dark">{subtitle}</p>}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-jp-sm text-jp-muted transition-colors hover:bg-jp-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a1f] dark:text-jp-muted-dark dark:hover:bg-jp-surface-subtle-dark"
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
