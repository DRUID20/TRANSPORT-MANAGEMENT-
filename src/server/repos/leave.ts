/**
 * Leave + Attendance repo — dual-mode (Postgres / mock store). Org-scoped.
 *
 * Leave requests follow pending → approved/rejected/cancelled; LV-YYYY-NNNNN
 * issued atomically. leaveBalances() walks approved/taken vs pending to
 * compute remaining against the Kenya statutory entitlement.
 * Attendance: one row per employee per day (upsert).
 */
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import {
  attendanceRecords as attTable,
  leaveRequests as lrTable,
} from "@/server/db/schema";
import { nextDocumentNumber } from "@/server/repos/counters";
import { getEmployee } from "@/server/repos/hr";
import {
  approveLeaveRequest as storeApprove,
  cancelLeaveRequest as storeCancel,
  createLeaveRequest as storeCreate,
  getLeaveRequest as storeGet,
  leaveBalances as storeBalances,
  listAttendance as storeAtt,
  listLeaveRequests as storeList,
  logAttendance as storeLog,
  rejectLeaveRequest as storeReject,
} from "@/server/store/mock-store";
import {
  KENYA_STATUTORY_LEAVE,
  workingDaysBetween,
  type AttendanceRecord,
  type AttendanceStatus,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveStatus,
  type LeaveType,
} from "@/lib/types/leave";

type LRow = typeof lrTable.$inferSelect;
type ARow = typeof attTable.$inferSelect;

