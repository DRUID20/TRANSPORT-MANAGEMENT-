import Link from "next/link";
import { Bell, FileEdit, ListChecks, Mail, ScrollText, Smartphone, Sliders } from "lucide-react";
import {
  listNotifications,
  totals,
} from "@/server/actions/notifications";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ChannelPill, StatusPill } from "@/components/notifications/channel-pill";
import { CATEGORY_LABELS } from "@/lib/types/notifications";

export default async function NotificationsHubPage() {
  const t = await totals();
  const recent = await listNotifications({ limit: 12 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Communications"
        title="Notifications"
        description="Email + SMS + in-app messages dispatched by the system."
        actions={
          <Link
            href="/notifications/log"
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-blue px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-blue-hover"
          >
            <ScrollText className="size-3.5" />
            Outbound log
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={Bell} label="Total" value={t.total} />
        <Stat icon={Mail} label="Email" value={t.email} tone="info" />
        <Stat icon={Smartphone} label="SMS" value={t.sms} tone="warning" />
        <Stat icon={ListChecks} label="Failed" value={t.failed} tone="danger" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <NavCard
          href="/notifications/log"
          icon={ScrollText}
          title="Outbound log"
          desc="Every email + SMS + in-app entry the system has dispatched, with delivery status."
        />
        <NavCard
          href="/notifications/templates"
          icon={FileEdit}
          title="Templates"
          desc="Per-category email/SMS/in-app templates with {{placeholders}} for event data."
        />
        <NavCard
          href="/notifications/preferences"
          icon={Sliders}
          title="Preferences"
          desc="Per-employee channel preferences for each notification category."
        />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-fg-primary">Recent activity</h2>
            <Link href="/notifications/log" className="text-xs text-fg-tertiary hover:text-fg-primary">
              See all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">When</th>
                  <th className="px-5 py-2 font-medium">Channel</th>
                  <th className="px-5 py-2 font-medium">Category</th>
                  <th className="px-5 py-2 font-medium">Recipient</th>
                  <th className="px-5 py-2 font-medium">Subject</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((n) => (
                  <tr key={n.id} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2 font-mono text-[11px] tnum text-fg-tertiary">
                      {timeAgo(n.createdAt)}
                    </td>
                    <td className="px-5 py-2"><ChannelPill channel={n.channel} /></td>
                    <td className="px-5 py-2 text-xs text-fg-secondary">
                      {CATEGORY_LABELS[n.category] ?? n.category}
                    </td>
                    <td className="px-5 py-2 text-xs text-fg-primary">{n.recipientLabel}</td>
                    <td className="px-5 py-2 max-w-[24rem] truncate text-xs text-fg-secondary">
                      {n.subject}
                    </td>
                    <td className="px-5 py-2"><StatusPill status={n.status} /></td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No notifications yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone?: "default" | "info" | "warning" | "danger";
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "warning" ? "text-status-warning" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-fg-tertiary">
        <Icon className="size-3" /> {label}
      </div>
      <div className={`mt-1 text-2xl font-medium ${colour}`}>{value}</div>
    </div>
  );
}

function NavCard({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft"
    >
      <div className="flex size-10 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
        <Icon className="size-5" />
      </div>
      <div className="mt-3 text-base font-semibold text-fg-primary group-hover:text-brand-blue">
        {title}
      </div>
      <p className="mt-1 text-[12px] text-fg-secondary">{desc}</p>
    </Link>
  );
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const m = Math.round(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}
