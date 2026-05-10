"use server";

import { revalidatePath } from "next/cache";
import {
  getNotificationTemplate as storeGetTemplate,
  listNotifications as storeListNotifications,
  listNotificationPreferences as storeListPreferences,
  listNotificationTemplates as storeListTemplates,
  markNotificationRead as storeMarkRead,
  notificationTotals as storeTotals,
  setNotificationPreference as storeSetPreference,
  unreadNotificationsForRecipient as storeUnread,
  updateNotificationTemplate as storeUpdateTemplate,
} from "@/server/store/mock-store";
import { notify } from "@/server/notifications/service";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
} from "@/lib/types/notifications";
import {
  preferenceUpdateSchema,
  templateUpdateSchema,
  type PreferenceUpdateInput,
  type TemplateUpdateInput,
} from "@/lib/validators/notifications";

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function listTemplates() {
  return storeListTemplates();
}
export async function getTemplate(category: NotificationCategory, channel: NotificationChannel) {
  return storeGetTemplate(category, channel);
}
export async function updateTemplate(input: TemplateUpdateInput): Promise<ActionResult> {
  const parsed = templateUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = storeUpdateTemplate(parsed.data.id, {
    subject: parsed.data.subject,
    body: parsed.data.body,
  });
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/notifications/templates");
  return { ok: true, id: r.id };
}

export async function listPreferences(recipientId: string) {
  return storeListPreferences(recipientId);
}
export async function setPreference(input: PreferenceUpdateInput): Promise<ActionResult> {
  const parsed = preferenceUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = storeSetPreference(parsed.data.recipientId, parsed.data.category, parsed.data.channels);
  revalidatePath("/notifications/preferences");
  return { ok: true, id: r.id };
}

export async function listNotifications(filter?: {
  recipientId?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  limit?: number;
}) {
  return storeListNotifications(filter);
}
export async function unreadInbox(recipientId: string) {
  return storeUnread(recipientId);
}
export async function markRead(id: string): Promise<ActionResult> {
  const r = storeMarkRead(id);
  if (!r) return { ok: false, error: "Not found" };
  revalidatePath("/notifications");
  return { ok: true, id: r.id };
}
export async function totals() {
  return storeTotals();
}

/** Test-send: lets HR exercise the pipeline end-to-end without waiting for an event. */
export async function sendTest(input: {
  category: NotificationCategory;
  recipientId: string;
}): Promise<ActionResult> {
  const r = await notify({
    category: input.category,
    recipientId: input.recipientId,
    payload: {
      tripNumber: "TRP-TEST-0001",
      origin: "Mombasa",
      destination: "Kampala",
      truckPlate: "KCA 123A",
      driverName: "Test Driver",
      eta: "tomorrow 14:00",
      employee: "Test Employee",
      number: "TEST-001",
      currency: "KES",
      amount: "12,345",
      reason: "Test notification",
      method: "M-Pesa",
      customer: "Test Customer",
      supplier: "Test Supplier",
      dueDate: "2026-06-01",
      daysToDue: "7",
      daysLate: "3",
      leaveType: "Annual",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      days: "5",
      approver: "HR Manager",
      period: "2026-05",
      grossPay: "350,000",
      deductions: "85,000",
      netPay: "265,000",
      bankOrMpesa: "M-Pesa",
      principal: "100,000",
      monthlyRecovery: "10,000",
      termMonths: "12",
      kind: "Test document",
      expiryDate: "2026-12-31",
      daysToExpiry: "30",
      fault: "Test fault",
      duration: "4 hours",
      cost: "12,500",
      stage: "test stage",
      cycle: "2026",
      manifest: "MN-TEST",
      weight: "28 t",
      border: "Malaba",
      summary: "0 trips, 0 invoices, 0 alerts.",
      date: new Date().toISOString().slice(0, 10),
    },
    href: "/notifications",
    priority: "low",
  });
  if (r.attempted === 0) return { ok: false, error: "No channels enabled for this category" };
  if (r.succeeded === 0) return { ok: false, error: r.records.map((x) => x.error).filter(Boolean).join("; ") || "All channels failed" };
  return { ok: true, id: r.records[0]!.id };
}
