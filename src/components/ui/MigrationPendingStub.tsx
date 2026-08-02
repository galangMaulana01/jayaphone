"use client";

// Placeholder for pages whose logic hasn't been ported from index.html.bak yet.
// Every stub page renders this and points at the legacy render function name
// so a follow-up developer can jump straight to the source of truth.

import Link from "next/link";
import { Icon } from "@/lib/icons";

interface MigrationPendingStubProps {
  /** Page title (shown in <h1>). */
  pageTitle: string;
  /** Name of the legacy render function to migrate from. */
  legacyRenderFunctionName: string;
  /** Approximate line range in index.html.bak. */
  legacyLineRange: string;
  /** Short summary of what this page does — helps the migrating developer. */
  featureSummary: string;
}

export function MigrationPendingStub({
  pageTitle,
  legacyRenderFunctionName,
  legacyLineRange,
  featureSummary,
}: MigrationPendingStubProps): JSX.Element {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
      <Icon name="wrenchSvg" className="h-10 w-10 text-brand-teal" />
      <h1 className="text-lg font-semibold tracking-tight">{pageTitle}</h1>
      <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-400">{featureSummary}</p>
      <div className="mt-2 rounded-xl bg-zinc-100 px-4 py-3 text-left text-[11px] leading-relaxed text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
        <p className="font-semibold text-zinc-700 dark:text-zinc-300">Migrasi belum selesai</p>
        <p className="mt-1">
          Logika asli halaman ini masih ada di <code className="rounded bg-zinc-200 px-1 py-0.5 dark:bg-zinc-700">index.html.bak</code>,
          fungsi <code className="rounded bg-zinc-200 px-1 py-0.5 dark:bg-zinc-700">{legacyRenderFunctionName}()</code>{" "}
          (baris ~{legacyLineRange}).
        </p>
        <p className="mt-1">
          Ikuti pola yang sudah dipakai di{" "}
          <Link href="/dashboard" className="text-brand-teal underline">
            /dashboard
          </Link>{" "}
          atau{" "}
          <Link href="/stok" className="text-brand-teal underline">
            /stok
          </Link>{" "}
          sebagai template.
        </p>
      </div>
      <Link href="/" className="btn-ghost">
        Kembali ke Beranda
      </Link>
    </div>
  );
}
