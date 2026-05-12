"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SidebarBody } from "@/components/layout/sidebar-body";

/**
 * MobileSidebar — hamburger trigger + slide-in drawer. Renders only on
 * screens below md (the desktop sidebar takes over from md upwards).
 *
 * - Closes automatically on route change (via pathname effect)
 * - Closes on Escape, on backdrop click, and after any nav link click
 *   (handled by SidebarBody's onNavigate prop)
 * - Locks body scroll while open so the drawer's overflow controls scroll
 */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape; lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-bg-elevated text-fg-secondary shadow-soft transition-colors hover:border-border-strong hover:text-fg-primary md:hidden"
      >
        <Menu className="size-4" />
      </button>

      {open && (
        <>
          <div
            role="presentation"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-fg-primary/40 backdrop-blur-sm animate-content-in md:hidden"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Primary navigation"
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-bg-surface shadow-modal animate-content-in md:hidden"
          >
            <SidebarBody onNavigate={() => setOpen(false)} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute right-2 top-2 grid size-8 place-items-center rounded-md text-fg-tertiary transition-colors hover:bg-bg-elevated hover:text-fg-primary"
            >
              <X className="size-4" />
            </button>
          </aside>
        </>
      )}
    </>
  );
}
