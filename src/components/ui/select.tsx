"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Custom Select (DESIGN.md §6/§15 — native selects are banned).
 *
 * Design: a REAL `<select>` lives underneath as the single source of truth so
 * FormData, `required`, `ref`, and native onChange semantics keep working
 * exactly as before — the props type is unchanged, so every existing call site
 * (controlled `value`/`onChange` or uncontrolled `name`/`defaultValue`) is a
 * drop-in. On top we render a styled trigger + a portalled listbox (portal so
 * it escapes `overflow-hidden` form sections). Selecting an option writes the
 * value into the hidden select via the native setter and dispatches a `change`
 * event, which drives React's onChange for both controlled and uncontrolled use.
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

interface Opt {
  value: string;
  label: string;
  disabled?: boolean;
}

function extractText(node: React.ReactNode): string {
  if (node == null || node === false || node === true) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) return extractText((node.props as { children?: React.ReactNode }).children);
  return "";
}

function extractOptions(children: React.ReactNode): Opt[] {
  const out: Opt[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const t = child.type;
    const props = child.props as { value?: string | number; disabled?: boolean; children?: React.ReactNode };
    if (t === "option") {
      out.push({
        value: String(props.value ?? ""),
        label: extractText(props.children),
        disabled: !!props.disabled,
      });
    } else if (t === "optgroup" || t === React.Fragment) {
      out.push(...extractOptions(props.children));
    }
  });
  return out;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, error, value, defaultValue, onChange, disabled, name, required, id, ...rest },
  forwardedRef,
) {
  const options = React.useMemo(() => extractOptions(children), [children]);
  const isControlled = value !== undefined;

  const selectRef = React.useRef<HTMLSelectElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const popupRef = React.useRef<HTMLDivElement | null>(null);

  const [internal, setInternal] = React.useState<string>(() => {
    if (defaultValue !== undefined) return String(defaultValue);
    const firstEnabled = options.find((o) => !o.disabled);
    return firstEnabled ? firstEnabled.value : "";
  });
  const current = isControlled ? String(value) : internal;
  const currentOpt = options.find((o) => o.value === current);

  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [rect, setRect] = React.useState<{ top: number; left: number; width: number } | null>(null);

  React.useEffect(() => setMounted(true), []);

  const setRef = (el: HTMLSelectElement | null) => {
    selectRef.current = el;
    if (typeof forwardedRef === "function") forwardedRef(el);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLSelectElement | null>).current = el;
  };

  const searchable = options.length > 8;
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function position() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 6, left: r.left, width: r.width });
  }

  function openMenu() {
    if (disabled) return;
    position();
    setQuery("");
    const idx = filtered.findIndex((o) => o.value === current);
    setActive(idx >= 0 ? idx : filtered.findIndex((o) => !o.disabled));
    setOpen(true);
  }

  function closeMenu(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function commit(v: string) {
    const el = selectRef.current;
    if (el) {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setter?.call(el, v);
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    closeMenu();
  }

  // Reposition while open; close on outside click.
  React.useEffect(() => {
    if (!open) return;
    const onScroll = () => position();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popupRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
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

  React.useEffect(() => setActive(0), [query]);

  function moveActive(dir: 1 | -1) {
    setActive((a) => {
      let i = a;
      for (let n = 0; n < filtered.length; n++) {
        i = (i + dir + filtered.length) % filtered.length;
        if (!filtered[i]?.disabled) return i;
      }
      return a;
    });
  }

  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        closeMenu();
      }
      return;
    }
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    // Open (non-searchable keeps focus on the trigger; searchable handles its own keys).
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const o = filtered[active];
      if (o && !o.disabled) commit(o.value);
    }
  }

  const triggerCls = cn(
    "flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-bg-elevated pl-3 pr-2.5 text-sm shadow-soft transition-all",
    "focus-visible:outline-none focus-visible:ring-[3px]",
    error
      ? "border-status-danger/60 focus-visible:border-status-danger focus-visible:ring-status-danger/20"
      : "border-border hover:border-border-strong focus-visible:border-brand-blue focus-visible:ring-brand-blue/25",
    open && (error ? "border-status-danger ring-[3px] ring-status-danger/20" : "border-brand-blue ring-[3px] ring-brand-blue/25"),
    disabled && "cursor-not-allowed bg-bg-surface opacity-60",
    className,
  );

  const placeholderish = current === "" || !currentOpt;

  return (
    <div className="relative">
      {/* Source of truth — real select, visually hidden but in the DOM/form. */}
      <select
        ref={setRef}
        name={name}
        id={id}
        required={required}
        disabled={disabled}
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
      >
        {children}
      </select>

      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? `${id ?? name ?? "select"}-listbox` : undefined}
        disabled={disabled}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onTriggerKey}
        className={triggerCls}
      >
        <span className={cn("truncate", placeholderish ? "text-fg-tertiary" : "text-fg-primary")}>
          {currentOpt ? currentOpt.label : "Select…"}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-fg-tertiary transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {mounted &&
        open &&
        rect &&
        createPortal(
          <div
            ref={popupRef}
            id={`${id ?? name ?? "select"}-listbox`}
            role="listbox"
            style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 120 }}
            className="flex max-h-[min(50vh,320px)] flex-col overflow-hidden rounded-xl border border-border-strong bg-bg-surface shadow-modal animate-in fade-in zoom-in-95 duration-150"
          >
            {searchable && (
              <div className="flex items-center gap-2 border-b border-border px-3">
                <Search className="size-3.5 shrink-0 text-fg-tertiary" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); moveActive(1); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); moveActive(-1); }
                    else if (e.key === "Enter") { e.preventDefault(); const o = filtered[active]; if (o && !o.disabled) commit(o.value); }
                    else if (e.key === "Escape") { e.preventDefault(); closeMenu(); }
                  }}
                  placeholder="Search…"
                  className="h-9 w-full bg-transparent text-sm text-fg-primary outline-none placeholder:text-fg-tertiary"
                />
              </div>
            )}
            <div className="overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-fg-tertiary">No matches</div>
              ) : (
                filtered.map((o, i) => {
                  const selected = o.value === current;
                  return (
                    <button
                      key={`${o.value}-${i}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={o.disabled}
                      onMouseMove={() => setActive(i)}
                      onClick={() => !o.disabled && commit(o.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                        o.disabled
                          ? "cursor-not-allowed text-fg-tertiary opacity-60"
                          : i === active
                            ? "bg-bg-elevated-2 text-fg-primary"
                            : "text-fg-secondary",
                      )}
                    >
                      <span className="flex-1 truncate">{o.label}</span>
                      {selected && <Check className="size-4 shrink-0 text-brand-blue" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});
