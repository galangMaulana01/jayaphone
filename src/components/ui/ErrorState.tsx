// "Something went wrong" state — used at the top of every render function
// in the legacy app (`errorState(message, retryFn)`). The React port takes
// an optional retry callback instead of a stringified function name.

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps): JSX.Element {
  const messageLower = message.toLowerCase();
  const isTimeout = messageLower.includes("timeout") || messageLower.includes("cold start");

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-red-500/10">
        <svg
          className="h-5 w-5 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">Gagal memuat data</p>
      <p className="mb-1 max-w-[220px] text-xs text-zinc-400 dark:text-zinc-500">{message}</p>
      {isTimeout && (
        <p className="mb-4 max-w-[220px] text-[11px] text-zinc-400 dark:text-zinc-600">
          Server Vercel cold start, tunggu 5 detik lalu coba lagi.
        </p>
      )}
      {!isTimeout && <div className="mb-4" />}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost text-xs">
          ↺ Coba lagi
        </button>
      )}
    </div>
  );
}
