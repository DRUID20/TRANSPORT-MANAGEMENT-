import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native <select> styled to match our Input component.
 * We use native rather than Radix Select so it works seamlessly with
 * <form> submissions (FormData) and on mobile keyboards.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border border-border bg-bg-base pl-3 pr-9 py-2 text-sm",
          "text-fg-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors",
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
