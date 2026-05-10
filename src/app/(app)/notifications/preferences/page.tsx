import Link from "next/link";
import { listEmployees } from "@/server/actions/hr";
import { listPreferences } from "@/server/actions/notifications";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PreferencesEditor } from "./preferences-editor";

export default async function PreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>;
}) {
  const employees = await listEmployees({ status: "active" });
  const { employee: rawEmp } = await searchParams;
  const recipientId = rawEmp ?? employees[0]?.id ?? "";
  const preferences = recipientId ? await listPreferences(recipientId) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Notifications", href: "/notifications" },
          { label: "Preferences" },
        ]}
        eyebrow="Communications · Preferences"
        title="Notification Preferences"
        description="Choose channels per category for each employee. Mandatory categories cannot be muted."
      />

      <Card>
        <CardContent className="!p-4">
          <form className="flex items-center gap-3">
            <label
              htmlFor="employee"
              className="text-xs uppercase tracking-wider text-fg-tertiary"
            >
              Employee
            </label>
            <select
              id="employee"
              name="employee"
              defaultValue={recipientId}
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-fg-primary"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} — {e.jobTitle}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              Show
            </button>
          </form>
        </CardContent>
      </Card>

      {recipientId && preferences.length > 0 ? (
        <PreferencesEditor recipientId={recipientId} preferences={preferences} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-fg-tertiary">
            No preferences on file for this employee.
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Link href="/notifications" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Notifications
        </Link>
      </div>
    </div>
  );
}
