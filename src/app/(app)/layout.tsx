"use client";

// Protected layout for every authenticated page.
// Wraps children in a sidebar + top header, and enforces two guards:
//   1. If AuthContext status is "unauthenticated", replace to /login.
//   2. If the current pageKey isn't in NAV[role], show an Access Denied
//      screen (defense-in-depth, matches the frontend FBUG-021 fix).

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
    if (authStatus === "unauthenticated") {
      router.replace("/login");
    }
  }, [authStatus, router]);

  // ── Loading splash while /auth/me resolves ────────────────────────
  if (authStatus === "restoring" || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md">
          <LoadingSkeleton numberOfRows={6} />
        </div>
      </div>
    );
  }

  const currentPageKey = currentPathname.replace(/^\//, "").split("/")[0] || "";
  const isCurrentPageAllowed =
    currentPageKey === "" || isPageAllowedForRole(currentUser.role, currentPageKey);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-divider bg-white md:flex md:flex-col dark:bg-zinc-900/60">
        <div className="border-b border-divider px-4 py-4">
          <p className="text-sm font-semibold tracking-tight">Jayaphone</p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Cabang {currentUser.cabang || "-"}
          </p>
        </div>
        <div className="flex-1">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      {isMobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-divider bg-white shadow-xl md:hidden dark:bg-zinc-900">
            <div className="border-b border-divider px-4 py-4">
              <p className="text-sm font-semibold tracking-tight">Jayaphone</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Cabang {currentUser.cabang || "-"}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar onNavigateFromMobile={() => setIsMobileSidebarOpen(false)} />
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <AppHeader onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 animate-fade-up p-6 md:p-8">
          {isCurrentPageAllowed ? (
            children
          ) : (
            <ErrorState
              message={`Halaman "${currentPageKey}" tidak tersedia untuk role ${currentUser.role}.`}
              onRetry={() => {
                const fallbackPageKey =
                  navigationByRole[currentUser.role]?.[0]?.pageKey ?? landingPageByRole[currentUser.role];
                router.replace(`/${fallbackPageKey}`);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
