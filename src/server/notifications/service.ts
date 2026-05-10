/**
 * Notification dispatch service.
 *
 * Use `notify()` from server actions and webhook handlers. It looks up the
 * recipient's preferences for the given category, renders the matching
 * templates, calls the per-channel provider, and writes outbound records.
 */

import { revalidatePath } from "next/cache";
import { renderTemplate, type NotificationCategory, type NotificationChannel, type NotificationPriority } from "@/lib/types/notifications";
import {
  appendNotification,
  getNotificationPreference,
  getNotificationTemplate,
  recipientAddress,
  setNotificationStatus,
  getEmployee,
} from "@/server/store/mock-store";
import { emailProvider, smsProvider } from "@/server/notifications/providers";

export interface NotifyInput {
  category: NotificationCategory;
  /** Employee.id of the recipient. */
  recipientId: string;
  /** Variables substituted into {{placeholders}} in templates. */
  payload: Record<string, unknown>;
  /** Optional deep-link to the relevant page in the office app. */
  href?: string;
  priority?: NotificationPriority;
  /** Restrict to a subset of channels (intersected with the user's preferences). */
  channels?: NotificationChannel[];
}

export interface NotifyOutcome {
  attempted: number;
  succeeded: number;
  failed: number;
  records: Array<{ id: string; channel: NotificationChannel; status: string; error?: string }>;
}

export async function notify(input: NotifyInput): Promise<NotifyOutcome> {
  const employee = getEmployee(input.recipientId);
  const recipientLabel = employee?.fullName ?? input.recipientId;

  const pref = getNotificationPreference(input.recipientId, input.category);
  let channels = pref.channels;
  if (input.channels) {
    const restrict = new Set(input.channels);
    channels = channels.filter((c) => restrict.has(c));
  }

  const outcome: NotifyOutcome = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    records: [],
  };

  for (const channel of channels) {
    outcome.attempted++;
    const template = getNotificationTemplate(input.category, channel);
    if (!template) {
      outcome.failed++;
      continue;
    }
    const subject = renderTemplate(template.subject, { ...input.payload, href: input.href ?? "" });
    const body = renderTemplate(template.body, { ...input.payload, href: input.href ?? "" });
    const destination = recipientAddress(input.recipientId, channel);

    if (!destination) {
      const record = appendNotification({
        category: input.category,
        channel,
        recipientId: input.recipientId,
        recipientLabel,
        destination: "",
        subject,
        body,
        href: input.href,
        priority: input.priority ?? "normal",
        status: "failed",
        error: `No ${channel} address on file for ${recipientLabel}`,
        payload: input.payload,
      });
      outcome.failed++;
      outcome.records.push({ id: record.id, channel, status: "failed", error: record.error });
      continue;
    }

    // In-app: write directly as delivered. No provider call.
    if (channel === "in_app") {
      const record = appendNotification({
        category: input.category,
        channel,
        recipientId: input.recipientId,
        recipientLabel,
        destination,
        subject,
        body,
        href: input.href,
        priority: input.priority ?? "normal",
        status: "delivered",
        payload: input.payload,
        sentAt: new Date().toISOString(),
      });
      outcome.succeeded++;
      outcome.records.push({ id: record.id, channel, status: "delivered" });
      continue;
    }

    // Queue first so we have an ID for correlation
    const queued = appendNotification({
      category: input.category,
      channel,
      recipientId: input.recipientId,
      recipientLabel,
      destination,
      subject,
      body,
      href: input.href,
      priority: input.priority ?? "normal",
      status: "queued",
      payload: input.payload,
    });

    let result;
    if (channel === "email") {
      result = await emailProvider.send({ to: destination, subject, body, reference: queued.id });
    } else {
      result = await smsProvider.send({ to: destination, body, reference: queued.id });
    }

    if (result.ok) {
      setNotificationStatus(queued.id, "sent", { providerMessageId: result.messageId });
      outcome.succeeded++;
      outcome.records.push({ id: queued.id, channel, status: "sent" });
    } else {
      setNotificationStatus(queued.id, "failed", { error: result.error });
      outcome.failed++;
      outcome.records.push({ id: queued.id, channel, status: "failed", error: result.error });
    }
  }

  // Make the bell + outbound log re-render
  revalidatePath("/notifications");
  revalidatePath("/notifications/log");

  return outcome;
}
