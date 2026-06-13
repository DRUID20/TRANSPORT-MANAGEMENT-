"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { signOut } from "@/server/actions/auth";

/**
 * Account menu — avatar pill that opens a small dropdown with the
 * current user's identity, links to settings, and Sign out.
 *
 * Lightweight pure-Tailwind implementation: dropdown closes on
 * outside-click and Escape. We avoid Radix here so the topbar's flatness
 * isn't pulled into a Provider tree.
 */
export function UserMenu({
  fullName,
  email,
  initials,
}: {
  fullName: string;
  email: string;
  initials: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-9 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-semibold text-brand-blue ring-1 ring-brand-blue/20 transition-shadow hover:shadow-soft hover:ring-brand-blue/40"
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="animate-content-in absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-modal"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="truncate text-sm font-semibold text-fg-primary">{fullName}</div>
            <div className="truncate text-xs text-fg-tertiary">{email}</div>
          </div>
          <div className="flex flex-col py-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-fg-secondary transition-colors hover:bg-bg-surface hover:text-fg-primary"
              role="menuitem"
            >
              <Settings className="size-3.5 text-fg-tertiary" />
              Settings
            </Link>
          </div>
          <form action={signOut} className="border-t border-border">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-status-danger transition-colors hover:bg-status-danger/5"
              role="menuitem"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
