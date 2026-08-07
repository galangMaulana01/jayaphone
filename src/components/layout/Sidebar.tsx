"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationByRole } from "@/lib/config/nav";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/lib/icons";
import { NOT_SET } from "@/lib/utils/formatters";
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
      <div className="flex h-[72px] items-center justify-between border-b border-jp-border px-4 dark:border-jp-border-dark">
        {/*
         * Ini web pribadi — user sudah tahu app-nya apa, jadi kita drop
         * label "Jayaphone" dari header sidebar. Sisakan hanya
         * identitas cabang yang benar-benar informatif per session.
         */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-jp-muted dark:text-jp-muted-dark">Cabang aktif</p>
            <p className="truncate text-sm font-semibold tracking-[-0.01em]">{currentUser.cabang || NOT_SET}</p>
          </div>
        </div>
        {onCloseMobileDrawer ? (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="flex h-11 w-11 items-center justify-center rounded-jp-sm text-jp-muted transition-colors hover:bg-jp-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-teal dark:text-jp-muted-dark dark:hover:bg-jp-surface-subtle-dark"
            aria-label="Tutup menu"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        ) : null}
      </div>

      <nav aria-label="Menu utama" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <p className="sr-only">Navigasi</p>
        <div className="space-y-1.5">
          {menuEntries.map((menuEntry) => {
            const pagePath = "/" + menuEntry.pageKey;
            const isActiveEntry = currentPathname === pagePath || currentPathname.startsWith(pagePath + "/");
            // v2 §5 — active item is a rounded-full pill (bukan highlight
            // kotak biasa), matching the Payflow-style sidebar reference.
            const linkClassName = isActiveEntry
              ? "bg-jp-text text-white dark:bg-jp-text-dark dark:text-jp-text"
              : "text-jp-muted hover:bg-jp-surface-subtle hover:text-jp-text dark:text-jp-muted-dark dark:hover:bg-jp-surface-subtle-dark dark:hover:text-jp-text-dark";
            const iconClassName = "text-current";

            return (
              <Link
                key={menuEntry.pageKey}
                href={pagePath}
                onClick={onNavigateFromMobile}
                className={"nav-link min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-teal " + linkClassName}
              >
                <span className={"flex h-8 w-8 shrink-0 items-center justify-center " + iconClassName}>
                  <Icon name={menuEntry.iconName} className="h-[18px] w-[18px]" />
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
