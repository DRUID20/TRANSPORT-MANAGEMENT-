"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toasts (DESIGN.md §12) — bottom-right, colored left border, icon + title +
 * message, optional Undo, auto-dismiss 5s with a progress bar, stack max 3.
 *
 * Store-based so `toast(...)` works from anywhere (server-action callbacks,
 * event handlers) without context plumbing. Mount <Toaster/> once in the shell.
 */

type ToastVariant = "default" | "success" | "warning" | "danger" | "info";

interface ToastRecord {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
  action?: { label: string; onClick: () => void };
}

let toasts: ToastRecord[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  for (const l of listeners) l();
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  const tm = timers.get(id);
  if (tm) {
    clearTimeout(tm);
    timers.delete(id);
  }
  emit();
}

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

function show(input: ToastInput): string {
  const id = Math.random().toString(36).slice(2);
  const rec: ToastRecord = {
    id,
    title: input.title,
    description: input.description,
    variant: input.variant ?? "default",
    duration: input.duration ?? 5000,
    action: input.action,
  };
  // newest first, cap the stack at 3
  toasts = [rec, ...toasts].slice(0, 3);
  emit();
  if (rec.duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismiss(id), rec.duration),
    );
  }
  return id;
}

export const toast = Object.assign(
  (input: ToastInput) => show(input),
  {
    success: (title: string, opts?: Omit<ToastInput, "title" | "variant">) =>
      show({ ...opts, title, variant: "success" }),
    error: (title: string, opts?: Omit<ToastInput, "title" | "variant">) =>
      show({ ...opts, title, variant: "danger" }),
    warning: (title: string, opts?: Omit<ToastInput, "title" | "variant">) =>
      show({ ...opts, title, variant: "warning" }),
    info: (title: string, opts?: Omit<ToastInput, "title" | "variant">) =>
      show({ ...opts, title, variant: "info" }),
    dismiss,
  },
);

const VARIANT: Record<
  ToastVariant,
  { border: string; icon: typeof Info; iconColor: string }
> = {
  default: { border: "border-l-border-strong", icon: Info, iconColor: "text-fg-secondary" },
  success: { border: "border-l-status-success", icon: CheckCircle2, iconColor: "text-status-success" },
  warning: { border: "border-l-status-warning", icon: AlertTriangle, iconColor: "text-status-warning" },
  danger: { border: "border-l-status-danger", icon: XCircle, iconColor: "text-status-danger" },
  info: { border: "border-l-brand-blue", icon: Info, iconColor: "text-brand-blue" },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return toasts;
}
const EMPTY: ToastRecord[] = [];

export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((t) => {
        const v = VARIANT[t.variant];
        const Icon = v.icon;
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto relative overflow-hidden rounded-lg border border-l-[3px] border-border bg-bg-surface p-3 pr-9 shadow-modal animate-in fade-in slide-in-from-bottom-2 duration-200",
              v.border,
            )}
          >
            <div className="flex gap-2.5">
              <Icon className={cn("mt-0.5 size-4 shrink-0", v.iconColor)} strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-fg-primary">{t.title}</div>
                {t.description && (
                  <div className="mt-0.5 text-xs text-fg-secondary">{t.description}</div>
                )}
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-2 rounded-md text-xs font-semibold text-brand-blue transition-colors hover:text-brand-blue-hover"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="absolute right-2 top-2 grid size-6 place-items-center rounded-md text-fg-tertiary transition-colors hover:bg-bg-elevated-2 hover:text-fg-primary"
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
            {t.duration > 0 && (
              <span
                className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30"
                style={{ animation: `toastProgress ${t.duration}ms linear forwards` }}
              />
            )}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
