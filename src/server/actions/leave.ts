"use server";

import { revalidatePath } from "next/cache";
import {
  approveLeaveRequest as storeApprove,
  cancelLeaveRequest as storeCancel,
  createLeaveRequest as storeCreate,
  getEmployee,
  getLeaveRequest,
  leaveBalances as storeBalances,
  listAttendance as storeAttendance,
  listLeaveRequests as storeList,
  logAttendance as storeLogAttendance,
  rejectLeaveRequest as storeReject,
} from "@/server/store/mock-store";
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
  return storeList(filter);
}

export async function getLeaveRequestById(id: string) {
  const r = getLeaveRequest(id);
  if (!r) return undefined;
  const employee = getEmployee(r.employeeId);
  const approver = r.approvedById ? getEmployee(r.approvedById) : undefined;
  return { ...r, employee, approver };
}

export async function leaveBalances(employeeId: string) {
  return storeBalances(employeeId);
}

export async function listAttendance(filter?: {
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  return storeAttendance(filter);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createLeaveRequest(input: LeaveRequestCreateInput): Promise<ActionResult> {
  const parsed = leaveRequestCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = storeCreate(parsed.data);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/hr/leave");
  revalidatePath(`/hr/employees/${parsed.data.employeeId}`);
  return { ok: true, id: r.id };
}

export async function approveLeaveRequest(id: string): Promise<ActionResult> {
  // For demo: HR Manager (emp-004) is the approver.
  const r = storeApprove(id, HR_MANAGER_ID);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/hr/leave");
  revalidatePath(`/hr/leave/${id}`);
  revalidatePath(`/hr/employees/${r.employeeId}`);
  return { ok: true, id: r.id };
}

export async function rejectLeaveRequest(id: string, reason: string): Promise<ActionResult> {
  if (!reason.trim()) return { ok: false, error: "Rejection reason required" };
  const r = storeReject(id, reason, HR_MANAGER_ID);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/hr/leave");
  revalidatePath(`/hr/leave/${id}`);
  return { ok: true, id: r.id };
}

export async function cancelLeaveRequest(id: string): Promise<ActionResult> {
  const r = storeCancel(id);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/hr/leave");
  revalidatePath(`/hr/leave/${id}`);
  return { ok: true, id: r.id };
}

export async function logAttendance(input: AttendanceCreateInput): Promise<ActionResult> {
  const parsed = attendanceCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = storeLogAttendance(parsed.data);
  revalidatePath("/hr/attendance");
  return { ok: true, id: r.id };
}
