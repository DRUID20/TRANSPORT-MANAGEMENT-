import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[88px] w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm shadow-soft transition-all",
        "placeholder:text-fg-tertiary",
        "hover:border-border-strong focus-visible:border-brand-blue focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:bg-bg-surface disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
