/**
 * Notification provider abstractions.
 * Channels are pluggable — production implementations can swap in Resend
 * (email) and Africa's Talking (SMS) without changing call sites.
 */

import { randomUUID } from "node:crypto";

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  /** Optional HTML body. */
  html?: string;
  /** Internal reference for log correlation. */
  reference?: string;
}

export interface SmsMessage {
  to: string;
  body: string;
  reference?: string;
}

export interface ProviderResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<ProviderResult>;
}

export interface SmsProvider {
  readonly name: string;
  send(msg: SmsMessage): Promise<ProviderResult>;
}

/** Mock email provider — logs to console, returns a fake messageId. */
class MockEmailProvider implements EmailProvider {
  readonly name = "mock-email";
  async send(msg: EmailMessage): Promise<ProviderResult> {
    if (!isValidEmail(msg.to)) {
      return { ok: false, error: `Invalid email: ${msg.to}` };
    }
    return { ok: true, messageId: `email-${randomUUID().slice(0, 12)}` };
  }
}

/** Mock SMS provider — Africa's Talking shape. */
class MockSmsProvider implements SmsProvider {
  readonly name = "africas-talking-mock";
  async send(msg: SmsMessage): Promise<ProviderResult> {
    if (!isValidPhone(msg.to)) {
      return { ok: false, error: `Invalid phone: ${msg.to}` };
    }
    if (msg.body.length > 1600) {
      return { ok: false, error: "Body exceeds 10-segment SMS limit" };
    }
    return { ok: true, messageId: `at-${randomUUID().slice(0, 16)}` };
  }
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidPhone(s: string): boolean {
  // Permissive: + and digits, 7-16 chars
  return /^\+?\d{7,16}$/.test(s.replace(/\s/g, ""));
}

/** Simple registry. Production swap point. */
export const emailProvider: EmailProvider = new MockEmailProvider();
export const smsProvider: SmsProvider = new MockSmsProvider();

/** SMS body length helper — Africa's Talking GSM-7 segments at 160 chars,
 *  unicode segments at 70. We approximate with GSM-7 unless emoji present. */
export function smsSegments(body: string): number {
  const isUnicode = /[^\x00-\x7F]/.test(body);
  const limit = isUnicode ? 70 : 160;
  if (body.length <= limit) return 1;
  // Multi-part headers reduce per-segment capacity slightly
  const perSeg = isUnicode ? 67 : 153;
  return Math.ceil(body.length / perSeg);
}
