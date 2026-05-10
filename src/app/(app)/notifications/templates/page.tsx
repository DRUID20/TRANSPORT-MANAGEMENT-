import Link from "next/link";
import { listTemplates } from "@/server/actions/notifications";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ChannelPill } from "@/components/notifications/channel-pill";
import { CATEGORY_GROUPS, CATEGORY_LABELS } from "@/lib/types/notifications";
import { TemplatesEditor } from "./templates-editor";

export default async function TemplatesPage() {
  const templates = await listTemplates();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Notifications", href: "/notifications" },
          { label: "Templates" },
        ]}
        eyebrow="Communications · Templates"
        title="Notification Templates"
        description="Subject + body per (category × channel). Use {{placeholders}} that match the event payload."
      />

      <Card>
        <CardContent className="!p-5 text-[11px] text-fg-tertiary">
          <strong className="text-fg-secondary">Available placeholders:</strong>{" "}
          <code className="font-mono">{"{{tripNumber}}"}</code>{" "}
          <code className="font-mono">{"{{employee}}"}</code>{" "}
          <code className="font-mono">{"{{customer}}"}</code>{" "}
          <code className="font-mono">{"{{currency}}"}</code>{" "}
          <code className="font-mono">{"{{amount}}"}</code>{" "}
          <code className="font-mono">{"{{dueDate}}"}</code>{" "}
          <code className="font-mono">{"{{leaveType}}"}</code>{" "}
          <code className="font-mono">{"{{period}}"}</code>{" "}
          <code className="font-mono">{"{{kind}}"}</code>{" "}
          <code className="font-mono">{"{{href}}"}</code> … and any field passed in the
          notify() payload. Unknown placeholders render as empty strings.
        </CardContent>
      </Card>

      {CATEGORY_GROUPS.map((group) => {
        const ts = templates.filter((t) => group.categories.includes(t.category));
        if (ts.length === 0) return null;
        // group by category within
        const byCat = new Map<string, typeof ts>();
        for (const t of ts) {
          const arr = byCat.get(t.category) ?? [];
          arr.push(t);
          byCat.set(t.category, arr);
        }
        return (
          <section key={group.label}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-tertiary">
              {group.label}
            </h2>
            <div className="grid gap-3">
              {[...byCat.entries()].map(([cat, list]) => (
                <Card key={cat}>
                  <CardContent className="!p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-fg-primary">
                        {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {list.map((t) => (
                          <ChannelPill key={t.id} channel={t.channel} />
                        ))}
                      </div>
                    </div>
                    <TemplatesEditor templates={list} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      <div className="text-center">
        <Link href="/notifications" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Notifications
        </Link>
      </div>
    </div>
  );
}
