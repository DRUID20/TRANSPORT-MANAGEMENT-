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
    from: `Nile Valley Logistics <${from}>`,
    to,
    subject: `${code} is your Nile Valley password reset code`,
    text: [
      `Hi ${fullName},`,
      "",
      `Your verification code is: ${code}`,
      "",
      "Enter it on the password-reset screen to set a new password.",
      "It expires in 15 minutes and can only be used once.",
      "",
      "Didn't request this? Ignore this email — your password won't change.",
      "Never share this code with anyone.",
      "",
      "Nile Valley Logistics · Cross-border fuel haulage, East Africa",
      "This is an automated message — please don't reply.",
    ].join("\n"),
    html: otpHtml({ fullName, code }),
  });
}

function otpHtml({ fullName, code }: { fullName: string; code: string }): string {
  const name = escapeHtml(fullName);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>Your password reset code</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <!-- preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef2f7;font-size:1px;line-height:1px;">
    Your one-time password reset code expires in 15 minutes. &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

        <!-- Brand header -->
        <tr><td style="padding:0 4px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#2563eb;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;color:#ffffff;font-size:13px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;">NVL</td>
              <td style="padding-left:10px;vertical-align:middle;">
                <span style="font-size:15px;font-weight:700;color:#0f172a;letter-spacing:-.01em;">Nile Valley Logistics</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:32px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;">Password reset</div>
          <h1 style="font-size:22px;line-height:1.25;font-weight:600;margin:8px 0 0;color:#0f172a;letter-spacing:-.02em;">Your verification code</h1>
          <p style="font-size:14px;line-height:1.6;color:#475569;margin:12px 0 0;">
            Hi ${name}, use the code below to set a new password for your account. It is valid for <strong style="color:#0f172a;">15 minutes</strong>.
          </p>

          <!-- Code block -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td align="center" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:22px 16px;">
              <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:38px;line-height:1;font-weight:700;letter-spacing:.3em;color:#0f172a;padding-left:.3em;">${code}</div>
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;line-height:1.6;color:#64748b;">
                Enter this code on the password-reset screen, then choose a new password. The code can only be used once.
              </td>
            </tr>
          </table>

          <div style="border-top:1px solid #eef2f7;margin:24px 0 0;padding-top:16px;">
            <p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:0;">
              Didn't request this? You can safely ignore this email — your password won't change.
              For your security, never share this code with anyone.
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 8px 0;text-align:center;">
          <p style="font-size:12px;color:#94a3b8;margin:0;">Nile Valley Logistics · Cross-border fuel haulage, East Africa</p>
          <p style="font-size:11px;color:#cbd5e1;margin:6px 0 0;">This is an automated message — please don't reply.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
