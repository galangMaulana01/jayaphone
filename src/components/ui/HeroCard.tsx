// DESIGN.md v2 §6 — Hero/stat card.
//
// One per page maximum. Used for the single most-important metric on a page
// (e.g. Total Omzet on Dashboard). Backed by the .hero-card utility class
// in globals.css, which keeps the visual treatment flat and reusable.

import type { ReactNode } from "react";

interface HeroCardProps {
  label: string;
  value: string;
  description?: string;
  trailing?: ReactNode;
  footer?: ReactNode;
  mono?: boolean;
}

export function HeroCard({ label, value, description, trailing, footer, mono = false }: HeroCardProps): JSX.Element {
  return (
    <section className="hero-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/65 dark:text-jp-muted-dark">
            {label}
          </p>
          <p
            className={
              "mt-3 text-[36px] font-semibold leading-none tracking-[-0.035em] text-white dark:text-jp-text-dark md:text-[42px] " +
              (mono ? "font-mono tabular-nums" : "tabular-nums")
            }
          >
            {value}
          </p>
          {description ? (
            <p className="mt-3 text-xs leading-relaxed text-white/60 dark:text-jp-muted-dark">{description}</p>
          ) : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      {footer ? <div className="mt-6 border-t border-white/15 pt-5 dark:border-jp-border-dark/60">{footer}</div> : null}
    </section>
  );
}
