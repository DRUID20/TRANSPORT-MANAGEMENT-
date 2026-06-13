"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { navGroups } from "@/components/layout/nav-data";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

type Dest = {
  href: string;
  label: string;
  group: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const DESTINATIONS: Dest[] = navGroups.flatMap((g) =>
  g.items.map((i) => ({ href: i.href, label: i.label, group: g.title, Icon: i.icon })),
);

/**
 * Command palette — Linear-style ⌘K navigator (DESIGN.md §7/§14).
 * Renders the topbar search pill AND the dialog so they share state without
 * context plumbing. Fuzzy-filters every navigable destination; ↑/↓ to move,
 * Enter to go, Esc to close.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DESTINATIONS;
    return DESTINATIONS.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.group.toLowerCase().includes(q) ||
        d.href.toLowerCase().includes(q),
    );
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  // Global ⌘K / Ctrl+K toggle + Esc.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keep the active row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) go(r.href);
    }
  }

  return (
    <>
      {/* Trigger pill (§7) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 text-sm text-fg-tertiary transition-colors hover:border-border-strong hover:text-fg-secondary"
        aria-label="Open command menu"
      >
        <Search className="size-4 text-fg-tertiary group-hover:text-fg-secondary" />
        <span className="flex-1 text-left">Search trips, trucks, customers…</span>
        <span className="hidden items-center gap-1 sm:inline-flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:pt-[14vh]">
          {/* Scrim */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={close}
            aria-hidden="true"
          />
          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            className="relative z-10 flex w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-border-strong bg-bg-surface shadow-modal animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-4 shrink-0 text-fg-tertiary" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Jump to…"
                className="h-12 w-full bg-transparent text-sm text-fg-primary outline-none placeholder:text-fg-tertiary"
              />
              <Kbd className="shrink-0">esc</Kbd>
            </div>

            <div ref={listRef} className="max-h-[min(60vh,380px)] overflow-y-auto p-1.5">
              {results.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-fg-tertiary">
                  No matches for “{query}”.
                </div>
              ) : (
                results.map((r, i) => (
                  <button
                    key={r.href}
                    data-idx={i}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(r.href)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      i === active ? "bg-bg-elevated-2 text-fg-primary" : "text-fg-secondary",
                    )}
                  >
                    <r.Icon
                      className={cn("size-4 shrink-0", i === active ? "text-brand-blue" : "text-fg-tertiary")}
                      strokeWidth={1.5}
                    />
                    <span className="flex-1 truncate">{r.label}</span>
                    <span className="shrink-0 text-[11px] uppercase tracking-[0.04em] text-fg-tertiary">
                      {r.group}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-border bg-bg-elevated/50 px-4 py-2 text-[11px] text-fg-tertiary">
              <span className="inline-flex items-center gap-1">
                <ArrowUp className="size-3" />
                <ArrowDown className="size-3" />
                navigate
              </span>
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="size-3" />
                open
              </span>
              <span className="ml-auto font-mono tabular-nums">{results.length} results</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
