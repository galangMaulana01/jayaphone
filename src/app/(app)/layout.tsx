"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAuth } from "@/contexts/AuthContext";
import { isPageAllowedForRole, landingPageByRole, navigationByRole } from "@/lib/config/nav";

export default function AuthenticatedAppLayout({ children }: { children: ReactNode }): JSX.Element {
  const { status: authStatus, user: currentUser } = useAuth();
  const currentPathname = usePathname();
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileSidebarOpen]);

  if (authStatus === "restoring" || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#17191d] p-6 text-slate-100">
        <div className="w-full max-w-md">
          <LoadingSkeleton numberOfRows={6} />
        </div>
      </div>
    );
  }

  const currentPageKey = currentPathname.replace(/^\//, "").split("/")[0] || "";
  const isCurrentPageAllowed = currentPageKey === "" || isPageAllowedForRole(currentUser.role, currentPageKey);

  return (
    <div className="app-workspace flex min-h-screen bg-[#F5F7FC] text-[#162D68]">
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-r border-[#E3E8F7] md:flex md:flex-col">
        <Sidebar />
      </aside>

      {isMobileSidebarOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Tutup menu"
          />
          <aside id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigasi mobile" className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-[#2a2f37] bg-[#1d2026] shadow-jp-overlay md:hidden">
            <Sidebar
              onNavigateFromMobile={() => setIsMobileSidebarOpen(false)}
              onCloseMobileDrawer={() => setIsMobileSidebarOpen(false)}
            />
          </aside>
        </>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />
        <main className="mx-auto w-full max-w-[1440px] flex-1 animate-fade-up p-4 sm:p-5 md:px-7 md:py-6">
          {isCurrentPageAllowed ? (
            children
          ) : (
            <ErrorState
              message={"Halaman \"" + currentPageKey + "\" tidak tersedia untuk role " + currentUser.role + "."}
              onRetry={() => {
                const fallbackPageKey = navigationByRole[currentUser.role]?.[0]?.pageKey ?? landingPageByRole[currentUser.role];
                router.replace("/" + fallbackPageKey);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
