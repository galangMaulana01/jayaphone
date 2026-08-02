"use client";

// Top header bar shown on every protected page.
// Contains: mobile drawer toggle, page title, notification bell, theme
// toggle, avatar, logout.
//
// The bell + notification panel from the legacy NOTIF singleton lives in a
// separate component so this file stays focused on layout.

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { pageMetadataByKey } from "@/lib/config/nav";
import { UserAvatar } from "./UserAvatar";
import { NotificationBell } from "./NotificationBell";

interface AppHeaderProps {
  onOpenMobileSidebar: () => void;
}

export function AppHeader({ onOpenMobileSidebar }: AppHeaderProps): JSX.Element {
  const { user: currentUser, logOut } = useAuth();
  const { currentTheme, toggleTheme } = useTheme();
  const currentPathname = usePathname();
  const router = useRouter();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState<boolean>(false);

  // The first segment of the current pathname is the pageKey. Root ("/") never
  // renders under this layout because the (app) group guards redirect there.
  const currentPageKey = currentPathname.replace(/^\//, "").split("/")[0] || "";
  const pageTitle = pageMetadataByKey[currentPageKey]?.title ?? "";

  const handleLogout = (): void => {
    logOut();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-divider bg-white/80 px-4 backdrop-blur-md dark:bg-zinc-950/80 md:px-6">
      {/* Left: mobile menu toggle + page title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Buka menu"
          onClick={onOpenMobileSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 md:hidden dark:hover:bg-zinc-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">{pageTitle}</h1>
      </div>

      {/* Right: bell + theme + avatar */}
      <div className="flex items-center gap-2">
        <NotificationBell />
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label={currentTheme === "dark" ? "Ubah ke tema terang" : "Ubah ke tema gelap"}
        >
          {currentTheme === "dark" ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8-9h1M3 12h1m14.66-6.66l.7-.7M4.64 19.36l.7-.7m0-13.32l-.7-.7m14.66 14.66l-.7-.7M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Avatar with dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAvatarMenuOpen((wasOpen) => !wasOpen)}
            className="flex items-center gap-2 rounded-xl p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Menu akun"
          >
            <UserAvatar
              fotoProfileUrl={currentUser?.foto_profil_url}
              altText={currentUser?.name ?? "Profil pengguna"}
              sizeClassName="h-8 w-8"
            />
            <div className="hidden text-left sm:block">
              <p className="text-xs font-medium leading-none text-zinc-800 dark:text-zinc-100">
                {currentUser?.name ?? ""}
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{currentUser?.role ?? ""}</p>
            </div>
          </button>

          {isAvatarMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              onMouseLeave={() => setIsAvatarMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  router.push("/settings");
                }}
                className="block w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                Pengaturan Profil
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
