"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-blue text-white shadow-soft hover:bg-brand-blue-hover hover:shadow-elevated hover:-translate-y-px active:translate-y-0 active:scale-[.99]",
        secondary:
          "bg-bg-elevated text-fg-primary border border-border shadow-soft hover:border-border-strong hover:bg-bg-elevated-2 hover:-translate-y-px active:translate-y-0",
        ghost:
          "text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary",
        outline:
          "border border-border bg-transparent text-fg-primary hover:bg-bg-elevated hover:border-border-strong",
        danger:
          "bg-status-danger text-white shadow-soft hover:opacity-90 hover:-translate-y-px active:translate-y-0",
        success:
          "bg-status-success text-white shadow-soft hover:opacity-90 hover:-translate-y-px active:translate-y-0",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-3.5",
        lg: "h-10 px-5 text-sm",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
