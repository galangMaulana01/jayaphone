"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import type { DateFilterPreset, DateFilterState } from "@/lib/utils/dateFilter";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface DateFilterBarProps {
  currentFilterState: DateFilterState;
  onFilterStateChange: (nextState: DateFilterState) => void;
}

const presetOptions: { key: DateFilterPreset; label: string }[] = [
  { key: "7d", label: "7 Hari" },
  { key: "30d", label: "30 Hari" },
  { key: "90d", label: "3 Bulan" },
  { key: "1y", label: "1 Tahun" },
  { key: "custom", label: "Custom" },
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

  // Single-select dropdown, consistent with the Cabang/Status filters it sits
  // next to on every page that uses this bar — a 5-pill row was the same
  // "pick one of a handful" behavior as those two dropdowns, just wearing a
  // different pattern. "Custom" opens the same date-range modal as before;
  // since the <select> stays controlled by currentFilterState.preset (not
  // local UI state), cancelling the modal without applying naturally leaves
  // the dropdown showing whatever preset was actually active.
  const handlePeriodChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextPreset = event.target.value as DateFilterPreset;
    if (nextPreset === "custom") {
      setIsCustomModalOpen(true);
      return;
    }
    handlePresetClick(nextPreset);
  };

  return (
    <>
      <select
        aria-label="Filter periode"
        value={currentFilterState.preset}
        onChange={handlePeriodChange}
        className="field-control w-full text-xs sm:w-auto sm:min-w-[130px]"
      >
        {presetOptions.map((option) => (
          <option key={option.key} value={option.key}>{option.label}</option>
        ))}
      </select>

      <Modal isOpen={isCustomModalOpen} onClose={() => setIsCustomModalOpen(false)} title="Pilih Rentang Tanggal" maxWidthClassName="max-w-md">
        <div className="space-y-4 py-2">
          <div>
            <label className="label" htmlFor="date-filter-start">Dari Tanggal</label>
            <input
              id="date-filter-start"
              type="date"
              value={draftStartDate}
              onChange={(inputEvent) => setDraftStartDate(inputEvent.target.value)}
              className="field-control"
            />
          </div>
          <div>
            <label className="label" htmlFor="date-filter-end">Sampai Tanggal</label>
            <input
              id="date-filter-end"
              type="date"
              value={draftEndDate}
              onChange={(inputEvent) => setDraftEndDate(inputEvent.target.value)}
              className="field-control"
            />
          </div>
        </div>
        {draftStartDate && draftEndDate && draftStartDate > draftEndDate ? <p className="text-xs text-jp-danger">Tanggal mulai harus sebelum tanggal akhir.</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
          <Button variant="ghost" onClick={() => setIsCustomModalOpen(false)} fullWidth>Batal</Button>
          <Button onClick={handleApplyCustom} fullWidth disabled={!draftStartDate || !draftEndDate || draftStartDate > draftEndDate}>Terapkan Filter</Button>
        </div>
      </Modal>
    </>
  );
}
