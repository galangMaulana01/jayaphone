"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    setDraftStartDate(currentFilterState.start ?? "");
    setDraftEndDate(currentFilterState.end ?? "");
  }, [currentFilterState.start, currentFilterState.end]);

  const handlePresetClick = (nextPreset: DateFilterPreset): void => {
    onFilterStateChange({ preset: nextPreset, start: null, end: null });
  };

  const handleApplyCustom = (): void => {
    if (!draftStartDate || !draftEndDate || draftStartDate > draftEndDate) return;
    onFilterStateChange({ preset: "custom", start: draftStartDate, end: draftEndDate });
    setIsCustomModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap gap-1 rounded-xl border border-jp-border bg-jp-surface-subtle p-1.5 dark:border-jp-border-dark dark:bg-jp-surface-subtle-dark">
        {presetOptions.map((option) => {
          const isActive = currentFilterState.preset === option.key;
          const buttonClassName = isActive
            ? "bg-jp-surface text-jp-text dark:bg-jp-surface-dark dark:text-jp-text-dark"
            : "text-jp-muted hover:text-jp-text dark:text-jp-muted-dark dark:hover:text-jp-text-dark";
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => handlePresetClick(option.key)}
              className={"min-h-9 rounded-lg px-3 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-jp-teal/50 " + buttonClassName}
            >
              {option.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setIsCustomModalOpen(true)}
          className={"min-h-9 rounded-lg px-3 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-jp-teal/50 " + (
            currentFilterState.preset === "custom"
              ? "bg-jp-surface text-jp-text dark:bg-jp-surface-dark dark:text-jp-text-dark"
              : "text-jp-muted hover:text-jp-text dark:text-jp-muted-dark dark:hover:text-jp-text-dark"
          )}
        >
          Custom
        </button>
      </div>

      <Modal isOpen={isCustomModalOpen} onClose={() => setIsCustomModalOpen(false)} title="Pilih Rentang Tanggal" maxWidthClassName="max-w-md">
        <div className="space-y-4 py-2">
          <div>
            <label className="label" htmlFor="date-filter-start">Dari Tanggal</label>
            <input
              id="date-filter-start"
              type="date"
              value={draftStartDate}
              onChange={(inputEvent) => setDraftStartDate(inputEvent.target.value)}
              className="w-full rounded-xl border border-jp-border bg-jp-surface-subtle p-2.5 text-jp-text outline-none focus:border-jp-teal focus:ring-2 focus:ring-jp-teal/20 dark:border-jp-border-dark dark:bg-jp-surface-subtle-dark dark:text-jp-text-dark"
            />
          </div>
          <div>
            <label className="label" htmlFor="date-filter-end">Sampai Tanggal</label>
            <input
              id="date-filter-end"
              type="date"
              value={draftEndDate}
              onChange={(inputEvent) => setDraftEndDate(inputEvent.target.value)}
              className="w-full rounded-xl border border-jp-border bg-jp-surface-subtle p-2.5 text-jp-text outline-none focus:border-jp-teal focus:ring-2 focus:ring-jp-teal/20 dark:border-jp-border-dark dark:bg-jp-surface-subtle-dark dark:text-jp-text-dark"
            />
          </div>
        </div>
        {draftStartDate && draftEndDate && draftStartDate > draftEndDate ? <p className="text-xs text-jp-danger">Tanggal mulai harus sebelum tanggal akhir.</p> : null}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => setIsCustomModalOpen(false)} className="btn-ghost flex-1">Batal</button>
          <button type="button" onClick={handleApplyCustom} className="btn-primary flex-1" disabled={!draftStartDate || !draftEndDate || draftStartDate > draftEndDate}>Terapkan Filter</button>
        </div>
      </Modal>
    </>
  );
}
