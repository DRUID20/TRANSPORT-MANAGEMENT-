import { Resend } from "resend";

/**
 * Email a newly-created user their sign-in link + temporary password via
 * Resend. Throws if RESEND_API_KEY is missing or the API call fails — the
 * caller (createUser) surfaces the error so the admin knows the invite didn't
 * go out (the account is still created either way).
 */
export async function sendUserInvite(args: {
  to: string;
  fullName: string;
  tempPassword: string;
  loginUrl: string;
  roleLabel: string;
  inviterName?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  if (!key) {
    throw new Error("RESEND_API_KEY is not set — cannot send the invite email.");
  }

  const resend = new Resend(key);
  const { to, fullName, tempPassword, loginUrl, roleLabel, inviterName } = args;

  await resend.emails.send({
    from: `Nile Valley Logistics <${from}>`,
    to,
    subject: "Your Nile Valley Logistics account is ready",
    text: [
      `Hi ${fullName},`,
      "",
      `${inviterName ? `${inviterName} has` : "An administrator has"} created an account for you on Nile Valley Logistics.`,
      "",
      `Role: ${roleLabel}`,
      `Sign-in link: ${loginUrl}`,
      `Email: ${to}`,
      `Temporary password: ${tempPassword}`,
      "",
      "Sign in with the temporary password above, then change it from the",
      "login screen's \"Forgot password\" link to set your own.",
      "",
      "Never share your password with anyone.",
      "",
      "Nile Valley Logistics · Cross-border fuel haulage, East Africa",
      "This is an automated message — please don't reply.",
    ].join("\n"),
    html: inviteHtml({ fullName, tempPassword, loginUrl, roleLabel, inviterName, email: to }),
  });
}

function inviteHtml(args: {
  fullName: string;
  tempPassword: string;
  loginUrl: string;
  roleLabel: string;
  inviterName?: string;
  email: string;
}): string {
  const name = escapeHtml(args.fullName);
  const pwd = escapeHtml(args.tempPassword);
  const url = escapeHtml(args.loginUrl);
  const role = escapeHtml(args.roleLabel);
  const email = escapeHtml(args.email);
  const inviter = args.inviterName
    ? `${escapeHtml(args.inviterName)} has`
    : "An administrator has";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>Your account is ready</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef2f7;font-size:1px;line-height:1px;">
    Your Nile Valley Logistics sign-in details inside. &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
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
        <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:32px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;">Account created</div>
          <h1 style="font-size:22px;line-height:1.25;font-weight:600;margin:8px 0 0;color:#0f172a;letter-spacing:-.02em;">Welcome, ${name}</h1>
          <p style="font-size:14px;line-height:1.6;color:#475569;margin:12px 0 0;">
            ${inviter} created an account for you on Nile Valley Logistics. Your role is <strong style="color:#0f172a;">${role}</strong>.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
            <tr><td style="padding:18px 20px;">
              <div style="font-size:12px;color:#64748b;">Email</div>
              <div style="font-size:14px;font-weight:600;color:#0f172a;margin:2px 0 14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${email}</div>
              <div style="font-size:12px;color:#64748b;">Temporary password</div>
              <div style="font-size:20px;font-weight:700;color:#0f172a;margin:2px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;">${pwd}</div>
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
            <tr><td style="background:#2563eb;border-radius:10px;">
              <a href="${url}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Sign in to your account →</a>
            </td></tr>
          </table>

          <div style="border-top:1px solid #eef2f7;margin:24px 0 0;padding-top:16px;">
            <p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:0;">
              For your security, sign in and then change your password using the
              "Forgot password" link on the sign-in screen. Never share your
              password with anyone.
            </p>
          </div>
        </td></tr>
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
