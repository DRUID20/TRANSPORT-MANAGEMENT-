"use server";

import { revalidatePath } from "next/cache";
import {
  approveLeaveRequest as repoApprove,
  cancelLeaveRequest as repoCancel,
  createLeaveRequest as repoCreate,
  getLeaveRequest,
  leaveBalances as repoBalances,
  listAttendance as repoAttendance,
  listLeaveRequests as repoList,
  logAttendance as repoLogAttendance,
  rejectLeaveRequest as repoReject,
} from "@/server/repos/leave";
import { getEmployee } from "@/server/repos/hr";
import { logAudit } from "@/server/auth/audit";
import { guard } from "@/server/auth/permissions";
import type { LeaveStatus, LeaveType } from "@/lib/types/leave";
import {
  attendanceCreateSchema,
  leaveRequestCreateSchema,
  type AttendanceCreateInput,
  type LeaveRequestCreateInput,
} from "@/lib/validators/leave";

const HR_MANAGER_ID = "emp-004";

export async function listLeaveRequests(filter?: {
  employeeId?: string;
  status?: LeaveStatus;
  leaveType?: LeaveType;
}) {
  return repoList(filter);
}

export async function getLeaveRequestById(id: string) {
  const r = await getLeaveRequest(id);
  if (!r) return undefined;
  const [employee, approver] = await Promise.all([
    getEmployee(r.employeeId),
    r.approvedById ? getEmployee(r.approvedById) : Promise.resolve(undefined),
  ]);
  return { ...r, employee, approver };
}

export async function leaveBalances(employeeId: string) {
  return repoBalances(employeeId);
}

export async function listAttendance(filter?: {
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  return repoAttendance(filter);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createLeaveRequest(input: LeaveRequestCreateInput): Promise<ActionResult> {
  const denied = await guard("hr.write");
  if (denied) return denied;
  const parsed = leaveRequestCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = await repoCreate(parsed.data);
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({ entityType: "leave_request", entityId: r.id, action: "create" });
  revalidatePath("/hr/leave");
  revalidatePath(`/hr/employees/${parsed.data.employeeId}`);
  return { ok: true, id: r.id };
}

export async function approveLeaveRequest(id: string): Promise<ActionResult> {
  const denied = await guard("hr.write");
  if (denied) return denied;
  const r = await repoApprove(id, HR_MANAGER_ID);
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({ entityType: "leave_request", entityId: id, action: "approve" });
  revalidatePath("/hr/leave");
  revalidatePath(`/hr/leave/${id}`);
  revalidatePath(`/hr/employees/${r.employeeId}`);
  return { ok: true, id: r.id };
}

export async function rejectLeaveRequest(id: string, reason: string): Promise<ActionResult> {
  const denied = await guard("hr.write");
  if (denied) return denied;
  if (!reason.trim()) return { ok: false, error: "Rejection reason required" };
  const r = await repoReject(id, reason, HR_MANAGER_ID);
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({ entityType: "leave_request", entityId: id, action: "reject", diff: { reason: { from: null, to: reason } } });
  revalidatePath("/hr/leave");
  revalidatePath(`/hr/leave/${id}`);
  return { ok: true, id: r.id };
}

export async function cancelLeaveRequest(id: string): Promise<ActionResult> {
  const denied = await guard("hr.write");
  if (denied) return denied;
  const r = await repoCancel(id);
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({ entityType: "leave_request", entityId: id, action: "cancel" });
  revalidatePath("/hr/leave");
  revalidatePath(`/hr/leave/${id}`);
  return { ok: true, id: r.id };
}

export async function logAttendance(input: AttendanceCreateInput): Promise<ActionResult> {
  const denied = await guard("hr.write");
  if (denied) return denied;
  const parsed = attendanceCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = await repoLogAttendance(parsed.data);
  await logAudit({ entityType: "attendance", entityId: r.id, action: "create" });
  revalidatePath("/hr/attendance");
  return { ok: true, id: r.id };
}
