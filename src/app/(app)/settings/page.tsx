import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "./settings-form";

/**
 * Settings — workspace preferences.
 *
 * Current storage model: browser localStorage (per-device, per-user).
 * When the Supabase database lands, organisation-wide settings move to a
 * `settings` table (row-per-key) and this page gains a server-backed
 * section; the appearance + personal prefs stay local by design.
 */
export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Workspace preferences. Stored in this browser for now — organisation-wide settings move to the database once Supabase is connected."
      />
      <SettingsForm />
    </div>
  );
}
