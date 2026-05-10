"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { markRead } from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  category: string;
  categoryLabel: string;
  subject: string;
  body: string;
  href?: string;
  priority: "low" | "normal" | "high";
  isRead: boolean;
  createdAt: string;
};

export function InboxList({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [pending, start] = useTransition();

  function handleRead(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
    start(async () => {
      await markRead(id);
    });
  }

  function readAll() {
    const unread = items.filter((i) => !i.isRead).map((i) => i.id);
    setItems((prev) => prev.map((i) => (unread.includes(i.id) ? { ...i, isRead: true } : i)));
    start(async () => {
      await Promise.all(unread.map((id) => markRead(id)));
    });
  }

  const unreadCount = items.filter((i) => !i.isRead).length;

  return (
    <>
      {unreadCount > 0 && (
        <div className="flex items-center justify-end border-b border-border px-5 py-2">
          <Button variant="outline" size="sm" onClick={readAll} disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Mark all read
          </Button>
        </div>
      )}
      <ul className="divide-y divide-border">
        {items.map((n) => (
          <li
            key={n.id}
            className={cn(
              "flex items-start gap-3 px-5 py-3 transition-colors",
              n.priority === "high" && "border-l-2 border-status-danger",
              !n.isRead && "bg-bg-base/30",
            )}
          >
            <span
              className={cn(
                "mt-1 size-2 shrink-0 rounded-full",
                !n.isRead ? "bg-brand-blue" : "bg-transparent",
              )}
            />
            <div className="flex-1 overflow-hidden">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "truncate text-sm",
                    !n.isRead ? "font-semibold text-fg-primary" : "text-fg-secondary",
                  )}
                >
                  {n.subject}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-fg-tertiary">
                  · {n.categoryLabel}
                </span>
              </div>
              <div className="truncate text-[12px] text-fg-secondary">{n.body}</div>
              <div className="mt-1 font-mono text-[10px] tnum text-fg-tertiary">
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => handleRead(n.id)}
                  className="rounded-md p-1.5 text-fg-tertiary transition-colors hover:bg-bg-base hover:text-fg-primary"
                  title="Mark read"
                >
                  <Check className="size-3.5" />
                </button>
              )}
              {n.href && (
                <Link
                  href={n.href}
                  onClick={() => !n.isRead && handleRead(n.id)}
                  className="rounded-md p-1.5 text-fg-tertiary transition-colors hover:bg-bg-base hover:text-brand-blue"
                  title="Open"
                >
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
