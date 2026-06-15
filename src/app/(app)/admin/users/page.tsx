import { Users } from "lucide-react";
import { listOrgUsers } from "@/server/actions/users";
import { getCurrentUser } from "@/server/auth/current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { ROLES, isValidRoleKey } from "@/lib/auth/roles";
import { CreateUserForm } from "./create-user-form";
import { UserRowActions } from "./user-row-actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  let rows: Awaited<ReturnType<typeof listOrgUsers>>;
  try {
    rows = await listOrgUsers();
  } catch (e) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: "Admin", href: "/settings" }, { label: "Users & Roles" }]}
          eyebrow="Admin"
          title="Users & Roles"
          description="Create users, assign roles, and email them sign-in details."
        />
        <Card>
          <CardContent className="!p-6">
            <p className="text-sm text-status-danger">
              {e instanceof Error ? e.message : "Only admins can manage users."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const me = await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Admin", href: "/settings" }, { label: "Users & Roles" }]}
        eyebrow="Admin"
        title="Users & Roles"
        description="Create users and assign roles. Each new user is emailed a sign-in link and a temporary password."
      />

      <CreateUserForm />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="!p-6">
            <EmptyState icon={Users} title="No users yet" description="Invite your first teammate above." />
          </CardContent>
        </Card>
      ) : (
        <DataTable
          caption={
            <span>
              {rows.length} user{rows.length === 1 ? "" : "s"} in your organisation
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Name</DataTableHeaderCell>
              <DataTableHeaderCell>Email</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Last login</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Role &amp; actions</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rows.map((u) => {
              const roleLabel = isValidRoleKey(u.roleKey) ? ROLES[u.roleKey].label : u.roleKey;
              return (
                <DataTableRow key={u.id}>
                  <DataTableCell>
                    <span className="text-sm font-semibold text-fg-primary">{u.fullName}</span>
                    {me?.userId === u.id && (
                      <span className="ml-2 text-[11px] font-medium text-fg-tertiary">(you)</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="font-mono text-xs text-fg-secondary">{u.email}</DataTableCell>
                  <DataTableCell>
                    {u.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="neutral">Deactivated</Badge>
                    )}
                    <span className="ml-2 text-[11px] font-medium text-fg-tertiary">{roleLabel}</span>
                  </DataTableCell>
                  <DataTableCell className="text-xs text-fg-secondary">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Never"}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <UserRowActions
                      userId={u.id}
                      roleKey={u.roleKey}
                      isActive={u.isActive}
                      isSelf={me?.userId === u.id}
                    />
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
