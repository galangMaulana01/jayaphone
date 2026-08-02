// Icon component — renders an inline SVG string from the migrated icon library.
//
// The legacy templates concatenated SVG strings straight into `innerHTML`.
// In React we can't do that safely without `dangerouslySetInnerHTML`, so this
// component encapsulates the pattern in one place: pass an icon name, get a
// <span> with the inline SVG. Passing a `className` lets consumers size and
// colour the icon via Tailwind utilities (the migrated icons use
// `fill="currentColor"` on most paths, so `text-*` colour classes just work).

import { getIconSvg } from "./library";

interface IconProps {
  /** Icon key from `iconLibrary` (e.g. "dashboardSvg", "logSvg"). */
  name: string;
  /** Optional Tailwind utilities forwarded to the wrapping <span>. */
  className?: string;
  /** Optional accessible label. Rendered as sr-only text. */
  ariaLabel?: string;
}

export function Icon({ name, className, ariaLabel }: IconProps): JSX.Element {
  const svgMarkup = getIconSvg(name);

  return (
    <span
      className={className}
      // The `iconLibrary` values are static compile-time constants from our own
      // migrated svg.js — never user input — so dangerouslySetInnerHTML is safe
      // here.
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : "presentation"}
    />
  );
}
