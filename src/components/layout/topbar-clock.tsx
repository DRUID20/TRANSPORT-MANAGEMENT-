"use client";

import { useEffect, useState } from "react";

export function TopbarClock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden items-center gap-2 rounded-md border border-border bg-bg-elevated px-2.5 py-1.5 lg:flex">
      <span className="size-1.5 rounded-full bg-status-success animate-pulse" />
      <span className="font-mono text-xs tnum text-fg-secondary">
        {now.toUTCString().slice(17, 25)} UTC
      </span>
    </div>
  );
}
