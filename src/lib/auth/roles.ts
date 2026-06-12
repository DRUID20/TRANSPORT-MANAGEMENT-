/**
 * Role catalogue. The four operator-facing roles plus admin.
 *
 * Permissions are intentionally coarse-grained at this stage (sidebar
 * visibility + route gating); fine-grained per-resource permissions
 * land on the `roles.permissions` JSONB column when needed.
 */

export type RoleKey = "admin" | "dispatcher" | "accountant" | "driver" | "viewer";

export interface Role {
  key: RoleKey;
  label: string;
  description: string;
  /** Sidebar groups this role can see; empty array means everything. */
  visibleGroups: string[];
}

export const ROLES: Record<RoleKey, Role> = {
  admin: {
    key: "admin",
    label: "Administrator",
    description: "Full access including user management and settings.",
    visibleGroups: [], // all
  },
  dispatcher: {
    key: "dispatcher",
    label: "Dispatcher",
    description: "Operations focus — bookings, trips, fleet, compliance.",
    visibleGroups: [
      "Operations",
      "Partners",
      "People",
      "Communications",
      "Performance",
      "AI",
    ],
  },
  accountant: {
    key: "accountant",
    label: "Accountant",
    description: "Finance focus — invoices, bills, ledger, reports.",
    visibleGroups: [
      "Operations",
      "Partners",
      "Finance",
      "People",
      "Communications",
      "Performance",
    ],
  },
  driver: {
    key: "driver",
    label: "Driver",
    description: "View own trips + submit expenses + fuel logs.",
    visibleGroups: ["Operations", "Communications"],
  },
  viewer: {
    key: "viewer",
    label: "Viewer",
    description: "Read-only across operations.",
    visibleGroups: ["Operations", "Performance"],
  },
};

export const ROLE_KEYS: RoleKey[] = Object.keys(ROLES) as RoleKey[];

export function isValidRoleKey(value: string): value is RoleKey {
  return value in ROLES;
}

/**
 * True if a given role should see a sidebar group. Admin sees everything.
 */
export function canSeeGroup(roleKey: RoleKey | undefined, groupTitle: string): boolean {
  const role = roleKey ? ROLES[roleKey] : undefined;
  if (!role) return false;
  if (role.visibleGroups.length === 0) return true; // admin
  return role.visibleGroups.includes(groupTitle);
}
