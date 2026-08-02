"use client";

// Authentication context — holds the logged-in user and exposes the
// login/logout/refresh methods used by every protected page.
//
// Design notes:
//   • Restore-on-mount: the provider mounts, reads the token from
//     localStorage, calls /auth/me, and populates `user`. During that
//     round-trip `status === "restoring"`, so page code should render a
//     splash rather than redirecting to /login.
//   • Login: on success we store the token and the user snapshot, then set
//     status to "authenticated". Consumers can navigate immediately.
//   • Logout: we drop the token from localStorage AND clear the in-memory
//     user; a hard reload isn't necessary because the router will re-mount
//     everything under the (app) layout guard on the next navigate.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Api, ApiError } from "@/lib/api";
import { tokenStorage } from "@/lib/api/token";
import type { AuthenticatedUser } from "@/lib/types";

type AuthStatus = "restoring" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  logIn: (username: string, password: string) => Promise<void>;
  logOut: () => void;
  /** Force a fresh /auth/me round-trip (e.g. after updating the profile photo). */
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("restoring");
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);

  // ── Restore on mount ────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function restoreSession(): Promise<void> {
      const existingToken = tokenStorage.read();
      if (!existingToken) {
        if (isMounted) setAuthStatus("unauthenticated");
        return;
      }
      try {
        const response = await Api.auth.me();
        if (!isMounted) return;
        setCurrentUser(response.data);
        setAuthStatus("authenticated");
      } catch (restoreError) {
        // Any error during restore means the token is invalid; drop it silently.
        tokenStorage.clear();
        if (!isMounted) return;
        setCurrentUser(null);
        setAuthStatus("unauthenticated");
        if (!(restoreError instanceof ApiError)) {
          // Real network/parse errors still worth logging.
          console.warn("[AuthContext] session restore failed:", restoreError);
        }
      }
    }
    void restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const logIn = useCallback(async (username: string, password: string): Promise<void> => {
    const loginResponse = await Api.auth.login(username, password);
    tokenStorage.write(loginResponse.access_token);
    setCurrentUser(loginResponse.user);
    setAuthStatus("authenticated");
  }, []);

  const logOut = useCallback((): void => {
    tokenStorage.clear();
    setCurrentUser(null);
    setAuthStatus("unauthenticated");
  }, []);

  const refreshCurrentUser = useCallback(async (): Promise<void> => {
    const response = await Api.auth.me();
    setCurrentUser(response.data);
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({ status: authStatus, user: currentUser, logIn, logOut, refreshCurrentUser }),
    [authStatus, currentUser, logIn, logOut, refreshCurrentUser],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

/** Hook — throws if used outside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const contextValue = useContext(AuthContext);
  if (!contextValue) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return contextValue;
}
