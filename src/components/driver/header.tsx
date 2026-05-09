"use client";

import { useEffect, useState } from "react";
import { LogOut, Wifi, WifiOff } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { clearDriverSession } from "@/server/actions/driver-session";
import { Button } from "@/components/ui/button";

export function DriverHeader() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-brand-navy px-4 text-white">
      <Logo variant="icon" />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">Driver</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/70">
          TX System
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <span
          className={
            "inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] " +
            (online
              ? "bg-status-success/15 text-status-success ring-1 ring-status-success/30"
              : "bg-status-danger/15 text-status-danger ring-1 ring-status-danger/30")
          }
        >
          {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
          {online ? "ONLINE" : "OFFLINE"}
        </span>
        <ThemeToggle />
        <form action={clearDriverSession}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
