"use server";

import { revalidatePath } from "next/cache";
import { listComplianceRecords } from "@/server/actions/hr-compliance";
import { listEmployees } from "@/server/actions/hr";
import { listLeaveRequests, listAttendance } from "@/server/actions/leave";
import { listNotifications } from "@/server/actions/notifications";
import {
  arAgingByCustomer,
  fleetUtilisation,
  profitAndLoss,
} from "@/server/actions/reports";
import { listTrips } from "@/server/store/mock-store";
import { notify } from "@/server/notifications/service";
import {
  KIND_LABELS,
  complianceStatus,
  daysUntilExpiry,
} from "@/lib/types/hr-compliance";
import { CURRENT_USER_EMPLOYEE_ID } from "@/server/auth/current-user";

const HR_MANAGER_ID = "emp-004";

/** Recipients of the weekly summary: MD, FM, OM, HRM. */
const WEEKLY_DIGEST_RECIPIENTS = ["emp-001", "emp-002", "emp-003", "emp-004"];

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

/**
 * Builds this week's executive summary and dispatches it to the management
 * recipient list (MD, FM, OM, HRM).
 *
 * In production this is a Vercel Cron Friday at 17:00 EAT.
 */
export async function runWeeklyDigest(): Promise<JobResult> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  // Week = last 7 days inclusive
  const weekStart = new Date(now.getTime() - 6 * 86400_000);
  const weekStartIso = weekStart.toISOString().slice(0, 10);
  const weekLabel = `${weekStartIso} → ${today}`;

  // Operational counts
  const tripsAll = listTrips();
  const tripsThisWeek = tripsAll.filter((t) => {
    const ref = t.actualDeliveryAt ?? t.actualDepartureAt ?? t.plannedDepartureDate ?? t.createdAt;
    return ref >= weekStartIso && ref <= today;
  });
  const tripsClosed = tripsThisWeek.filter((t) => t.status === "closed").length;
  const tripsActive = tripsAll.filter(
    (t) => t.status !== "closed" && t.status !== "cancelled",
  ).length;

  // Finance
  const pnl = await profitAndLoss({ fromDate: weekStartIso, toDate: today });
  const revenue = pnl.income.total;
  const profit = pnl.netProfit;

  const arRows = await arAgingByCustomer(today);
  const overdueAr = arRows.reduce(
    (s, r) => s + r.d1to30 + r.d31to60 + r.d61to90 + r.d90plus,
    0,
  );

  // Fleet — top 3 trucks by week profit
  const fleet = await fleetUtilisation({ fromDate: weekStartIso, toDate: today });
  const top3 = fleet.slice(0, 3);

  // Compliance
  const records = await listComplianceRecords();
  const flagged = records.filter((r) => {
    const s = complianceStatus(r.expiryDate);
    return s === "expired" || s === "expiring_soon";
  }).length;

  // HR
  const pendingLeave = (await listLeaveRequests({ status: "pending" })).length;

  const kes = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;
  const summary = [
    `${tripsClosed} trips closed (${tripsActive} active)`,
    `revenue ${kes(revenue)}`,
    `profit ${kes(profit)}`,
    `overdue AR ${kes(overdueAr)}`,
    `${pendingLeave} leave pending`,
    flagged > 0 ? `${flagged} compliance flags` : null,
  ].filter(Boolean).join(" · ");

  const highlights = top3.length === 0
    ? "(no truck activity this week)"
    : top3
      .map((t, i) => `${i + 1}. ${t.registration} — ${kes(t.grossProfitKes)} (${t.tripCount} trips)`)
      .join("\n");

  let totalSent = 0;
  for (const recipientId of WEEKLY_DIGEST_RECIPIENTS) {
    const result = await notify({
      category: "digest_weekly",
      recipientId,
      payload: {
        date: today,
        weekLabel,
        summary,
        highlights,
      },
      href: "/dashboard",
      priority: "low",
    });
    totalSent += result.succeeded;
  }
  revalidatePath("/notifications");
  return { ok: true, sent: totalSent };
}
