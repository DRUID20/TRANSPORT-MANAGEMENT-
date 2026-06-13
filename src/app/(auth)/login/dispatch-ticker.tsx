"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * DispatchTicker — small auto-cycling live-status panel for the login left
 * pane. Shows realistic fuel-haul trips rotating through one at a time so
 * the login page communicates "this is an actual ops tool" instead of
 * looking like another auth shell. Domain-specific, restrained, no
 * marquee scroll — just a cross-fade every 4 seconds.
 */
type Ticker = {
  truck: string;
  product: "PMS" | "AGO";
  origin: string;
  destination: string;
  status: "loading" | "in transit" | "at border" | "discharging";
};

const FEED: Ticker[] = [
  { truck: "KCB 234L", product: "AGO", origin: "KPC Mombasa", destination: "Nairobi", status: "in transit" },
  { truck: "KDA 117K", product: "PMS", origin: "KPC Nairobi", destination: "Eldoret", status: "loading" },
  { truck: "ZB 1180T", product: "AGO", origin: "KPC Mombasa", destination: "Kampala", status: "at border" },
  { truck: "KBW 882P", product: "AGO", origin: "KPRL Mombasa", destination: "Kisumu", status: "discharging" },
  { truck: "KCT 559M", product: "PMS", origin: "KPC Eldoret", destination: "Juba", status: "in transit" },
];

const TONE: Record<Ticker["status"], string> = {
  loading: "text-status-warning",
  "in transit": "text-brand-cyan",
  "at border": "text-status-warning",
  discharging: "text-status-success",
};

export function DispatchTicker() {
  const [i, setI] = useState(0);
  const [rotate, setRotate] = useState(true);

  useEffect(() => {
    // Honor reduced-motion: lock to a calm static snapshot of all rows.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setRotate(false);
      return;
    }
    const id = window.setInterval(() => {
      setI((n) => (n + 1) % FEED.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="grid gap-2">
      {FEED.map((row, idx) => {
        const visible = !rotate || idx === i;
        return (
          <div
            key={row.truck}
            aria-hidden={!visible}
            className={cn(
              "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 backdrop-blur transition-all duration-700",
              visible ? "opacity-100" : "opacity-30",
            )}
            style={{ transform: visible ? "none" : "translateY(2px)" }}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                visible ? TONE[row.status].replace("text-", "bg-") : "bg-white/15",
              )}
            />
            <div className="grid min-w-0 gap-0.5">
              <div className="flex items-baseline gap-2 truncate">
                <span className="font-mono text-[11px] uppercase tracking-wider text-white">
                  {row.truck}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
                  {row.product}
                </span>
              </div>
              <div className="truncate text-[11px] text-white/55">
                {row.origin} <span className="text-white/30">to</span> {row.destination}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 font-mono text-[10px] uppercase tracking-[0.14em]",
                TONE[row.status],
              )}
            >
              {row.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
