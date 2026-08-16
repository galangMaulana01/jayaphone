// Small input primitives sharing the app's standard styling.
// The legacy code had one giant `input` Tailwind string; this consolidates it.

import { useId } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const sharedFieldClassName = "field-control";

interface LabelledInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  required?: boolean;
  helper?: ReactNode;
  errorMessage?: string;
}

export function LabelledInput({ label, required, helper, errorMessage, className, id, ...restInputProps }: LabelledInputProps): JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div>
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
          {required && <span className="text-jp-danger dark:text-jp-danger-dark">*</span>}
        </label>
      )}
      <input {...restInputProps} id={inputId} required={required} className={`${sharedFieldClassName} ${className ?? ""}`} />
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
export function LabelledTextarea({ label, required, helper, className, id, ...restProps }: LabelledTextareaProps): JSX.Element {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  return (
    <div>
      {label && (
        <label className="label" htmlFor={textareaId}>
          {label}
          {required && <span className="text-jp-danger dark:text-jp-danger-dark">*</span>}
        </label>
      )}
      <textarea {...restProps} id={textareaId} required={required} className={`${sharedFieldClassName} resize-none ${className ?? ""}`} />
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
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-jp-sm border border-jp-border bg-jp-surface-subtle px-3.5 py-2.5 dark:border-jp-border-dark dark:bg-jp-surface-subtle-dark">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-1.5 text-sm text-jp-text dark:text-jp-text-dark">
            <input type="checkbox" className="h-3.5 w-3.5 accent-jp-teal" checked={selected.includes(option)} onChange={() => toggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface LabelledSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  children: ReactNode;
}
export function LabelledSelect({ label, className, children, id, required, ...restProps }: LabelledSelectProps): JSX.Element {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="min-w-0">
      {label && (
        <label className="label" htmlFor={selectId}>
          {label}
          {required && <span className="text-jp-danger dark:text-jp-danger-dark">*</span>}
        </label>
      )}
      {/* min-w-0 + truncate: an unusually long option (e.g. a long cabang/karyawan
          nama) sets this <select>'s intrinsic content width, which a flex
          ancestor's default min-width:auto lets win over any max-width —
          without this, one long option can push the whole page into
          horizontal overflow. Only affects the select's closed-state box;
          the native open dropdown is unaffected. */}
      <select {...restProps} id={selectId} required={required} className={`${sharedFieldClassName} min-w-0 truncate ${className ?? ""}`}>
        {children}
      </select>
    </div>
  );
}
