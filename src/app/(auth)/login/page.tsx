import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { getCurrentUser } from "@/server/auth/current-user";
import { LoginForm } from "./login-form";

/**
 * Login page — public, server-rendered shell. The interactive form
 * (and the server action call) live in <LoginForm /> as a client
 * component so we can show field-level errors without a full reload.
 *
 * Already-signed-in users get bounced to the dashboard so /login isn't
 * a dead-end after a previous session.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const { returnTo, error } = await searchParams;
  const me = await getCurrentUser();
  if (me?.userId) {
    redirect(returnTo && returnTo.startsWith("/") ? returnTo : "/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37,99,235,0.20), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(15,76,129,0.20), transparent 60%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass animate-content-in rounded-xl p-8 shadow-modal">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Logo variant="horizontal" />
            <div className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-fg-tertiary">
              Transport Management System
            </div>
          </div>

          <h1 className="mb-1 text-center text-xl font-semibold tracking-tight text-fg-primary">
            Sign in
          </h1>
          <p className="mb-6 text-center text-sm text-fg-secondary">
            Use the email and password your admin issued you.
          </p>

          {error === "session_unconfigured" && (
            <div className="mb-4 rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
              Server session is misconfigured. Contact your admin.
            </div>
          )}

          <LoginForm returnTo={returnTo} />

          <p className="mt-6 text-center text-xs text-fg-tertiary">
            Accounts are issued by an administrator.{" "}
            <Link
              href="/forgot-password"
              className="text-brand-blue hover:underline"
            >
              Forgot password?
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-fg-tertiary">
          tx-system · v0.1
        </div>
      </div>
    </div>
  );
}
