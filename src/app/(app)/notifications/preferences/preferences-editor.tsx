"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, MessageSquare, Send, Smartphone } from "lucide-react";
import { sendTest, setPreference } from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPreference,
} from "@/lib/types/notifications";
import { cn } from "@/lib/utils";

const channelMeta: Array<{
  key: NotificationChannel;
  label: string;
  Icon: typeof Mail;
  bg: string;
}> = [
  { key: "in_app", label: "In-app", Icon: MessageSquare, bg: "ring-border" },
  { key: "email",  label: "Email",  Icon: Mail,           bg: "ring-brand-blue/30" },
  { key: "sms",    label: "SMS",    Icon: Smartphone,     bg: "ring-status-warning/30" },
];

export function PreferencesEditor({
  recipientId,
  preferences,
}: {
  recipientId: string;
  preferences: NotificationPreference[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [testNote, setTestNote] = useState<string | null>(null);
  const [state, setState] = useState<Record<NotificationCategory, NotificationChannel[]>>(() => {
    const out: Record<string, NotificationChannel[]> = {};
    for (const p of preferences) out[p.category] = [...p.channels];
    return out as Record<NotificationCategory, NotificationChannel[]>;
  });

  function toggle(category: NotificationCategory, channel: NotificationChannel) {
    setError(null);
    setTestNote(null);
    const current = new Set(state[category] ?? []);
    if (current.has(channel)) current.delete(channel);
    else current.add(channel);
    const next = [...current] as NotificationChannel[];
    setState((s) => ({ ...s, [category]: next }));
    start(async () => {
      const r = await setPreference({ recipientId, category, channels: next });
      if (!r.ok) setError(r.error);
    });
  }

  function fireTest(category: NotificationCategory) {
    setError(null);
    setTestNote(null);
    start(async () => {
      const r = await sendTest({ category, recipientId });
      if (!r.ok) {
        setError(`${CATEGORY_LABELS[category]} test failed: ${r.error}`);
        return;
      }
      setTestNote(`Test ${CATEGORY_LABELS[category]} dispatched. See the outbound log.`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}
      {testNote && (
        <div className="rounded-md border border-status-success/30 bg-status-success/10 p-3 text-sm text-status-success">
          {testNote}
        </div>
      )}
      {CATEGORY_GROUPS.map((group) => {
        const rows = group.categories.filter((c) => state[c] !== undefined);
        if (rows.length === 0) return null;
        return (
          <Card key={group.label}>
            <CardContent className="!p-0">
              <div className="border-b border-border bg-bg-base/40 px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">
                {group.label}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                    <th className="px-5 py-2 font-medium">Category</th>
                    {channelMeta.map((c) => (
                      <th key={c.key} className="px-3 py-2 text-center font-medium">{c.label}</th>
                    ))}
                    <th className="px-5 py-2 text-right font-medium">Test</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((cat) => (
                    <tr key={cat}>
                      <td className="px-5 py-2 text-fg-primary">{CATEGORY_LABELS[cat]}</td>
                      {channelMeta.map(({ key, Icon }) => {
                        const enabled = state[cat]?.includes(key) ?? false;
                        return (
                          <td key={key} className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggle(cat, key)}
                              disabled={pending}
                              className={cn(
                                "inline-flex size-7 items-center justify-center rounded-md ring-1 transition-all",
                                enabled
                                  ? "bg-brand-blue/15 text-brand-blue ring-brand-blue/30"
                                  : "bg-bg-base text-fg-tertiary ring-border hover:text-fg-secondary",
                              )}
                              title={enabled ? "Enabled — click to mute" : "Muted — click to enable"}
                            >
                              <Icon className="size-3.5" />
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-5 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fireTest(cat)}
                          disabled={pending || (state[cat]?.length ?? 0) === 0}
                        >
                          {pending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                          Send test
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
