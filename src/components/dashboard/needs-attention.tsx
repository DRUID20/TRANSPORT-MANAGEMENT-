"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AttentionItem {
  icon: LucideIcon;
  count: number;
  title: string;
  hint: string;
  tone: "danger" | "warning" | "info";
  href?: string;
}

const toneClasses = {
  danger: "text-status-danger",
  warning: "text-status-warning",
  info: "text-status-info",
};

export function NeedsAttention({ items }: { items: AttentionItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <CardDescription>Action items across the fleet</CardDescription>
      </CardHeader>
      <CardContent className="!p-0">
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-fg-tertiary">
            All clear — nothing urgent across the fleet.
          </p>
        ) : (
          <ul className="flex flex-col">
            {items.map((it) => {
              const Icon = it.icon;
              const Inner = (
                <div className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-bg-base/40">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md ring-1",
                      it.tone === "danger" && "bg-status-danger/10 text-status-danger ring-status-danger/20",
                      it.tone === "warning" && "bg-status-warning/10 text-status-warning ring-status-warning/20",
                      it.tone === "info" && "bg-status-info/10 text-status-info ring-status-info/20",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className={cn("font-mono text-lg tnum font-semibold", toneClasses[it.tone])}>
                        {it.count}
                      </span>
                      <span className="text-sm text-fg-primary">{it.title}</span>
                    </div>
                    <div className="text-xs text-fg-tertiary">{it.hint}</div>
                  </div>
                  <ChevronRight className="size-4 text-fg-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-fg-primary" />
                </div>
              );
              return (
                <li key={it.title} className="border-t border-border first:border-t-0">
                  {it.href ? (
                    <Link href={it.href} className="block">
                      {Inner}
                    </Link>
                  ) : (
                    Inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
