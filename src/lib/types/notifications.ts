/**
 * Notifications — Phase 7.
 *
 * Channels: email + SMS (Africa's Talking) + in-app. WhatsApp deferred.
 * Architecture: every event call goes through `notify(category, payload, recipient)`
 * which renders the matching template per channel and respects per-recipient
 * preferences. Outbound delivery is via channel-pluggable providers.
 */

export type NotificationChannel = "email" | "sms" | "in_app";

/** Every system event that can trigger a notification. */
export type NotificationCategory =
  // Trips
  | "trip_planned"
  | "trip_loaded"
  | "trip_at_border"
  | "trip_delivered"
  | "trip_pod_uploaded"
  // Expenses
  | "expense_submitted"
  | "expense_approved"
  | "expense_rejected"
  // AR / AP
  | "invoice_issued"
  | "invoice_paid"
  | "invoice_overdue"
  | "bill_received"
  | "bill_due_soon"
  // HR
  | "leave_requested"
  | "leave_approved"
  | "leave_rejected"
  | "payroll_period_paid"
  | "loan_disbursed"
  // Compliance
  | "compliance_expiring"
  | "compliance_expired"
  // Workshop
  | "jobcard_opened"
  | "jobcard_completed"
  // Performance
  | "appraisal_advanced"
  // System
  | "digest_daily";

export type NotificationStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "bounced"
  | "read";

export type NotificationPriority = "low" | "normal" | "high";

export interface NotificationTemplate {
  id: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  /** Email subject / SMS title (in-app uses this as the headline). */
  subject: string;
  /** Body — supports {{variable}} placeholders rendered against the event payload. */
  body: string;
  /** Whether the user can disable this template. System notifications are mandatory. */
  mandatory: boolean;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  /** Either an Employee.id (preferred) or a free-form recipient identifier. */
  recipientId: string;
  category: NotificationCategory;
  /** Channels enabled for this category for this recipient. */
  channels: NotificationChannel[];
}

/** A single sent (or queued) notification record. */
export interface Notification {
  id: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  /** The intended recipient. */
  recipientId: string;
  recipientLabel: string;     // "Esther Wanjiru" or "+254..."
  /** Address used by the provider — email address, phone number, or in-app target. */
  destination: string;
  subject: string;
  body: string;
  /** Optional deep-link the recipient should be taken to in the office app. */
  href?: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  /** Provider message ID, e.g. Resend / Africa's Talking message handle. */
  providerMessageId?: string;
  /** Last error message from the provider on failure. */
  error?: string;
  /** Optional payload preserved for audit / re-render. */
  payload?: Record<string, unknown>;
  createdAt: string;
  sentAt?: string;
  readAt?: string;
}

export const CATEGORY_GROUPS: Array<{ label: string; categories: NotificationCategory[] }> = [
  { label: "Trips", categories: ["trip_planned", "trip_loaded", "trip_at_border", "trip_delivered", "trip_pod_uploaded"] },
  { label: "Finance", categories: ["expense_submitted", "expense_approved", "expense_rejected", "invoice_issued", "invoice_paid", "invoice_overdue", "bill_received", "bill_due_soon"] },
  { label: "HR", categories: ["leave_requested", "leave_approved", "leave_rejected", "payroll_period_paid", "loan_disbursed"] },
  { label: "Compliance", categories: ["compliance_expiring", "compliance_expired"] },
  { label: "Workshop", categories: ["jobcard_opened", "jobcard_completed"] },
  { label: "Performance", categories: ["appraisal_advanced"] },
  { label: "Digest", categories: ["digest_daily"] },
];

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  trip_planned: "Trip planned",
  trip_loaded: "Trip loaded",
  trip_at_border: "Trip at border",
  trip_delivered: "Trip delivered",
  trip_pod_uploaded: "POD uploaded",
  expense_submitted: "Expense submitted",
  expense_approved: "Expense approved",
  expense_rejected: "Expense rejected",
  invoice_issued: "Invoice issued",
  invoice_paid: "Invoice paid",
  invoice_overdue: "Invoice overdue",
  bill_received: "Bill received",
  bill_due_soon: "Bill due soon",
  leave_requested: "Leave requested",
  leave_approved: "Leave approved",
  leave_rejected: "Leave rejected",
  payroll_period_paid: "Payroll paid",
  loan_disbursed: "Loan disbursed",
  compliance_expiring: "Compliance expiring",
  compliance_expired: "Compliance expired",
  jobcard_opened: "Job card opened",
  jobcard_completed: "Job card completed",
  appraisal_advanced: "Appraisal advanced",
  digest_daily: "Daily digest",
};

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: "Email",
  sms: "SMS",
  in_app: "In-app",
};

/** Render a template with `{{var}}` placeholders against a payload. */
export function renderTemplate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const parts = key.split(".");
    let cur: unknown = payload;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return "";
      }
    }
    return cur === undefined || cur === null ? "" : String(cur);
  });
}
