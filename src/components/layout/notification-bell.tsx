"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Check, Inbox } from "lucide-react";
import { markRead } from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types/notifications";

export function NotificationBell({
  initialItems,
}: {
  initialItems: Notification[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setItems(initialItems), [initialItems]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((i) => i.status !== "read");

  async function handleMarkRead(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "read" } : i)));
    await markRead(id);
  }

  async function markAllRead() {
    const ids = unread.map((u) => u.id);
    setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, status: "read" } : i)));
    await Promise.all(ids.map((id) => markRead(id)));
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        className="relative"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-4" />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-status-danger px-1 font-mono text-[9px] font-semibold text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </Button>
      {open && (
        <div
          className="absolute right-0 top-12 z-50 flex w-[22rem] max-w-[90vw] flex-col rounded-lg border border-border bg-bg-elevated shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="text-sm font-semibold text-fg-primary">
              Notifications
              {unread.length > 0 && (
                <span className="ml-2 rounded-full bg-status-danger/15 px-1.5 py-0.5 font-mono text-[10px] text-status-danger">
                  {unread.length} new
                </span>
              )}
            </div>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] font-medium text-brand-blue hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-fg-tertiary">
                <Inbox className="size-8" />
                <span>You&apos;re all caught up.</span>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.slice(0, 8).map((n) => {
                  const isUnread = n.status !== "read";
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isUnread) handleMarkRead(n.id);
                          if (n.href) window.location.href = n.href;
                        }}
                        className={cn(
                          "flex w-full items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-bg-base/40",
                          n.priority === "high" && "border-l-2 border-status-danger",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            isUnread ? "bg-brand-blue" : "bg-transparent",
                          )}
                        />
                        <div className="flex-1 overflow-hidden">
                          <div
                            className={cn(
                              "truncate text-sm",
                              isUnread ? "font-medium text-fg-primary" : "text-fg-secondary",
                            )}
                          >
                            {n.subject}
                          </div>
                          <div className="truncate text-[11px] text-fg-secondary">
                            {n.body}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-fg-tertiary">
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <Link
              href="/notifications/inbox"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-medium text-fg-secondary hover:text-fg-primary"
            >
              <Inbox className="size-3" /> Open inbox
            </Link>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
            >
              <Check className="size-3" /> All notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
