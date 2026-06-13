import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { getCurrentUser } from "@/server/auth/current-user";
import { LoginForm } from "./login-form";
import { DispatchTicker } from "./dispatch-ticker";

/**
 * Login page — two-pane operations command. The left pane is a dark
 * editorial panel that communicates the product domain (fuel haul in
 * East Africa) with a live status ticker. The right pane is a focused
 * white sign-in surface. On mobile the dark pane collapses to a thin
 * brand band above the form so the form stays the primary action.
 *
 * Reading: B2B login for technical operators (dispatchers, accountants),
 * Linear-restraint with a Mercury-cool palette. Single accent
 * (brand-blue) on the form CTA, status colors only on the live ticker.
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
    <div className="grid min-h-[100dvh] grid-cols-1 bg-bg-base lg:grid-cols-[1.05fr_minmax(420px,0.95fr)]">
      {/* LEFT — editorial brand pane (always dark) */}
      <section className="relative isolate hidden flex-col justify-between overflow-hidden bg-[#0B0F1A] px-10 py-8 text-white lg:flex lg:px-14 lg:py-12">
        {/* Atmospheric layers — restrained, no AI mesh */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(60% 60% at 10% 0%, rgba(37,99,235,0.10), transparent 60%), radial-gradient(70% 70% at 90% 110%, rgba(14,165,233,0.08), transparent 60%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-1/4 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(37,99,235,0.18),transparent_70%)] blur-2xl"
        />

        {/* Brand mark */}
        <div className="relative z-10 flex items-center gap-3">
          <Logo variant="horizontal" />
        </div>

        {/* Headline + ticker */}
        <div className="relative z-10 grid max-w-[28rem] gap-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
              Nile Valley Logistics
            </p>
            <h1 className="mt-3 text-[36px] font-medium leading-[1.08] tracking-tight text-white sm:text-[42px]">
              Dispatch fuel.
              <br />
              <span className="text-white/65">Track every litre.</span>
              <br />
              Get paid clean.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/55">
              The operations workspace for fuel hauliers running KPC, KPRL
              and cross-border loads across East Africa.
            </p>
          </div>

          <div className="grid gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
              Live · last 5 movements
            </p>
            <DispatchTicker />
          </div>
        </div>

        {/* Footer line */}
        <div className="relative z-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
          <span>Mombasa · Nairobi · Kampala · Kigali</span>
          <span>EAT</span>
        </div>
      </section>

      {/* RIGHT — focused form pane */}
      <section className="relative flex flex-col items-center justify-center px-6 py-10 sm:px-10">
        {/* Compact brand row for mobile */}
        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <Logo variant="horizontal" />
        </div>

        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-tertiary">
              Sign in
            </p>
            <h2 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-fg-primary">
              Welcome back.
            </h2>
            <p className="mt-2 text-sm text-fg-secondary">
              Use the credentials your administrator issued you.
            </p>
          </div>

          {error === "session_unconfigured" && (
            <div className="mb-4 rounded-lg border border-status-danger/30 bg-status-danger/5 px-3 py-2 text-xs text-status-danger">
              Server session is misconfigured. Contact your administrator.
            </div>
          )}

          <LoginForm returnTo={returnTo} />

          <div className="mt-6 flex items-center justify-between text-xs">
            <Link
              href="/forgot-password"
              className="text-fg-secondary transition-colors hover:text-brand-blue"
            >
              Forgot password?
            </Link>
            <span className="text-fg-tertiary">
              Accounts issued by admin only
            </span>
          </div>
        </div>

        <p className="absolute inset-x-0 bottom-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-fg-tertiary">
          Nile Valley TMS
        </p>
      </section>
    </div>
  );
}
