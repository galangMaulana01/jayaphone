"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { navigationByRole, type NavigationChild, type NavigationEntry } from "@/lib/config/nav";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingRepairApprovalCount } from "@/hooks/usePendingRepairApprovalCount";
import { Icon } from "@/lib/icons";
import { NOT_SET } from "@/lib/utils/formatters";
import { UserAvatar } from "./UserAvatar";

interface SidebarProps {
  onNavigateFromMobile?: () => void;
  onCloseMobileDrawer?: () => void;
}

function splitHref(href: string): { pathname: string; search: string } {
  const questionMarkIndex = href.indexOf("?");
  return questionMarkIndex === -1
    ? { pathname: href, search: "" }
    : { pathname: href.slice(0, questionMarkIndex), search: href.slice(questionMarkIndex + 1) };
}

/**
 * Which child of a dropdown group is "active" for the current URL.
 * Children carrying a query string (e.g. "?tab=tersedia") match when every
 * one of their params is present with the same value in the current search
 * — a subset match, not exact equality, so unrelated params (e.g. a date
 * filter) don't break the highlight. A bare child (no query, e.g. "Daftar
 * Customer") matches only when none of its siblings' distinguishing keys
 * (tab/status/sort/filter) are present, so it acts as the group's default.
 */
function findActiveChildKey(children: NavigationChild[], currentPathname: string, currentSearch: string): string | null {
  const currentParams = new URLSearchParams(currentSearch);
  const taggedChildren = children.filter((child) => splitHref(child.href).search !== "");
  const bareChildren = children.filter((child) => splitHref(child.href).search === "");

  for (const child of taggedChildren) {
    const { pathname, search } = splitHref(child.href);
    if (pathname !== currentPathname) continue;
    const childParams = new URLSearchParams(search);
    let matchesAll = true;
    childParams.forEach((value, key) => {
      if (currentParams.get(key) !== value) matchesAll = false;
    });
    if (matchesAll) return child.key;
  }

  const taggedKeys = new Set<string>();
  taggedChildren.forEach((child) => {
    new URLSearchParams(splitHref(child.href).search).forEach((_value, key) => taggedKeys.add(key));
  });
  for (const child of bareChildren) {
    if (splitHref(child.href).pathname !== currentPathname) continue;
    const hasAnyTaggedParam = Array.from(taggedKeys).some((key) => currentParams.has(key));
    if (!hasAnyTaggedParam) return child.key;
  }

  return null;
}

function groupContainsCurrentPage(entry: NavigationEntry, currentPathname: string): boolean {
  if (entry.pageKey && ("/" + entry.pageKey) === currentPathname) return true;
  return (entry.children ?? []).some((child) => splitHref(child.href).pathname === currentPathname);
}

// useSearchParams() (below) requires a Suspense boundary in the app-router —
// wrapped here so every call site (desktop <aside>, mobile drawer) gets it
// for free instead of needing to remember it themselves.
export function Sidebar(props: SidebarProps): JSX.Element {
  return (
    <Suspense fallback={null}>
      <SidebarInner {...props} />
    </Suspense>
  );
}

