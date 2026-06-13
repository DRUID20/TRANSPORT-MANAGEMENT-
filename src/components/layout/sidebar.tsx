"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarBody } from "@/components/layout/sidebar-body";
import type { SidebarUserInfo } from "@/components/layout/sidebar-user";

const STORAGE_KEY = "tx.sidebar.collapsed";

/**
 * Desktop sidebar — hidden below md (the mobile drawer takes over). Width
 * toggles between 240px (expanded) and 68px (icon-only). State is
 * persisted to localStorage so users only choose once.
 */
export function Sidebar({ user }: { user?: SidebarUserInfo }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // localStorage may be unavailable in private mode; ignore silently.
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "relative hidden h-screen shrink-0 flex-col border-r border-border bg-bg-surface transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-[68px]" : "w-60",
      )}
      aria-label="Primary navigation"
    >
      <SidebarBody collapsed={collapsed} user={user} />

      {/* Collapse toggle — pinned to the right edge so it's reachable
          regardless of the sidebar's expanded state. */}
      {hydrated && (
        <button
          type="button"
          onClick={toggle}
          className="absolute -right-3 top-16 z-10 grid size-6 place-items-center rounded-full border border-border bg-bg-elevated text-fg-tertiary shadow-soft transition-colors hover:bg-bg-elevated-2 hover:text-fg-primary"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeftOpen className="size-3" /> : <PanelLeftClose className="size-3" />}
        </button>
      )}
    </aside>
  );
}
