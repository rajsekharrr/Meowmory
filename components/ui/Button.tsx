import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-[var(--accent)] text-white border-transparent hover:opacity-90 active:opacity-80",
  ghost:   "bg-transparent text-[var(--text)] border-[var(--border)] hover:bg-[var(--bg-subtle)] active:bg-[var(--border)]",
  danger:  "bg-[var(--removed)] text-white border-transparent hover:opacity-90 active:opacity-80",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          "inline-flex items-center justify-center gap-1.5",
          "font-medium rounded-[6px] border transition-all duration-150",
          "focus:outline focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-2",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
