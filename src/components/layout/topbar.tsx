"use client";

import { Bell, Command, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useEffect, useState } from "react";

export function Topbar() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg-base/80 px-4 backdrop-blur-xl">
      {/* Search / command palette trigger */}
      <button
        type="button"
        className="group inline-flex h-9 flex-1 max-w-md items-center gap-2 rounded-md border border-border bg-bg-elevated px-3 text-sm text-fg-tertiary transition-colors hover:border-border-strong hover:text-fg-secondary"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search trips, trucks, customers…</span>
        <kbd className="hidden items-center gap-0.5 rounded border border-border bg-bg-base px-1.5 py-0.5 font-mono text-[10px] text-fg-tertiary sm:inline-flex">
          <Command className="size-2.5" />K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Live clock — JetBrains Mono, SpaceX-control feel */}
        <div className="hidden items-center gap-2 rounded-md border border-border bg-bg-elevated px-2.5 py-1.5 lg:flex">
          <span className="size-1.5 rounded-full bg-status-success animate-pulse" />
          <span className="font-mono text-xs tnum text-fg-secondary">
            {now.toUTCString().slice(17, 25)} UTC
          </span>
        </div>

        <ThemeToggle />

        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-status-danger" />
        </Button>

        {/* Avatar (placeholder) */}
        <div className="flex size-9 items-center justify-center rounded-full bg-bg-elevated text-xs font-medium text-fg-secondary ring-1 ring-border">
          NV
        </div>
      </div>
    </header>
  );
}
