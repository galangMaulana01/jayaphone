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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Jayaphone</h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Masuk untuk melanjutkan</p>
        </div>

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
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-500">
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
  );
}
