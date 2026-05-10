import Link from "next/link";
import { CheckCheck, Inbox } from "lucide-react";
import { listNotifications } from "@/server/actions/notifications";
import { CURRENT_USER_EMPLOYEE_ID, getCurrentEmployee } from "@/server/auth/current-user";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { CATEGORY_LABELS } from "@/lib/types/notifications";
import { InboxList } from "./inbox-list";

export default async function InboxPage() {
  const me = getCurrentEmployee();
  // All in-app entries (read + unread) for the current user, latest first
  const items = await listNotifications({
    recipientId: CURRENT_USER_EMPLOYEE_ID,
    channel: "in_app",
    limit: 100,
  });
  const unread = items.filter((n) => n.status !== "read");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Notifications", href: "/notifications" },
          { label: "Inbox" },
        ]}
        eyebrow={`Inbox · ${me?.fullName ?? "Current user"}`}
        title="Your inbox"
        description={`${unread.length} unread of ${items.length} in-app messages`}
        actions={
          unread.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-status-danger/10 px-3 py-2 text-xs font-medium text-status-danger ring-1 ring-status-danger/30">
              <CheckCheck className="size-3.5" /> {unread.length} unread
            </span>
          ) : null
        }
      />

      <Card>
        <CardContent className="!p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-sm text-fg-tertiary">
              <Inbox className="size-8" />
              <span>No in-app notifications.</span>
            </div>
          ) : (
            <InboxList
              initialItems={items.map((n) => ({
                id: n.id,
                category: n.category,
                categoryLabel: CATEGORY_LABELS[n.category] ?? n.category,
                subject: n.subject,
                body: n.body,
                href: n.href,
                priority: n.priority,
                isRead: n.status === "read",
                createdAt: n.createdAt,
              }))}
            />
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <Link
          href="/notifications"
          className="text-sm text-fg-tertiary hover:text-fg-secondary"
        >
          ← Back to Notifications
        </Link>
      </div>
    </div>
  );
}
