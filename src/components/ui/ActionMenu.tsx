"use client";

// Reusable "⋯" context menu for table-row actions — the pattern used by
// Manajemen Stok to keep Detail always visible while less-frequent /
// destructive actions (Edit Harga, Hapus) sit one click deeper. Follows the
// same visual language as the notification panel and avatar menu already in
// this app (rounded-jp-sm border, shadow-jp-overlay, bg-jp-surface).
//
// Renders its panel through a portal into document.body, positioned with
// getBoundingClientRect() off the trigger button — table rows commonly sit
// inside an `overflow-x-auto`/`overflow-hidden` wrapper (Manajemen Stok's
// does), and an inline `position: absolute` popover would get clipped by
// that ancestor for any row near its edge. Fixed-position + portal sidesteps
// that entirely, at the cost of tracking scroll/resize to close instead of
// re-anchoring — closing is simpler and good enough for a short-lived menu.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  /** Renders the item in the app's danger color — for irreversible actions like delete. */
  destructive?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
}

const MENU_WIDTH = 168;
const ITEM_HEIGHT = 40;
const VIEWPORT_MARGIN = 8;

export function ActionMenu({ items, ariaLabel = "Menu aksi lainnya" }: ActionMenuProps): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = (): void => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedMenuHeight = items.length * ITEM_HEIGHT + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= estimatedMenuHeight + VIEWPORT_MARGIN
      ? rect.bottom + 4
      : Math.max(VIEWPORT_MARGIN, rect.top - estimatedMenuHeight - 4);
    const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN));
    setPosition({ top, left });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const closeMenu = (): void => setIsOpen(false);
    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    // Capture phase so this also fires for scroll inside the table's own
    // overflow-x-auto wrapper, not just window-level scroll.
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [isOpen]);

  if (!items.length) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className="flex h-8 w-8 items-center justify-center rounded-jp-sm text-[#aaa9a6] transition-colors hover:bg-[#29292a] hover:text-[#f8f7f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a1f]"
      >
        <span aria-hidden="true" className="text-base font-bold leading-none">&#8943;</span>
      </button>

      {isOpen && position && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ position: "fixed", top: position.top, left: position.left, width: MENU_WIDTH }}
              className="z-50 overflow-hidden rounded-jp-sm border border-[#343436] bg-[#1c1c1d] p-1 text-[#f8f7f5] shadow-jp-overlay"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className={
                    "block w-full rounded-jp-xs px-3 py-2.5 text-left text-xs transition-colors hover:bg-jp-surface-subtle dark:hover:bg-jp-surface-subtle-dark " +
                    (item.destructive ? "text-jp-danger dark:text-jp-danger-dark" : "text-jp-text dark:text-jp-text-dark")
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
