"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Modal (DESIGN.md §12) — centered dialog, scale-in 96%+fade, radius-14,
 * 40% scrim, the §4 modal shadow. Header title + close, body, optional footer.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const width = size === "sm" ? "max-w-[420px]" : size === "lg" ? "max-w-[640px]" : "max-w-[520px]";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[151] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-strong bg-bg-surface shadow-modal",
            "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 duration-200",
            width,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-[15px] font-semibold text-fg-primary">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 text-sm text-fg-secondary">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="grid size-7 shrink-0 place-items-center rounded-md text-fg-tertiary transition-colors hover:bg-bg-elevated-2 hover:text-fg-primary">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          {children && <div className="px-5 py-4">{children}</div>}
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-3.5 sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * ConfirmDialog (§12) — destructive confirmation with a danger icon circle,
 * the consequence spelled out, and optional type-to-confirm for irreversible
 * actions.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  typeToConfirm,
  onConfirm,
  loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  /** If set, the confirm button stays disabled until the user types this exactly. */
  typeToConfirm?: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const [typed, setTyped] = React.useState("");
  React.useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const canConfirm = !typeToConfirm || typed === typeToConfirm;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[151] w-[calc(100vw-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-strong bg-bg-surface p-5 shadow-modal data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 duration-200">
          <div className="flex gap-3.5">
            {variant === "danger" && (
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-status-danger/12 text-status-danger">
                <AlertTriangle className="size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[15px] font-semibold text-fg-primary">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-fg-secondary">
                {description}
              </Dialog.Description>

              {typeToConfirm && (
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs text-fg-secondary">
                    Type <span className="font-mono font-medium text-fg-primary">{typeToConfirm}</span> to confirm
                  </label>
                  <Input
                    value={typed}
                    onChange={(e) => setTyped(e.currentTarget.value)}
                    placeholder={typeToConfirm}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button variant="ghost">{cancelLabel}</Button>
            </Dialog.Close>
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              disabled={!canConfirm || loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
