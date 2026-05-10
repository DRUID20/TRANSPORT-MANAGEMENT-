"use server";

import { revalidatePath } from "next/cache";
import { listComplianceRecords } from "@/server/actions/hr-compliance";
import { listEmployees } from "@/server/actions/hr";
import { listLeaveRequests, listAttendance } from "@/server/actions/leave";
import { listNotifications } from "@/server/actions/notifications";
import { notify } from "@/server/notifications/service";
import {
  KIND_LABELS,
  complianceStatus,
  daysUntilExpiry,
} from "@/lib/types/hr-compliance";
import { CURRENT_USER_EMPLOYEE_ID } from "@/server/auth/current-user";

const HR_MANAGER_ID = "emp-004";

export type JobResult = { ok: true; sent: number } | { ok: false; error: string };

/**
 * Walks all compliance records and notifies HR for each that's:
 *   - already expired (compliance_expired, high priority)
 *   - expiring within 30 days (compliance_expiring, normal priority)
 *
 * In production this runs as a Vercel Cron daily at 06:00 EAT.
 */
export async function runComplianceCheck(): Promise<JobResult> {
  const records = await listComplianceRecords();
  const employees = await listEmployees();
  const empById = new Map(employees.map((e) => [e.id, e]));

  let sent = 0;
  for (const r of records) {
    const status = complianceStatus(r.expiryDate);
    if (status !== "expired" && status !== "expiring_soon") continue;
    const days = daysUntilExpiry(r.expiryDate);
    const employee = empById.get(r.employeeId);
    const kind = r.label
      ? `${KIND_LABELS[r.kind]} (${r.label})`
      : KIND_LABELS[r.kind];

    await notify({
      category: status === "expired" ? "compliance_expired" : "compliance_expiring",
      recipientId: HR_MANAGER_ID,
      payload: {
        kind,
        employee: employee?.fullName ?? r.employeeId,
        expiryDate: r.expiryDate ?? "—",
        daysToExpiry: days === null ? "" : String(Math.abs(days)),
      },
      href: "/hr/compliance",
      priority: status === "expired" ? "high" : "normal",
    });
    sent++;
  }
  revalidatePath("/notifications");
  revalidatePath("/notifications/log");
  return { ok: true, sent };
}

/**
 * Builds today's digest for the current user based on activity over the last
 * 24 hours, then dispatches via their preferred digest channels (email by
 * default).
 *
 * In production this runs as a Vercel Cron daily at 18:00 EAT.
 */
export async function runDailyDigest(): Promise<JobResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();

  const recent = await listNotifications({});
  const recentIn24h = recent.filter((n) => n.createdAt >= sinceIso);

  const leaveRequests = await listLeaveRequests({ status: "pending" });
  const attendance = await listAttendance({ fromDate: sinceIso.slice(0, 10) });
  const sickToday = attendance.filter((a) => a.status === "sick").length;
  const halfDays = attendance.filter((a) => a.status === "half_day").length;

  // Compose a 1-2 line summary per recipient (kept terse — SMS-friendly)
  const summary = [
    `${recentIn24h.length} events`,
    `${leaveRequests.length} leave pending`,
    `${sickToday} sick`,
    halfDays > 0 ? `${halfDays} half-days` : null,
  ].filter(Boolean).join(", ");

  const result = await notify({
    category: "digest_daily",
    recipientId: CURRENT_USER_EMPLOYEE_ID,
    payload: {
      date: new Date().toISOString().slice(0, 10),
      summary,
    },
    href: "/dashboard",
    priority: "low",
  });
  revalidatePath("/notifications");
  return { ok: true, sent: result.succeeded };
}
