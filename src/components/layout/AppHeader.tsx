"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

import { isPageAllowedForRole, pageMetadataByKey } from "@/lib/config/nav";
import { UserAvatar } from "./UserAvatar";
import { NotificationBell } from "./NotificationBell";

interface AppHeaderProps {
  onOpenMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export function AppHeader({ onOpenMobileSidebar, isMobileSidebarOpen }: AppHeaderProps): JSX.Element {
  const { user: currentUser, logOut } = useAuth();

  const currentPathname = usePathname();
  const router = useRouter();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState<boolean>(false);

  const currentPageKey = currentPathname.replace(/^\//, "").split("/")[0] || "";
  // Don't show the real page title's chrome when the role guard below is
  // about to render an access-denied body for this path — otherwise the
  // header confidently names a page the user is being told they can't see.
  const isPageAllowed = currentPageKey === "" || !currentUser || isPageAllowedForRole(currentUser.role, currentPageKey);
  const pageTitle = isPageAllowed ? pageMetadataByKey[currentPageKey]?.title ?? "" : "";

  const handleLogout = (): void => {
    logOut();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#2a2f37] bg-[#1d2026] px-4 md:px-6 lg:px-7">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Buka menu"
          aria-expanded={isMobileSidebarOpen}
          aria-controls="mobile-navigation"
          onClick={onOpenMobileSidebar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-jp-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a1f] md:hidden"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-100">{pageTitle}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <NotificationBell />

        <div className="relative pl-1">
          <button
            type="button"
            onClick={() => setIsAvatarMenuOpen((wasOpen) => !wasOpen)}
            className="flex min-h-10 items-center gap-2 rounded-jp-sm px-1.5 py-1 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a1f]"
            aria-label="Menu akun"
            aria-expanded={isAvatarMenuOpen}
          >
            <UserAvatar fotoProfileUrl={currentUser?.foto_profil_url} altText={currentUser?.name ?? "Profil pengguna"} sizeClassName="h-8 w-8" />
            <div className="hidden text-left sm:block">
              <p className="text-xs font-medium leading-none text-slate-100">{currentUser?.name ?? ""}</p>
              <p className="mt-1 text-[10px] text-slate-400">{currentUser?.role?.replace(/_/g, " ") ?? ""}</p>
            </div>
          </button>

          {isAvatarMenuOpen ? (
            <div
              className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-jp-sm border border-[#2a2f37] bg-[#1d2026] p-1 shadow-jp-overlay"
              onMouseLeave={() => setIsAvatarMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  router.push("/settings");
                }}
                className="block w-full rounded-jp-xs px-3 py-2.5 text-left text-xs text-slate-100 transition-colors hover:bg-white/5"
              >
                Pengaturan Profil
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-jp-xs px-3 py-2.5 text-left text-xs text-jp-danger-dark transition-colors hover:bg-jp-danger/15"
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
