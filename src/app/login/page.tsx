"use client";

// Login page — replaces the `#page-login` section of index.html.bak plus its
// `doLogin()` handler.
//
// UX preserved from the legacy version:
//   • Both fields validated non-empty client-side before the request;
//   • Submit button shows a spinner + disables while pending;
//   • On success, we call ctx.logIn(username, password) which writes the
//     token and sets the AuthContext user, then we push to the role's
//     landing page (the root layout's redirect logic would work too, but
//     the explicit push keeps the transition snappy);
//   • On failure, the inline error banner shows the server-side message.

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { landingPageByRole } from "@/lib/config/nav";
import { LabelledInput } from "@/components/ui/InputField";
import { ApiError } from "@/lib/api";

export default function LoginPage(): JSX.Element {
  const { status: authStatus, user: currentUser, logIn } = useAuth();
  const router = useRouter();

  const [usernameFieldValue, setUsernameFieldValue] = useState<string>("");
  const [passwordFieldValue, setPasswordFieldValue] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // If a session already exists (e.g. user hit /login while logged in),
  // bounce them to their role's landing page.
  useEffect(() => {
    if (authStatus === "authenticated" && currentUser) {
      const landingPageKey = landingPageByRole[currentUser.role] ?? "settings";
      router.replace(`/${landingPageKey}`);
    }
  }, [authStatus, currentUser, router]);

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement>): Promise<void> => {
    formEvent.preventDefault();
    const trimmedUsername = usernameFieldValue.trim();
    const trimmedPassword = passwordFieldValue.trim();
    if (!trimmedUsername || !trimmedPassword) {
      setErrorMessage("Username dan password wajib diisi.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await logIn(trimmedUsername, trimmedPassword);
      // AuthContext has already set status="authenticated" and user; the
      // effect above will redirect on the next tick. Explicit push shaves
      // ~1 render off the transition.
      // Fresh read of the user might not be in `currentUser` yet — read from
      // the login response indirectly by falling back to "/".
      router.replace("/");
    } catch (loginError) {
      const message = loginError instanceof ApiError ? loginError.message : "Login gagal.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-jp-app p-4 sm:p-6 dark:bg-jp-app-dark">
      {/* Satu blok solid memberi fokus; form tetap tenang dan terang. */}
      <div className="relative w-full max-w-sm">
        <div className="hero-card mb-4 text-center">
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-white dark:text-jp-text-dark">Jayaphone</h1>
          <p className="mt-1 text-xs text-white/60 dark:text-jp-muted-dark">Masuk untuk melanjutkan</p>
        </div>
        <div className="rounded-jp-md border border-jp-border bg-jp-surface p-6 shadow-none dark:border-jp-border-dark dark:bg-jp-surface-dark">

        <form onSubmit={handleSubmit} className="space-y-3">
          <LabelledInput
            label="Username"
            required
            type="text"
            autoComplete="username"
            value={usernameFieldValue}
            onChange={(inputEvent) => setUsernameFieldValue(inputEvent.target.value)}
            placeholder="mis. bayu"
          />
          <LabelledInput
            label="Password"
            required
            type="password"
            autoComplete="current-password"
            value={passwordFieldValue}
            onChange={(inputEvent) => setPasswordFieldValue(inputEvent.target.value)}
            placeholder="Password anda"
          />

          {errorMessage && (
            <div className="rounded-xl border border-jp-danger/20 bg-jp-danger/10 p-2.5 text-xs text-jp-danger dark:text-jp-danger-dark">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" /> Memproses...
              </>
            ) : (
              "Masuk"
            )}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