function toLeave(r: LRow): LeaveRequest {
  return {
    id: r.id,
    number: r.number,
    employeeId: r.employeeId,
    leaveType: r.leaveType as LeaveType,
    startDate: r.startDate,
    endDate: r.endDate,
    days: Number(r.days),
    reason: r.reason,
    status: r.status as LeaveStatus,
    attachmentUrl: r.attachmentUrl ?? undefined,
    approvedById: r.approvedById ?? undefined,
    approvedAt: r.approvedAt?.toISOString(),
    rejectedReason: r.rejectedReason ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

function toAttendance(r: ARow): AttendanceRecord {
  return {
    id: r.id,
    employeeId: r.employeeId,
    date: r.date,
    status: r.status as AttendanceStatus,
    clockInTime: r.clockInTime ?? undefined,
    clockOutTime: r.clockOutTime ?? undefined,
    hours: r.hours === null ? undefined : Number(r.hours),
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listLeaveRequests(filter?: {
  employeeId?: string;
  status?: LeaveStatus;
  leaveType?: LeaveType;
}): Promise<LeaveRequest[]> {
  if (IS_DEMO_MODE) return storeList(filter);
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(lrTable.organizationId, orgId)];
  if (filter?.employeeId) where.push(eq(lrTable.employeeId, filter.employeeId));
  if (filter?.status) where.push(eq(lrTable.status, filter.status));
  if (filter?.leaveType) where.push(eq(lrTable.leaveType, filter.leaveType));
  const rows = await db.select().from(lrTable).where(and(...where)).orderBy(desc(lrTable.startDate));
  return rows.map(toLeave);
}

export async function getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(lrTable)
    .where(and(eq(lrTable.id, id), eq(lrTable.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toLeave(rows[0]) : undefined;
}

export async function createLeaveRequest(input: {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
}): Promise<LeaveRequest | { error: string }> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const employee = await getEmployee(input.employeeId);
  if (!employee) return { error: "Employee not found" };
  const days = workingDaysBetween(input.startDate, input.endDate);
  if (days <= 0) return { error: "Date range must include at least 1 working day" };
  const db = getDb();
  const orgId = await requireOrgId();
  const number = await nextDocumentNumber(orgId, "LV", "leave", 5);
  const rows = await db
    .insert(lrTable)
    .values({
      organizationId: orgId,
      number,
      employeeId: input.employeeId,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      days: String(days),
      reason: input.reason,
      attachmentUrl: input.attachmentUrl ?? null,
      status: "pending",
    })
    .returning();
  return toLeave(rows[0]!);
}

export async function approveLeaveRequest(
  id: string,
  approvedById: string,
): Promise<LeaveRequest | { error: string }> {
  if (IS_DEMO_MODE) return storeApprove(id, approvedById);
  const cur = await getLeaveRequest(id);
  if (!cur) return { error: "Not found" };
  if (cur.status !== "pending") return { error: `Already ${cur.status}` };
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(lrTable)
    .set({ status: "approved", approvedById, approvedAt: new Date() })
    .where(and(eq(lrTable.id, id), eq(lrTable.organizationId, orgId)))
    .returning();
  return rows[0] ? toLeave(rows[0]) : { error: "Not found" };
}

export async function rejectLeaveRequest(
  id: string,
  reason: string,
  approvedById: string,
): Promise<LeaveRequest | { error: string }> {
  if (IS_DEMO_MODE) return storeReject(id, reason, approvedById);
  const cur = await getLeaveRequest(id);
  if (!cur) return { error: "Not found" };
  if (cur.status !== "pending") return { error: `Already ${cur.status}` };
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(lrTable)
    .set({ status: "rejected", rejectedReason: reason, approvedById, approvedAt: new Date() })
    .where(and(eq(lrTable.id, id), eq(lrTable.organizationId, orgId)))
    .returning();
  return rows[0] ? toLeave(rows[0]) : { error: "Not found" };
}

export async function cancelLeaveRequest(id: string): Promise<LeaveRequest | { error: string }> {
  if (IS_DEMO_MODE) return storeCancel(id);
  const cur = await getLeaveRequest(id);
  if (!cur) return { error: "Not found" };
  if (cur.status === "taken") return { error: "Already taken — cannot cancel" };
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(lrTable)
    .set({ status: "cancelled" })
    .where(and(eq(lrTable.id, id), eq(lrTable.organizationId, orgId)))
    .returning();
  return rows[0] ? toLeave(rows[0]) : { error: "Not found" };
}

export async function leaveBalances(employeeId: string): Promise<LeaveBalance[]> {
  if (IS_DEMO_MODE) return storeBalances(employeeId);
  const types: LeaveType[] = ["annual", "sick", "compassionate", "maternity", "paternity", "study"];
  const all = await listLeaveRequests({ employeeId });
  const out: LeaveBalance[] = [];
  for (const t of types) {
    const entitled =
      (KENYA_STATUTORY_LEAVE[t as keyof typeof KENYA_STATUTORY_LEAVE] as number | undefined) ?? 0;
    const used = all
      .filter((r) => r.leaveType === t && (r.status === "approved" || r.status === "taken"))
      .reduce((s, r) => s + r.days, 0);
    const pending = all
      .filter((r) => r.leaveType === t && r.status === "pending")
      .reduce((s, r) => s + r.days, 0);
    out.push({
      employeeId,
      leaveType: t,
      entitled,
      used,
      pending,
      remaining: Math.max(0, entitled - used - pending),
    });
  }
  return out;
}

// ----- Attendance -----
export async function listAttendance(filter?: {
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<AttendanceRecord[]> {
  if (IS_DEMO_MODE) return storeAtt(filter);
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(attTable.organizationId, orgId)];
  if (filter?.employeeId) where.push(eq(attTable.employeeId, filter.employeeId));
  if (filter?.fromDate) where.push(gte(attTable.date, filter.fromDate));
  if (filter?.toDate) where.push(lte(attTable.date, filter.toDate));
  const rows = await db.select().from(attTable).where(and(...where)).orderBy(desc(attTable.date));
  return rows.map(toAttendance);
}

export async function logAttendance(input: {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  clockInTime?: string;
  clockOutTime?: string;
  hours?: number;
  notes?: string;
}): Promise<AttendanceRecord> {
  if (IS_DEMO_MODE) return storeLog(input);
  const db = getDb();
  const orgId = await requireOrgId();
  // One row per (employee, date). Look up existing first.
  const existing = (
    await db
      .select()
      .from(attTable)
      .where(
        and(
          eq(attTable.organizationId, orgId),
          eq(attTable.employeeId, input.employeeId),
          eq(attTable.date, input.date),
        ),
      )
      .limit(1)
  )[0];
  if (existing) {
    const rows = await db
      .update(attTable)
      .set({
        status: input.status,
        clockInTime: input.clockInTime ?? null,
        clockOutTime: input.clockOutTime ?? null,
        hours: input.hours !== undefined ? String(input.hours) : null,
        notes: input.notes ?? null,
      })
      .where(eq(attTable.id, existing.id))
      .returning();
    return toAttendance(rows[0]!);
  }
  const rows = await db
    .insert(attTable)
    .values({
      organizationId: orgId,
      employeeId: input.employeeId,
      date: input.date,
      status: input.status,
      clockInTime: input.clockInTime ?? null,
      clockOutTime: input.clockOutTime ?? null,
      hours: input.hours !== undefined ? String(input.hours) : null,
      notes: input.notes ?? null,
    })
    .returning();
  return toAttendance(rows[0]!);
}
