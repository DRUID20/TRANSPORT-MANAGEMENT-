import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native <select> styled to match our Input component.
 * We use native rather than Radix Select so it works seamlessly with
 * <form> submissions (FormData) and on mobile keyboards.
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-9 w-full appearance-none rounded-lg border bg-bg-elevated pl-3 pr-9 py-2 text-sm shadow-soft transition-all",
          "text-fg-primary",
          "focus-visible:outline-none",
          error
            ? "border-status-danger/60 focus-visible:border-status-danger"
            : "border-border hover:border-border-strong focus-visible:border-brand-blue",
          "disabled:cursor-not-allowed disabled:bg-bg-surface disabled:opacity-60",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-tertiary" />
    </div>
  );
});
Select.displayName = "Select";
