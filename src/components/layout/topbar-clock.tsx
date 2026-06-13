"use client";

import { useEffect, useState } from "react";

export function TopbarClock() {
  // Null until mounted. A live clock can't be server-rendered without a
  // hydration mismatch (the server's second never equals the client's), so
  // we render a stable placeholder during SSR and fill the time in on the
  // client after mount.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden items-center gap-2 rounded-md border border-border bg-bg-elevated px-2.5 py-1.5 lg:flex">
      <span className="size-1.5 rounded-full bg-status-success animate-pulse" />
      <span className="font-mono text-xs tnum text-fg-secondary">
        {now ? `${now.toUTCString().slice(17, 25)} UTC` : "--:--:-- UTC"}
      </span>
    </div>
  );
}
