import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Marks the field as error — overrides the default border with danger red. */
  error?: boolean;
  /** Optional leading icon node (sized to 14-16px). */
  leadingIcon?: React.ReactNode;
  /** Optional trailing icon node — e.g. clear button or unit label. */
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leadingIcon, trailingIcon, ...props }, ref) => {
    const baseInput = cn(
      "flex h-9 w-full rounded-lg border bg-bg-elevated px-3 py-2 text-sm text-fg-primary shadow-soft transition-all",
      "placeholder:text-fg-tertiary",
      "disabled:cursor-not-allowed disabled:bg-bg-surface disabled:opacity-60",
      // Focus → border accent + 3px accent-glow ring (§6).
      "focus-visible:outline-none focus-visible:ring-[3px]",
      error
        ? "border-status-danger/60 focus-visible:border-status-danger focus-visible:ring-status-danger/20"
        : "border-border hover:border-border-strong focus-visible:border-brand-blue focus-visible:ring-brand-blue/25",
      leadingIcon && "pl-9",
      trailingIcon && "pr-9",
      className,
    );

    if (leadingIcon || trailingIcon) {
      return (
        <div className="relative">
          {leadingIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-fg-tertiary [&_svg]:size-4">
              {leadingIcon}
            </span>
          )}
          <input type={type} ref={ref} className={baseInput} {...props} />
          {trailingIcon && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-fg-tertiary [&_svg]:size-4">
              {trailingIcon}
            </span>
          )}
        </div>
      );
    }

    return <input type={type} ref={ref} className={baseInput} {...props} />;
  },
);
Input.displayName = "Input";
