// DESIGN.md v2 §6 — Hero/stat card.
//
// One per page maximum. Used for the single most-important metric on a page
// (e.g. Total Omzet on Dashboard). Backed by the .hero-card utility class
// in globals.css, which pins the monokrom bg-gradient-hero from §3.1.

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
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-jp-muted dark:text-jp-muted-dark">
            {label}
          </p>
          <p
            className={
              "mt-3 text-4xl font-semibold tracking-tight text-jp-text dark:text-jp-text-dark md:text-[44px] " +
              (mono ? "font-mono tabular-nums" : "tabular-nums")
            }
          >
            {value}
          </p>
          {description ? (
            <p className="mt-2 text-xs text-jp-muted dark:text-jp-muted-dark">{description}</p>
          ) : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      {footer ? <div className="mt-6 border-t border-jp-border/60 pt-5 dark:border-jp-border-dark/60">{footer}</div> : null}
    </section>
  );
}
