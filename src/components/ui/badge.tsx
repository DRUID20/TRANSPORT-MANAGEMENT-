import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        success: "bg-status-success/15 text-status-success ring-1 ring-status-success/30",
        warning: "bg-status-warning/15 text-status-warning ring-1 ring-status-warning/30",
        danger: "bg-status-danger/15 text-status-danger ring-1 ring-status-danger/30",
        info: "bg-status-info/15 text-status-info ring-1 ring-status-info/30",
        neutral: "bg-status-neutral/15 text-status-neutral ring-1 ring-status-neutral/30",
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
