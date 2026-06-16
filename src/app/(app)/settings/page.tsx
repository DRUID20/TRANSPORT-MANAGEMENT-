import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser } from "@/server/auth/current-user";
import { getMyProfilePhotoKey } from "@/server/actions/profile";
import { ChangePassword } from "./change-password";
import { ProfilePhoto } from "./profile-photo";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

/**
 * Settings — workspace preferences + personal account (profile photo,
 * change password).
 *
 * Preferences (theme, dispatch defaults) stay in localStorage; account
 * fields persist on the user row in the database.
 */
export default async function SettingsPage() {
  const me = await getCurrentUser();
  const photoKey = await getMyProfilePhotoKey();

  const fullName = me?.fullName ?? "";
  const initials = computeInitials(fullName);
  // Auth-proxied URL so the bytes go through our /api/files check.
  const photoUrl = photoKey
    ? `/api/files/${photoKey.split("/").map(encodeURIComponent).join("/")}`
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Personal account, security and workspace preferences."
      />
      <ProfilePhoto initials={initials} initialUrl={photoUrl} />
      <ChangePassword />
      <SettingsForm />
    </div>
  );
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
