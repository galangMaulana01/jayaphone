"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationByRole } from "@/lib/config/nav";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/lib/icons";
import { UserAvatar } from "./UserAvatar";

interface SidebarProps {
  onNavigateFromMobile?: () => void;
  onCloseMobileDrawer?: () => void;
}

export function Sidebar({ onNavigateFromMobile, onCloseMobileDrawer }: SidebarProps): JSX.Element | null {
  const { user: currentUser } = useAuth();
  const currentPathname = usePathname();

  if (!currentUser) return null;
  const menuEntries = navigationByRole[currentUser.role] ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-jp-surface text-jp-text dark:bg-jp-surface-dark dark:text-jp-text-dark">
      <div className="flex h-20 items-center justify-between border-b border-jp-border px-5 dark:border-jp-border-dark">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-jp-teal text-jp-text">
            <Icon name="smartphoneSvg" className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Jayaphone</p>
            <p className="truncate text-[11px] font-medium text-jp-muted dark:text-jp-muted-dark">Cabang {currentUser.cabang || "-"}</p>
          </div>
        </div>
        {onCloseMobileDrawer ? (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-jp-muted transition-colors hover:bg-jp-surface-subtle focus:outline-none focus:ring-2 focus:ring-jp-teal/50 dark:text-jp-muted-dark dark:hover:bg-jp-surface-subtle-dark"
            aria-label="Tutup menu"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        ) : null}
      </div>

      <nav aria-label="Menu utama" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[11px] font-medium text-jp-muted dark:text-jp-muted-dark">Navigasi</p>
        <div className="space-y-1">
          {menuEntries.map((menuEntry) => {
            const pagePath = "/" + menuEntry.pageKey;
            const isActiveEntry = currentPathname === pagePath || currentPathname.startsWith(pagePath + "/");
            const linkClassName = isActiveEntry
              ? "bg-jp-teal-soft text-jp-text dark:bg-jp-teal-soft-dark dark:text-jp-text-dark"
              : "text-jp-muted hover:bg-jp-surface-subtle hover:text-jp-text dark:text-jp-muted-dark dark:hover:bg-jp-surface-subtle-dark dark:hover:text-jp-text-dark";
            const iconClassName = isActiveEntry ? "bg-jp-teal text-jp-text" : "text-current";

            return (
              <Link
                key={menuEntry.pageKey}
                href={pagePath}
                onClick={onNavigateFromMobile}
                className={"flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-jp-teal/50 " + linkClassName}
              >
                <span className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " + iconClassName}>
                  <Icon name={menuEntry.iconName} className="h-4 w-4" />
                </span>
                <span className="min-w-0 truncate">{menuEntry.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-jp-border p-4 dark:border-jp-border-dark">
        <div className="flex items-center gap-3">
          <UserAvatar fotoProfileUrl={currentUser.foto_profil_url} altText={currentUser.name} sizeClassName="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold">{currentUser.name}</p>
            <p className="truncate text-[11px] text-jp-muted dark:text-jp-muted-dark">{currentUser.role.replace(/_/g, " ")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
