"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { signOut } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

export type SidebarUserInfo = {
  fullName: string;
  email: string;
  roleKey: string;
  initials: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  dispatcher: "Dispatcher",
  accountant: "Accountant",
  viewer: "Viewer",
};

/**
 * Sidebar bottom user card (DESIGN.md §7). 32px avatar + name + role;
 * opens a profile menu upward with Settings and Sign out.
 */
export function SidebarUser({
  user,
  collapsed = false,
  onNavigate,
}: {
  user: SidebarUserInfo;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const role = ROLE_LABELS[user.roleKey] ?? user.roleKey;

  return (
    <div ref={ref} className="relative border-t border-sidebar-border p-2">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-white/10",
          collapsed && "justify-center p-1.5",
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/20 font-mono text-[11px] font-semibold text-gold ring-1 ring-gold/30">
          {user.initials}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-medium text-sidebar-fg">
                {user.fullName}
              </span>
              <span className="block truncate text-[11px] text-sidebar-muted">{role}</span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-muted" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="animate-content-in absolute bottom-full left-2 right-2 z-50 mb-2 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-modal"
        >
          <div className="border-b border-border px-3 py-2.5">
            <div className="truncate text-[13px] font-semibold text-fg-primary">{user.fullName}</div>
            <div className="truncate text-[11px] text-fg-tertiary">{user.email}</div>
          </div>
          <div className="py-1">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg-secondary transition-colors hover:bg-bg-surface hover:text-fg-primary"
            >
              <Settings className="size-4 text-fg-tertiary" />
              Settings
            </Link>
          </div>
          <form action={signOut} className="border-t border-border">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-status-danger transition-colors hover:bg-status-danger/5"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
