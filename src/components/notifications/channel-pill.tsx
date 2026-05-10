import { Mail, MessageSquare, Smartphone } from "lucide-react";
import type { NotificationChannel, NotificationStatus } from "@/lib/types/notifications";

const channelIcon: Record<NotificationChannel, typeof Mail> = {
  email: Mail,
  sms: Smartphone,
  in_app: MessageSquare,
};

const channelStyle: Record<NotificationChannel, string> = {
  email: "bg-brand-blue/10 text-brand-blue ring-brand-blue/30",
  sms: "bg-status-warning/10 text-status-warning ring-status-warning/30",
  in_app: "bg-bg-base text-fg-secondary ring-border",
};

const channelLabel: Record<NotificationChannel, string> = {
  email: "Email",
  sms: "SMS",
  in_app: "In-app",
};

export function ChannelPill({ channel }: { channel: NotificationChannel }) {
  const Icon = channelIcon[channel];
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 " +
        channelStyle[channel]
      }
    >
      <Icon className="size-3" /> {channelLabel[channel]}
    </span>
  );
}

const statusStyle: Record<NotificationStatus, string> = {
  queued:    "bg-bg-base text-fg-secondary ring-border",
  sent:      "bg-brand-blue/10 text-brand-blue ring-brand-blue/30",
  delivered: "bg-status-success/10 text-status-success ring-status-success/30",
  failed:    "bg-status-danger/10 text-status-danger ring-status-danger/30",
  bounced:   "bg-status-danger/10 text-status-danger ring-status-danger/30",
  read:      "bg-bg-base text-fg-tertiary ring-border",
};

export function StatusPill({ status }: { status: NotificationStatus }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 " +
        statusStyle[status]
      }
    >
      {status}
    </span>
  );
}
