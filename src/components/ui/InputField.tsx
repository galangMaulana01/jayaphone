// Small input primitives sharing the app's standard styling.
// The legacy code had one giant `input` Tailwind string; this consolidates it.

import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const sharedFieldClassName =
  "w-full rounded-xl border-[1.5px] border-transparent bg-gray-100 p-2 outline-none placeholder:text-sm placeholder:text-gray-500 focus:border-brand-teal dark:bg-[#18181B] dark:placeholder:text-gray-400";

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
