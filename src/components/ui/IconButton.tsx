import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { ButtonVariant } from "./Button";

const variantClassName: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  success: "btn-success",
  danger: "btn-error",
  warning: "btn-warning",
};

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md";
}

export function IconButton({ label, children, variant = "ghost", size = "md", className = "", ...props }: IconButtonProps): JSX.Element {
  const sizeClassName = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      aria-label={label}
      className={`${variantClassName[variant]} ${sizeClassName} shrink-0 !px-0 ${className}`}
    >
      {children}
    </button>
  );
}
