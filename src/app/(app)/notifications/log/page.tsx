import Link from "next/link";
import { listNotifications } from "@/server/actions/notifications";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ChannelPill, StatusPill } from "@/components/notifications/channel-pill";
import {
  CATEGORY_LABELS,
  type NotificationChannel,
  type NotificationStatus,
} from "@/lib/types/notifications";
import { LogFilters } from "./log-filters";

const VALID_CHANNELS: NotificationChannel[] = ["email", "sms", "in_app"];
const VALID_STATUS: NotificationStatus[] = ["queued", "sent", "delivered", "failed", "bounced", "read"];

export default async function NotificationLogPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; status?: string }>;
}) {
  const { channel: rawCh, status: rawSt } = await searchParams;
  const channel = (VALID_CHANNELS as string[]).includes(rawCh ?? "")
    ? (rawCh as NotificationChannel)
    : undefined;
  const status = (VALID_STATUS as string[]).includes(rawSt ?? "")
    ? (rawSt as NotificationStatus)
    : undefined;

  const list = await listNotifications({ channel, status, limit: 200 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Notifications", href: "/notifications" },
          { label: "Outbound log" },
        ]}
        eyebrow="Communications"
        title="Outbound log"
        description={`${list.length} record${list.length === 1 ? "" : "s"}`}
      />

      <LogFilters activeChannel={channel ?? "all"} activeStatus={status ?? "all"} />

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-5 py-3 font-medium">Channel</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Recipient</th>
                  <th className="px-5 py-3 font-medium">Destination</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((n) => (
                  <tr key={n.id} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2 font-mono text-[11px] tnum text-fg-tertiary">
                      {new Date(n.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-2"><ChannelPill channel={n.channel} /></td>
                    <td className="px-5 py-2 text-xs text-fg-secondary">
                      {CATEGORY_LABELS[n.category] ?? n.category}
                    </td>
                    <td className="px-5 py-2 text-xs text-fg-primary">{n.recipientLabel}</td>
                    <td className="px-5 py-2 font-mono text-[11px] text-fg-tertiary">
                      {n.destination || "—"}
                    </td>
                    <td className="px-5 py-2 max-w-[24rem] truncate text-xs text-fg-secondary">
                      {n.subject}
                      {n.error && (
                        <div className="mt-0.5 truncate text-[10px] text-status-danger">
                          {n.error}
                        </div>
                      )}
                      {n.providerMessageId && (
                        <div className="mt-0.5 font-mono text-[9px] text-fg-tertiary">
                          msg-id {n.providerMessageId}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-2"><StatusPill status={n.status} /></td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No log entries match the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/notifications" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Notifications
        </Link>
      </div>
    </div>
  );
}
