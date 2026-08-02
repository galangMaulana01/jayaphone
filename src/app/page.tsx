"use client";

// Root ("/") page — pure redirect gate.
//
// Depending on the AuthContext status we send the user to either /login or
// to their role's landing page. This mirrors the legacy IIFE at the bottom
// of index.html.bak that called API.auth.me() on boot and then routed via
// navigate(first[user.role]).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { landingPageByRole } from "@/lib/config/nav";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function RootRedirectPage(): JSX.Element {
  const { status: authStatus, user: currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (authStatus === "authenticated" && currentUser) {
      const landingPageKey = landingPageByRole[currentUser.role] ?? "settings";
      router.replace(`/${landingPageKey}`);
    }
  }, [authStatus, currentUser, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md">
        <LoadingSkeleton numberOfRows={5} />
      </div>
    </div>
  );
}
