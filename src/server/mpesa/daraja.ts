"use server";

import type { MpesaTransactionType } from "@/lib/types/mpesa";

export interface DarajaResult {
  ok: boolean;
  source: "mock" | "daraja_sandbox" | "daraja_prod";
  checkoutRequestId?: string;
  merchantRequestId?: string;
  mpesaReceiptNumber?: string;
  errorMessage?: string;
}

/**
 * Send funds via M-Pesa.
 *
 * - When MPESA_CONSUMER_KEY + MPESA_CONSUMER_SECRET + MPESA_PASSKEY +
 *   MPESA_SHORTCODE are set, we'd call Daraja STK Push (driver_advance)
 *   or B2C (reimbursement / supplier_payment). This function holds the
 *   shape; the real fetch is left as TODO until you provide credentials.
 * - Until then we simulate: ~90% success after a 1.5s "network" delay.
 */
export async function darajaSend(input: {
  type: MpesaTransactionType;
  recipient: string;
  amountKes: number;
}): Promise<DarajaResult> {
  const env = (process.env.MPESA_ENV ?? "").toLowerCase();
  const haveKeys =
    !!process.env.MPESA_CONSUMER_KEY &&
    !!process.env.MPESA_CONSUMER_SECRET &&
    !!process.env.MPESA_SHORTCODE;

  if (haveKeys) {
    // TODO Phase 4D+: real Daraja calls.
    // 1. Get OAuth token: GET /oauth/v1/generate?grant_type=client_credentials
    // 2. STK Push: POST /mpesa/stkpush/v1/processrequest with timestamp +
    //    Lipa Na M-Pesa Online password (base64 of shortcode + passkey + ts).
    // 3. B2C send: POST /mpesa/b2c/v1/paymentrequest. Requires the
    //    SecurityCredential (RSA-encrypted initiator password).
    // 4. Persist the CheckoutRequestID; the customer's M-Pesa app prompts;
    //    Daraja calls our webhook (/api/mpesa/callback) with the result.
    return mockSend(input, env === "production" ? "daraja_prod" : "daraja_sandbox");
  }

  // No keys set — pure mock for local development.
  return mockSend(input, "mock");
}

async function mockSend(
  input: { type: MpesaTransactionType; recipient: string; amountKes: number },
  source: DarajaResult["source"],
): Promise<DarajaResult> {
  // Simulate ~1.5s of network + Daraja processing.
  await new Promise((r) => setTimeout(r, 1500));

  // 90% success rate; failures help test rejection UI.
  const ok = Math.random() < 0.9;
  if (!ok) {
    return {
      ok: false,
      source,
      errorMessage: "Mock: insufficient float on the Pay Bill (would be a real Daraja error in prod)",
    };
  }

  // Generate plausible identifiers
  const checkoutRequestId = `ws_CO_${Date.now()}${Math.floor(Math.random() * 100)}`;
  const merchantRequestId = `${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const receipt = randomReceipt();

  return {
    ok: true,
    source,
    checkoutRequestId,
    merchantRequestId,
    mpesaReceiptNumber: receipt,
  };
}

function randomReceipt(): string {
  // M-Pesa receipt format: 10 alphanumeric uppercase
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}
