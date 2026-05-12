import Link from "next/link";
import { CheckCheck, Inbox } from "lucide-react";
import { listNotifications } from "@/server/actions/notifications";
import { CURRENT_USER_EMPLOYEE_ID, getCurrentEmployee } from "@/server/auth/current-user";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { CATEGORY_LABELS } from "@/lib/types/notifications";
import { InboxList } from "./inbox-list";

export default async function InboxPage() {
  const me = getCurrentEmployee();
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
        description={`${unread.length} unread of ${items.length} in-app message${items.length === 1 ? "" : "s"}.`}
        actions={
          unread.length > 0 ? (
            <Badge variant="danger" dot>
              <CheckCheck className="size-3" />
              {unread.length} unread
            </Badge>
          ) : null
        }
      />

      {items.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={Inbox}
            title="Inbox empty"
            description="No in-app notifications yet. New alerts (compliance, dispatch, AR/AP) land here as they happen."
            action={
              <Link
                href="/notifications/preferences"
                className="text-sm text-brand-blue hover:underline"
              >
                Manage notification preferences →
              </Link>
            }
          />
        </div>
      ) : (
        <div className="surface-card !p-0 overflow-hidden">
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
        </div>
      )}

      <div className="text-center">
        <Link
          href="/notifications"
          className="text-sm text-fg-tertiary hover:text-fg-secondary"
        >
          ← Back to notifications
        </Link>
      </div>
    </div>
  );
}
