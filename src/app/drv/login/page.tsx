import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { authenticateDriver } from "@/server/actions/driver-session";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function DriverLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(30,91,184,0.18), transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="glass rounded-xl p-6 shadow-modal">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Logo variant="horizontal" />
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-tertiary">
              Driver app
            </div>
          </div>

          <h1 className="mb-1 text-center text-lg font-semibold tracking-tight text-fg-primary">
            Sign in
          </h1>
          <p className="mb-5 text-center text-xs text-fg-secondary">
            Enter your phone number and National ID to sign in.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
              {error === "missing"
                ? "Enter both your phone number and National ID."
                : "No active driver matches those details. Check with your dispatcher."}
            </div>
          )}

          <form action={authenticateDriver} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-fg-secondary">Phone number</Label>
              <Input
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+254 7…"
                className="font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-fg-secondary">National ID</Label>
              <Input
                name="nationalId"
                required
                inputMode="numeric"
                placeholder="Your ID number"
                className="font-mono"
              />
            </div>
            <Button type="submit" className="mt-1 w-full justify-center">
              <ShieldCheck className="size-4" />
              Sign in
            </Button>
          </form>

          <div className="mt-5 text-center text-[10px] text-fg-tertiary">
            By signing in you agree to Nile Valley Logistics&apos; driver-app rules.
          </div>
        </div>

        <div className="mt-3 text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">← Office app</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
