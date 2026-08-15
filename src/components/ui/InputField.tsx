// Small input primitives sharing the app's standard styling.
// The legacy code had one giant `input` Tailwind string; this consolidates it.

import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const sharedFieldClassName = "field-control";

interface LabelledInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  required?: boolean;
  helper?: ReactNode;
  errorMessage?: string;
}

export function LabelledInput({ label, required, helper, errorMessage, className, ...restInputProps }: LabelledInputProps): JSX.Element {
  return (
    <div>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-jp-danger dark:text-jp-danger-dark">*</span>}
        </label>
      )}
      <input {...restInputProps} className={`${sharedFieldClassName} ${className ?? ""}`} />
      {helper && <p className="mt-1.5 text-[11px] text-jp-muted dark:text-jp-muted-dark">{helper}</p>}
      {errorMessage && <p className="mt-1.5 text-[11px] text-jp-danger dark:text-jp-danger-dark">{errorMessage}</p>}
    </div>
  );
}

interface LabelledTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  required?: boolean;
  helper?: ReactNode;
}
export function LabelledTextarea({ label, required, helper, className, ...restProps }: LabelledTextareaProps): JSX.Element {
  return (
    <div>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-jp-danger dark:text-jp-danger-dark">*</span>}
        </label>
      )}
      <textarea {...restProps} required={required} className={`${sharedFieldClassName} resize-none ${className ?? ""}`} />
      {helper && <p className="mt-1.5 text-[11px] text-jp-muted dark:text-jp-muted-dark">{helper}</p>}
    </div>
  );
}

interface LabelledCheckboxGroupProps {
  label: ReactNode;
  options: string[];
  /** Comma-separated selected values (kept as a plain string so the backend
   * field type doesn't need to change from str to a list). */
  value: string;
  onChange: (value: string) => void;
  /** A value like "Tidak Ada" that's mutually exclusive with every other option. */
  exclusiveOption?: string;
}

/** A device can genuinely have more than one security method at once (e.g.
 * Fingerprint AND Face ID) — a single-choice dropdown couldn't express that. */
export function LabelledCheckboxGroup({ label, options, value, onChange, exclusiveOption }: LabelledCheckboxGroupProps): JSX.Element {
  const selected = value ? value.split(",").map((v) => v.trim()).filter(Boolean) : [];
  const toggle = (option: string) => {
    if (exclusiveOption && option === exclusiveOption) {
      onChange(selected.includes(option) ? "" : option);
      return;
    }
    const withoutExclusive = selected.filter((s) => s !== exclusiveOption);
    const next = withoutExclusive.includes(option) ? withoutExclusive.filter((s) => s !== option) : [...withoutExclusive, option];
    onChange(next.join(", "));
  };
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-jp-sm border border-jp-border bg-jp-surface-subtle px-3.5 py-2.5 dark:border-jp-border-dark dark:bg-jp-surface-subtle-dark">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-1.5 text-sm text-jp-text dark:text-jp-text-dark">
            <input type="checkbox" className="h-3.5 w-3.5 accent-jp-teal" checked={selected.includes(option)} onChange={() => toggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

interface LabelledSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  children: ReactNode;
}
export function LabelledSelect({ label, className, children, ...restProps }: LabelledSelectProps): JSX.Element {
  return (
    <div className="min-w-0">
      {label && <label className="label">{label}</label>}
      {/* min-w-0 + truncate: an unusually long option (e.g. a long cabang/karyawan
          nama) sets this <select>'s intrinsic content width, which a flex
          ancestor's default min-width:auto lets win over any max-width —
          without this, one long option can push the whole page into
          horizontal overflow. Only affects the select's closed-state box;
          the native open dropdown is unaffected. */}
      <select {...restProps} className={`${sharedFieldClassName} min-w-0 truncate ${className ?? ""}`}>
        {children}
      </select>
    </div>
  );
}
