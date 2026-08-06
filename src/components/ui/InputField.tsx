// Small input primitives sharing the app's standard styling.
// The legacy code had one giant `input` Tailwind string; this consolidates it.

import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const sharedFieldClassName =
  "min-h-11 w-full rounded-xl border border-jp-border bg-jp-surface-subtle px-3 py-2 text-sm text-jp-text outline-none placeholder:text-jp-muted focus:border-jp-teal focus:ring-2 focus:ring-jp-teal/20 dark:border-jp-border-dark dark:bg-jp-surface-subtle-dark dark:text-jp-text-dark dark:placeholder:text-jp-muted-dark";

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
          {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <input {...restInputProps} className={`${sharedFieldClassName} ${className ?? ""}`} />
      {helper && <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">{helper}</p>}
      {errorMessage && <p className="mt-1.5 text-[11px] text-red-400">{errorMessage}</p>}
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
      {helper && <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">{helper}</p>}
    </div>
  );
}

interface LabelledSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  children: ReactNode;
}
export function LabelledSelect({ label, className, children, ...restProps }: LabelledSelectProps): JSX.Element {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <select {...restProps} className={`${sharedFieldClassName} ${className ?? ""}`}>
        {children}
      </select>
    </div>
  );
}
