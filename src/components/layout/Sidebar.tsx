"use client";

// Role-based sidebar. Reads the current user's role from AuthContext and
// renders `navigationByRole[role]` as a list of Next.js links.
//
// FBUG-021 fix in the original code added a client-side gate on `navigate()`;
// with the App Router we do the equivalent in the (app) layout guard —
// this file only renders the menu that the user is allowed to see.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationByRole } from "@/lib/config/nav";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/lib/icons";

interface SidebarProps {
  /** Closes the mobile drawer after a click. Ignored on desktop. */
  onNavigateFromMobile?: () => void;
}

export function Sidebar({ onNavigateFromMobile }: SidebarProps): JSX.Element | null {
  const { user: currentUser } = useAuth();
  const currentPathname = usePathname();

  if (!currentUser) return null;
  const menuEntries = navigationByRole[currentUser.role] ?? [];

  return (
    <nav aria-label="Menu utama" className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      {menuEntries.map((menuEntry) => {
        const isActiveEntry = currentPathname === `/${menuEntry.pageKey}` || currentPathname.startsWith(`/${menuEntry.pageKey}/`);
        return (
          <Link
            key={menuEntry.pageKey}
            href={`/${menuEntry.pageKey}`}
            onClick={onNavigateFromMobile}
            className={`nav-link ${isActiveEntry ? "active" : ""}`}
          >
            <div className="icon-container rounded-xl bg-white p-2">
              <Icon name={menuEntry.iconName} className="block h-4 w-4" />
            </div>
            <span>{menuEntry.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
