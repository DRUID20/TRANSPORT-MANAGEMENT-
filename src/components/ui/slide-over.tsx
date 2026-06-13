"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Slide-over (DESIGN.md §12) — the primary detail pattern. 520px right panel,
 * 250ms slide-in, 40% scrim. Header (title + status slot + close), scrollable
 * body, sticky footer for actions.
 */
export function SlideOver({
  open,
  onOpenChange,
  title,
  subtitle,
  headerExtra,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  /** Right-of-title slot — e.g. a status pill. */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out duration-200" />
        <Dialog.Content
          style={{ width }}
          className={cn(
            "fixed right-0 top-0 z-[151] flex h-dvh max-w-[calc(100vw-2rem)] flex-col border-l border-border-strong bg-bg-surface shadow-modal",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <Dialog.Title className="truncate text-[15px] font-semibold text-fg-primary">
                  {title}
                </Dialog.Title>
                {subtitle && (
                  <Dialog.Description className="mt-0.5 truncate text-xs text-fg-tertiary">
                    {subtitle}
                  </Dialog.Description>
                )}
              </div>
              {headerExtra}
            </div>
            <Dialog.Close className="grid size-7 shrink-0 place-items-center rounded-md text-fg-tertiary transition-colors hover:bg-bg-elevated-2 hover:text-fg-primary">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-border bg-bg-surface px-5 py-3.5 sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Definition-list row for slide-over bodies — label left, value right (mono-friendly). */
export function SlideOverRow({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <span className="text-xs text-fg-tertiary">{label}</span>
      <span className={cn("text-sm text-fg-primary", mono && "font-mono tnum")}>{children}</span>
    </div>
  );
}
