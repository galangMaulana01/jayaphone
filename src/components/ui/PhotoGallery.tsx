"use client";

import { useState } from "react";

interface PhotoGalleryProps {
  images: string[];
  label?: string;
}

/** GAP-009 (LEGACY_GAP_ANALYSIS.md) — ports legacy's imageGalleryHTML/iuSetMain
 * (main.js:173-191): a large main photo with a thumbnail strip below it;
 * clicking a thumbnail swaps the main photo in place via local state, instead
 * of opening each photo in a new tab. */
export function PhotoGallery({ images, label }: PhotoGalleryProps): JSX.Element | null {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) return null;
  const activeUrl = images[Math.min(activeIndex, images.length - 1)];

  return (
    <div className="space-y-2">
      {label && <p className="font-semibold">{label}</p>}
      <a href={activeUrl} target="_blank" rel="noreferrer">
        <img src={activeUrl} alt={label ? `${label} — foto utama` : "Foto"} className="h-56 w-full rounded-xl object-cover" />
      </a>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${index === activeIndex ? "border-jp-teal" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <img src={url} alt={`${label ? `${label} ` : ""}thumbnail ${index + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
