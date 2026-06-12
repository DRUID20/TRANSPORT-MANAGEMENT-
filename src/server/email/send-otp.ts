import { Resend } from "resend";

/**
 * Send the 6-digit password-reset code via Resend. Throws if RESEND_API_KEY
 * is missing or the API call fails — the caller decides whether to swallow
 * (we do, in requestPasswordResetOtp, to avoid leaking which emails exist).
 */
export async function sendPasswordResetOtp(args: {
  to: string;
  fullName: string;
  code: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  if (!key) {
    throw new Error("RESEND_API_KEY is not set — cannot send OTP email.");
  }

  const resend = new Resend(key);
  const { to, fullName, code } = args;

  await resend.emails.send({
    from: `Nile Valley TMS <${from}>`,
    to,
    subject: `Your password reset code: ${code}`,
    text: [
      `Hi ${fullName},`,
      "",
      `Your one-time password reset code is: ${code}`,
      "",
      "This code expires in 15 minutes and can only be used once.",
      "",
      "If you didn't request this, you can safely ignore this email.",
      "",
      "— Nile Valley Logistics TMS",
    ].join("\n"),
    html: otpHtml({ fullName, code }),
  });
}

function otpHtml({ fullName, code }: { fullName: string; code: string }): string {
  return `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:#f7f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto">
    <tr><td style="padding:24px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 2px rgba(15,23,42,.04)">
      <div style="font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#2563eb;margin-bottom:8px">Password reset</div>
      <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;letter-spacing:-.01em">Your one-time code</h1>
      <p style="font-size:14px;color:#475569;margin:0 0 24px">Hi ${escapeHtml(fullName)}, use this code to set a new password.</p>
      <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:600;letter-spacing:.32em;text-align:center;padding:16px;background:#f1f4f9;border-radius:10px;color:#0f172a">${code}</div>
      <p style="font-size:12px;color:#64748b;margin:20px 0 0">This code expires in 15 minutes and can only be used once. If you didn't request this, you can safely ignore this email.</p>
    </td></tr>
    <tr><td style="padding:16px;text-align:center;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#94a3b8;font-family:ui-monospace,monospace">Nile Valley TMS</td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
