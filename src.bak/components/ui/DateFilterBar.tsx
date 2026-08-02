"use client";

// The date-preset chip row that sits at the top of Dashboard / Laporan /
// Transaksi / Log / Service etc. Replaces the legacy
// `renderDateFilter(refreshCallback)` helper.
//
// Consumers own the DateFilterState in their own useState — this component is
// purely presentational + calls back with the new state.

import { useState } from "react";
import type { DateFilterPreset, DateFilterState } from "@/lib/utils/dateFilter";
import { Modal } from "./Modal";

interface DateFilterBarProps {
  currentFilterState: DateFilterState;
  onFilterStateChange: (nextState: DateFilterState) => void;
}

const presetOptions: { key: DateFilterPreset; label: string }[] = [
  { key: "7d", label: "7 Hari" },
  { key: "30d", label: "30 Hari" },
  { key: "90d", label: "3 Bulan" },
  { key: "1y", label: "1 Tahun" },
];

export function DateFilterBar({ currentFilterState, onFilterStateChange }: DateFilterBarProps): JSX.Element {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [draftStartDate, setDraftStartDate] = useState<string>(currentFilterState.start ?? "");
  const [draftEndDate, setDraftEndDate] = useState<string>(currentFilterState.end ?? "");

  const handlePresetClick = (nextPreset: DateFilterPreset): void => {
    onFilterStateChange({ preset: nextPreset, start: null, end: null });
  };

  const handleApplyCustom = (): void => {
    if (!draftStartDate || !draftEndDate) return;
    onFilterStateChange({ preset: "custom", start: draftStartDate, end: draftEndDate });
    setIsCustomModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        {presetOptions.map((option) => {
          const isActive = currentFilterState.preset === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => handlePresetClick(option.key)}
              className={`filter-tab rounded-xl px-4 py-2 text-xs ${isActive ? "bg-white shadow-sm dark:bg-zinc-800" : ""}`}
            >
              {option.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setIsCustomModalOpen(true)}
          className={`filter-tab rounded-xl px-4 py-2 text-xs ${currentFilterState.preset === "custom" ? "bg-white shadow-sm dark:bg-zinc-800" : ""}`}
        >
          Custom
        </button>
      </div>

      <Modal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        title="Pilih Rentang Tanggal"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="label" htmlFor="date-filter-start">Dari Tanggal</label>
            <input
              id="date-filter-start"
              type="date"
              value={draftStartDate}
              onChange={(inputEvent) => setDraftStartDate(inputEvent.target.value)}
              className="w-full rounded-xl border border-transparent bg-zinc-100 p-2 outline-none focus:border-brand-teal dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="label" htmlFor="date-filter-end">Sampai Tanggal</label>
            <input
              id="date-filter-end"
              type="date"
              value={draftEndDate}
              onChange={(inputEvent) => setDraftEndDate(inputEvent.target.value)}
              className="w-full rounded-xl border border-transparent bg-zinc-100 p-2 outline-none focus:border-brand-teal dark:bg-zinc-800"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => setIsCustomModalOpen(false)} className="btn-ghost flex-1">
            Batal
          </button>
          <button
            type="button"
            onClick={handleApplyCustom}
            className="btn-primary flex-1"
            disabled={!draftStartDate || !draftEndDate}
          >
            Terapkan Filter
          </button>
        </div>
      </Modal>
    </>
  );
}
