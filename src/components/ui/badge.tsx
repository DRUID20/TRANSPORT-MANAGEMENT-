import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 transition-colors",
  {
    variants: {
      variant: {
        success: "bg-status-success/10 text-status-success ring-1 ring-inset ring-status-success/20",
        warning: "bg-status-warning/10 text-status-warning ring-1 ring-inset ring-status-warning/25",
        danger: "bg-status-danger/10 text-status-danger ring-1 ring-inset ring-status-danger/20",
        info: "bg-status-info/10 text-status-info ring-1 ring-inset ring-status-info/20",
        neutral:
          "bg-bg-surface text-fg-secondary ring-1 ring-inset ring-border",
        outline: "border border-border text-fg-secondary",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </div>
  );
}

export { badgeVariants };
