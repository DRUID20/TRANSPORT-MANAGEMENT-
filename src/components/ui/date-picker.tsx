"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DatePicker (DESIGN.md §6/§9 — native date inputs are banned).
 *
 * Same pattern as the custom Select: a real <input type="date"> stays
 * underneath as the source of truth (FormData, required, ref, onChange all
 * preserved) and a styled trigger + portalled month-grid calendar render on
 * top. Used automatically by <Input type="date"> so no call site changes.
 */

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseISO(s?: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function fmtDisplay(d: Date) {
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]!.slice(0, 3)} ${d.getFullYear()}`;
}
/** Monday-first weekday index (0 = Mon … 6 = Sun). */
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

export interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: boolean;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { className, error, value, defaultValue, onChange, disabled, name, required, id, min, max, ...rest },
  forwardedRef,
) {
  const isControlled = value !== undefined;
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const popupRef = React.useRef<HTMLDivElement | null>(null);

  const [internal, setInternal] = React.useState<string>(
    defaultValue !== undefined ? String(defaultValue) : "",
  );
  const currentStr = isControlled ? String(value ?? "") : internal;
  const selected = parseISO(currentStr);

  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [view, setView] = React.useState<Date>(() => selected ?? new Date());
  const [rect, setRect] = React.useState<{ top: number; left: number; width: number } | null>(null);

  React.useEffect(() => setMounted(true), []);

  const setRef = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (typeof forwardedRef === "function") forwardedRef(el);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
  };

  function position() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 280) });
  }

  function openCal() {
    if (disabled) return;
    setView(selected ?? new Date());
    position();
    setOpen(true);
  }

  function commit(d: Date) {
    const iso = toISO(d);
    const el = inputRef.current;
    if (el) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(el, iso);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setOpen(false);
    triggerRef.current?.focus();
  }

  React.useEffect(() => {
    if (!open) return;
    const onScroll = () => position();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popupRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // Build the month grid (Monday-first, 6 rows).
  const grid = React.useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const lead = mondayIndex(first);
    const start = new Date(first);
    start.setDate(1 - lead);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [view]);

  const today = new Date();
  const todayISO = toISO(today);
  const minDate = parseISO(typeof min === "string" ? min : undefined);
  const maxDate = parseISO(typeof max === "string" ? max : undefined);

  const triggerCls = cn(
    "flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-bg-elevated px-3 text-sm shadow-soft transition-all",
    "focus-visible:outline-none focus-visible:ring-[3px]",
    error
      ? "border-status-danger/60 focus-visible:border-status-danger focus-visible:ring-status-danger/20"
      : "border-border hover:border-border-strong focus-visible:border-brand-blue focus-visible:ring-brand-blue/25",
    open && "border-brand-blue ring-[3px] ring-brand-blue/25",
    disabled && "cursor-not-allowed bg-bg-surface opacity-60",
    className,
  );

  return (
    <div className="relative">
      <input
        ref={setRef}
        type="date"
        name={name}
        id={id}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        aria-hidden="true"
        tabIndex={-1}
        value={isControlled ? value : undefined}
        defaultValue={isControlled ? undefined : defaultValue}
        onChange={(e) => {
          if (!isControlled) setInternal(e.currentTarget.value);
          onChange?.(e);
        }}
        className="sr-only"
        {...rest}
      />

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openCal())}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          else if ((e.key === "Enter" || e.key === " " || e.key === "ArrowDown") && !open) {
            e.preventDefault();
            openCal();
          }
        }}
        className={triggerCls}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={cn("truncate", selected ? "text-fg-primary" : "text-fg-tertiary")}>
          {selected ? fmtDisplay(selected) : "Select date"}
        </span>
        <CalendarIcon className="size-4 shrink-0 text-fg-tertiary" />
      </button>

      {mounted &&
        open &&
        rect &&
        createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label="Choose date"
            style={{ position: "fixed", top: rect.top, left: rect.left, zIndex: 120 }}
            className="w-[280px] rounded-xl border border-border-strong bg-bg-surface p-3 shadow-modal animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
                className="grid size-7 place-items-center rounded-md text-fg-tertiary transition-colors hover:bg-bg-elevated-2 hover:text-fg-primary"
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm font-semibold text-fg-primary">
                {MONTHS[view.getMonth()]} {view.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
                className="grid size-7 place-items-center rounded-md text-fg-tertiary transition-colors hover:bg-bg-elevated-2 hover:text-fg-primary"
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1 text-center text-[10px] font-medium uppercase text-fg-tertiary">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {grid.map((d) => {
                const iso = toISO(d);
                const inMonth = d.getMonth() === view.getMonth();
                const isToday = iso === todayISO;
                const isSelected = iso === currentStr;
                const disabledDay =
                  (minDate && d < minDate) || (maxDate && d > maxDate);
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!!disabledDay}
                    onClick={() => commit(d)}
                    className={cn(
                      "grid h-8 place-items-center rounded-md font-mono text-[12px] tabular-nums transition-colors",
                      !inMonth && "text-fg-tertiary/40",
                      inMonth && !isSelected && "text-fg-secondary hover:bg-bg-elevated-2 hover:text-fg-primary",
                      isToday && !isSelected && "text-brand-blue ring-1 ring-inset ring-brand-blue/40",
                      isSelected && "bg-brand-blue font-semibold text-white",
                      disabledDay && "cursor-not-allowed opacity-30 hover:bg-transparent",
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <button
                type="button"
                onClick={() => commit(new Date())}
                className="rounded-md px-2 py-1 text-xs font-medium text-brand-blue transition-colors hover:bg-bg-elevated-2"
              >
                Today
              </button>
              {currentStr && (
                <button
                  type="button"
                  onClick={() => {
                    const el = inputRef.current;
                    if (el) {
                      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
                      setter?.call(el, "");
                      el.dispatchEvent(new Event("input", { bubbles: true }));
                      el.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                    setOpen(false);
                  }}
                  className="rounded-md px-2 py-1 text-xs font-medium text-fg-tertiary transition-colors hover:bg-bg-elevated-2 hover:text-fg-primary"
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});
