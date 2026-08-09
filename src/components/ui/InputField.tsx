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
  helper?: ReactNode;
}
export function LabelledTextarea({ label, helper, className, ...restProps }: LabelledTextareaProps): JSX.Element {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <textarea {...restProps} className={`${sharedFieldClassName} resize-none ${className ?? ""}`} />
      {helper && <p className="mt-1.5 text-[11px] text-jp-muted dark:text-jp-muted-dark">{helper}</p>}
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
