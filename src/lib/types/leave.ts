/**
 * Leave & Attendance — Phase 6C.
 */

export type LeaveType =
  | "annual"
  | "sick"
  | "compassionate"
  | "maternity"
  | "paternity"
  | "study"
  | "unpaid";

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled" | "taken";

export interface LeaveRequest {
  id: string;
  /** REQ-YYYY-NNNNN */
  number: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  /** Working-day count between start & end (inclusive). */
  days: number;
  reason: string;
  status: LeaveStatus;
  attachmentUrl?: string;
  approvedById?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
}

export interface LeaveEntitlement {
  /** Annual entitlement per leave type (days). Undefined = unlimited / case-by-case. */
  annual?: number;
  sick?: number;
  compassionate?: number;
  maternity?: number;
  paternity?: number;
  study?: number;
}

/** Statutory baseline for Kenya (may be overridden per contract). */
export const KENYA_STATUTORY_LEAVE: LeaveEntitlement = {
  annual: 21,
  sick: 14,
  compassionate: 5,
  maternity: 90,
  paternity: 14,
  study: 0,
};

export interface LeaveBalance {
  employeeId: string;
  leaveType: LeaveType;
  /** Days entitled this calendar year. */
  entitled: number;
  /** Days approved + taken. */
  used: number;
  /** Days requested but pending. */
  pending: number;
  /** Days remaining = entitled - used - pending. */
  remaining: number;
}

export type AttendanceStatus =
  | "present"
  | "absent"
  | "on_leave"
  | "public_holiday"
  | "weekend"
  | "sick"
  | "half_day";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  /** ISO date — one record per employee per day. */
  date: string;
  status: AttendanceStatus;
  clockInTime?: string;       // HH:mm
  clockOutTime?: string;      // HH:mm
  hours?: number;             // computed or manual
  notes?: string;
  createdAt: string;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Annual",
  sick: "Sick",
  compassionate: "Compassionate",
  maternity: "Maternity",
  paternity: "Paternity",
  study: "Study",
  unpaid: "Unpaid",
};

/** Inclusive working-day count between two ISO dates (Sat/Sun excluded). */
export function workingDaysBetween(start: string, end: string): number {
  const a = new Date(start);
  const b = new Date(end);
  if (b < a) return 0;
  let count = 0;
  const cur = new Date(a);
  while (cur <= b) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
