"use client";

// Owner-only cabang filter dropdown.
//
// Backing store: GET /cabang (Api.cabang.list). Renders a <select> so the
// user picks from the live list of branches instead of guessing/typing a
// kode. Falls back gracefully when the list hasn't loaded yet (renders
// with "Semua Cabang" only) — the input never blocks the surrounding page.

import { useEffect, useState } from "react";
import { Api } from "@/lib/api";
import type { Cabang } from "@/lib/types";
import { LabelledSelect } from "@/components/ui/InputField";

interface CabangFilterProps {
  /** Currently-selected kode ("" = semua cabang). */
  value: string;
  onChange: (kode: string) => void;
  /** Optional label override. Default: "Filter Cabang". */
  label?: string;
  /** Optional className applied to the wrapping div (usually width tweaks). */
  className?: string;
}

export function CabangFilter({ value, onChange, label = "Filter Cabang", className }: CabangFilterProps): JSX.Element {
  const [branches, setBranches] = useState<Cabang[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Api.cabang
      .list()
      .then((response) => {
        if (!cancelled) setBranches((response.data ?? []).filter((c) => c.aktif !== false));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={className ?? "w-full sm:max-w-[260px]"}>
      <LabelledSelect label={label} aria-label={typeof label === "string" && label ? label : "Filter cabang"} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Semua Cabang</option>
        {branches.map((cabang) => (
          <option key={cabang.kode} value={cabang.kode}>
            {cabang.kode} — {cabang.nama}
          </option>
        ))}
      </LabelledSelect>
    </div>
  );
}
