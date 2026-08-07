"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { pageMetadataByKey } from "@/lib/config/nav";
import { UserAvatar } from "./UserAvatar";
import { NotificationBell } from "./NotificationBell";

interface AppHeaderProps {
  onOpenMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export function AppHeader({ onOpenMobileSidebar, isMobileSidebarOpen }: AppHeaderProps): JSX.Element {
  const { user: currentUser, logOut } = useAuth();
  const { currentTheme, toggleTheme } = useTheme();
  const currentPathname = usePathname();
  const router = useRouter();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState<boolean>(false);

  const currentPageKey = currentPathname.replace(/^\//, "").split("/")[0] || "";
  const pageTitle = pageMetadataByKey[currentPageKey]?.title ?? "";

  const handleLogout = (): void => {
    logOut();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-jp-border bg-jp-surface px-4 dark:border-jp-border-dark dark:bg-jp-app-dark md:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Buka menu"
          aria-expanded={isMobileSidebarOpen}
          aria-controls="mobile-navigation"
          onClick={onOpenMobileSidebar}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-jp-sm text-jp-muted transition-colors hover:bg-jp-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-teal md:hidden dark:text-jp-muted-dark dark:hover:bg-jp-surface-subtle-dark"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="truncate text-sm font-medium tracking-[-0.01em] text-jp-muted dark:text-jp-muted-dark">{pageTitle}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <NotificationBell />
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-11 w-11 items-center justify-center rounded-jp-sm text-jp-muted transition-colors hover:bg-jp-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-teal dark:text-jp-muted-dark dark:hover:bg-jp-surface-subtle-dark"
          aria-label={currentTheme === "dark" ? "Ubah ke tema terang" : "Ubah ke tema gelap"}
        >
          {currentTheme === "dark" ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m8-9h1M3 12h1m14.66-6.66l.7-.7M4.64 19.36l.7-.7m0-13.32l-.7-.7m14.66 14.66l-.7-.7M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <div className="relative pl-1">
          <button
            type="button"
            onClick={() => setIsAvatarMenuOpen((wasOpen) => !wasOpen)}
            className="flex min-h-11 items-center gap-2 rounded-jp-sm px-1.5 py-1 transition-colors hover:bg-jp-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-teal dark:hover:bg-jp-surface-subtle-dark"
            aria-label="Menu akun"
            aria-expanded={isAvatarMenuOpen}
          >
            <UserAvatar fotoProfileUrl={currentUser?.foto_profil_url} altText={currentUser?.name ?? "Profil pengguna"} sizeClassName="h-8 w-8" />
            <div className="hidden text-left sm:block">
              <p className="text-xs font-medium leading-none text-jp-text dark:text-jp-text-dark">{currentUser?.name ?? ""}</p>
              <p className="mt-1 text-[10px] text-jp-muted dark:text-jp-muted-dark">{currentUser?.role?.replace(/_/g, " ") ?? ""}</p>
            </div>
          </button>

          {isAvatarMenuOpen ? (
            <div
              className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-jp-sm border border-jp-border bg-jp-surface p-1 shadow-jp-overlay dark:border-jp-border-dark dark:bg-jp-surface-dark"
              onMouseLeave={() => setIsAvatarMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  router.push("/settings");
                }}
                className="block w-full rounded-jp-xs px-3 py-2.5 text-left text-xs text-jp-text transition-colors hover:bg-jp-surface-subtle dark:text-jp-text-dark dark:hover:bg-jp-surface-subtle-dark"
              >
                Pengaturan Profil
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-jp-xs px-3 py-2.5 text-left text-xs text-jp-danger transition-colors hover:bg-jp-danger-soft dark:text-jp-danger-dark dark:hover:bg-jp-danger/15"
              >
                Keluar
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
