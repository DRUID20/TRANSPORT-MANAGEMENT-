import { z } from "zod";

const channelEnum = z.enum(["email", "sms", "in_app"]);

const categoryEnum = z.enum([
  "trip_planned",
  "trip_loaded",
  "trip_at_border",
  "trip_delivered",
  "trip_pod_uploaded",
  "expense_submitted",
  "expense_approved",
  "expense_rejected",
  "invoice_issued",
  "invoice_paid",
  "invoice_overdue",
  "bill_received",
  "bill_due_soon",
  "leave_requested",
  "leave_approved",
  "leave_rejected",
  "payroll_period_paid",
  "loan_disbursed",
  "compliance_expiring",
  "compliance_expired",
  "jobcard_opened",
  "jobcard_completed",
  "appraisal_advanced",
  "digest_daily",
]);

export const templateUpdateSchema = z.object({
  id: z.string().min(1),
  subject: z.string().min(1, "Subject required"),
  body: z.string().min(1, "Body required"),
});
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;

export const preferenceUpdateSchema = z.object({
  recipientId: z.string().min(1),
  category: categoryEnum,
  channels: z.array(channelEnum),
});
export type PreferenceUpdateInput = z.infer<typeof preferenceUpdateSchema>;