function SidebarInner({ onNavigateFromMobile, onCloseMobileDrawer }: SidebarProps): JSX.Element | null {
  const { user: currentUser } = useAuth();
  const currentPathname = usePathname();
  // Same source of truth as every page's own tab state (see useUrlParam) —
  // reading the URL reactively here, instead of a locally-tracked copy,
  // is what guarantees the sidebar's active child can never disagree with
  // what the page itself is showing, regardless of how the navigation
  // happened (Link click, back/forward, or a full reload).
  const currentSearch = useSearchParams().toString();
  const [expandedGroupLabels, setExpandedGroupLabels] = useState<Set<string>>(new Set());
  // Zero-click discovery for the pending-repair-approval count that used to
  // live on its own "Approval Repair" sidebar item (owner/kepala_cabang only
  // — see nav.ts). Returns 0 for every other role, so the lookup below is a
  // no-op for them.
  const pendingRepairApprovalCount = usePendingRepairApprovalCount();
  const badgeCountByPageKey: Record<string, number> = { service: pendingRepairApprovalCount };

  const menuEntries = navigationByRole[currentUser?.role ?? "owner"] ?? [];

  useEffect(() => {
    setExpandedGroupLabels((previouslyExpanded) => {
      const next = new Set(previouslyExpanded);
      let changed = false;
      menuEntries.forEach((entry) => {
        if (entry.children && groupContainsCurrentPage(entry, currentPathname) && !next.has(entry.label)) {
          next.add(entry.label);
          changed = true;
        }
      });
      return changed ? next : previouslyExpanded;
    });
    // menuEntries is derived from currentUser.role, stable per session — only
    // re-run this auto-expand when the actual route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPathname]);

  if (!currentUser) return null;

  const toggleGroup = (label: string): void => {
    setExpandedGroupLabels((previouslyExpanded) => {
      const next = new Set(previouslyExpanded);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#1d2026] text-slate-100">
      <div className="flex h-14 items-center justify-between border-b border-[#2a2f37] px-4">
        {/*
         * Ini web pribadi — user sudah tahu app-nya apa, jadi kita drop
         * label "Jayaphone" dari header sidebar. Sisakan hanya
         * identitas cabang yang benar-benar informatif per session.
         */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Cabang aktif</p>
            <p className="truncate text-sm font-semibold tracking-[-0.01em]">{currentUser.cabang || NOT_SET}</p>
          </div>
        </div>
        {onCloseMobileDrawer ? (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="flex h-10 w-10 items-center justify-center rounded-jp-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a1f]"
            aria-label="Tutup menu"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        ) : null}
      </div>

      <nav aria-label="Menu utama" className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <p className="sr-only">Navigasi</p>
        <div className="space-y-1">
          {menuEntries.map((menuEntry) => {
            const hasOwnPage = Boolean(menuEntry.pageKey);
            const pagePath = hasOwnPage ? "/" + menuEntry.pageKey : null;
            const isOwnPageActive = hasOwnPage ? (currentPathname === pagePath || currentPathname.startsWith(pagePath + "/")) : false;
            const badgeCount = menuEntry.pageKey ? badgeCountByPageKey[menuEntry.pageKey] ?? 0 : 0;

            if (!menuEntry.children) {
              const linkClassName = isOwnPageActive
                ? "bg-[#ff5a1f] text-white shadow-[0_6px_18px_rgba(255,90,31,0.22)] ring-1 ring-[#ff5a1f]/35"
                : "text-slate-400 hover:bg-white/5 hover:text-white";
              return (
                <Link
                  key={menuEntry.label}
                  href={pagePath as string}
                  onClick={onNavigateFromMobile}
                  className={"nav-link min-h-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a1f] " + linkClassName}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-current">
                    <Icon name={menuEntry.iconName} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{menuEntry.label}</span>
                  {badgeCount > 0 && (
                    <span
                      className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-jp-danger px-1.5 text-[10px] font-semibold text-white"
                      aria-label={`${badgeCount} menunggu persetujuan`}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              );
            }

            const isExpanded = expandedGroupLabels.has(menuEntry.label);
            const activeChildKey = findActiveChildKey(menuEntry.children, currentPathname, currentSearch);
            const isGroupActive = isOwnPageActive || activeChildKey !== null;
            const groupRowClassName = isGroupActive && !isExpanded
              ? "bg-[#ff5a1f] text-white shadow-[0_6px_18px_rgba(255,90,31,0.22)] ring-1 ring-[#ff5a1f]/35"
              : "text-slate-400 hover:bg-white/5 hover:text-white";

            return (
              <div key={menuEntry.label}>
                <div className={"nav-link min-h-10 " + groupRowClassName}>
                  {hasOwnPage ? (
                    <Link
                      href={pagePath as string}
                      onClick={onNavigateFromMobile}
                      className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-current">
                        <Icon name={menuEntry.iconName} className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-left">{menuEntry.label}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleGroup(menuEntry.label)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-current">
                        <Icon name={menuEntry.iconName} className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{menuEntry.label}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleGroup(menuEntry.label)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? `Tutup grup ${menuEntry.label}` : `Buka grup ${menuEntry.label}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-jp-sm text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a1f]"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      className={"h-4 w-4 transition-transform duration-150 " + (isExpanded ? "rotate-90" : "")}
                      aria-hidden="true"
                    >
                      <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-1 space-y-1 border-l border-white/10 pl-4">
                    {menuEntry.children.map((child) => {
                      const isChildActive = activeChildKey === child.key;
                      const childClassName = isChildActive
                        ? "bg-[#ff5a1f]/15 text-[#ff8a61] font-semibold"
                        : "text-slate-400 hover:bg-white/5 hover:text-white";
                      return (
                        <Link
                          key={child.key}
                          href={child.href}
                          onClick={onNavigateFromMobile}
                          className={"flex min-h-9 items-center rounded-jp-sm px-3 py-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a1f] " + childClassName}
                        >
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[#2a2f37] p-4">
        <div className="flex items-center gap-3">
          <UserAvatar fotoProfileUrl={currentUser.foto_profil_url} altText={currentUser.name} sizeClassName="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold">{currentUser.name}</p>
            <p className="truncate text-[11px] text-slate-400">{currentUser.role.replace(/_/g, " ")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
