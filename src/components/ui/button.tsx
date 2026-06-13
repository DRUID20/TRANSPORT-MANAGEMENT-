"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — the canonical interactive primitive.
 *
 * Visual rules:
 *  - Tight Vercel/Linear-grade sizing: default md is 36px, sm 32px, lg 40px
 *  - One accent color (brand-blue) for primary intent; everything else
 *    is neutral-on-neutral with subtle elevation
 *  - Snappy micro-interactions: 120ms ease, no scale jitter, just a 1px
 *    translate on hover and a 0px reset on active
 *  - prefers-reduced-motion compliant via duration-0 override
 */
const buttonVariants = cva(
  [
    "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap",
    "rounded-lg text-[13px] font-medium leading-none tracking-[-0.005em]",
    "transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-out",
    "motion-reduce:transition-none motion-reduce:transform-none",
    // Always-visible focus ring (§5/§14) — bg-independent, no offset band.
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/55",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:transition-transform",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-brand-blue text-white",
          "shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_1px_2px_rgba(15,23,42,0.20)]",
          "hover:bg-brand-blue-hover hover:-translate-y-px",
          "hover:shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_4px_12px_rgba(37,99,235,0.28)]",
          "active:translate-y-0 active:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_1px_2px_rgba(15,23,42,0.20)]",
        ].join(" "),
        secondary: [
          "border border-border bg-bg-elevated text-fg-primary",
          "shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_1px_2px_rgba(15,23,42,0.04)]",
          "hover:bg-bg-elevated-2 hover:border-border-strong hover:-translate-y-px",
          "active:translate-y-0",
        ].join(" "),
        ghost:
          "text-fg-secondary hover:bg-bg-surface hover:text-fg-primary active:bg-bg-elevated-2",
        outline:
          "border border-border bg-transparent text-fg-primary hover:bg-bg-elevated hover:border-border-strong",
        danger: [
          "bg-status-danger text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_1px_2px_rgba(15,23,42,0.20)]",
          "hover:brightness-110 hover:-translate-y-px",
          "active:translate-y-0",
        ].join(" "),
        success: [
          "bg-status-success text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_1px_2px_rgba(15,23,42,0.20)]",
          "hover:brightness-105 hover:-translate-y-px",
          "active:translate-y-0",
        ].join(" "),
      },
      size: {
        sm: "h-8 px-2.5 text-[12px]",
        md: "h-9 px-3.5",
        lg: "h-10 px-5 text-[14px]",
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
