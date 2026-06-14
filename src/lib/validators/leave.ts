import { z } from "zod";

const leaveTypeEnum = z.enum([
  "annual",
  "sick",
  "compassionate",
  "maternity",
  "paternity",
  "study",
  "unpaid",
]);

export const leaveRequestCreateSchema = z
  .object({
    employeeId: z.string().min(1),
    leaveType: leaveTypeEnum,
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    reason: z.string().min(2, "Reason required"),
    attachmentUrl: z.string().optional(),
  })
  .refine((v) => new Date(v.endDate) >= new Date(v.startDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });
export type LeaveRequestCreateInput = z.infer<typeof leaveRequestCreateSchema>;

export const attendanceCreateSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  status: z.enum([
    "present",
    "absent",
    "on_leave",
    "public_holiday",
    "weekend",
    "sick",
    "half_day",
  ]),
  clockInTime: z.string().optional(),
  clockOutTime: z.string().optional(),
  hours: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export type AttendanceCreateInput = z.infer<typeof attendanceCreateSchema>;
