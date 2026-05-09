"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/logo";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      {/* Background — radial brand-navy glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(30,91,184,0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(20,38,107,0.18), transparent 60%)",
        }}
      />
      {/* Grid overlay */}
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
        {/* Card */}
        <div className="glass rounded-xl p-8 shadow-modal">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Logo variant="horizontal" />
            <div className="mt-2 text-xs font-mono uppercase tracking-[0.18em] text-fg-tertiary">
              Transport Management System
            </div>
          </div>

          <h1 className="mb-1 text-center text-xl font-semibold tracking-tight text-fg-primary">
            Sign in to TX System
          </h1>
          <p className="mb-6 text-center text-sm text-fg-secondary">
            Welcome back. Use your work email or phone.
          </p>

          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              setTimeout(() => setLoading(false), 1400);
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-secondary">Email</span>
              <Input type="email" placeholder="you@nilevalley.co.ke" autoComplete="email" required />
            </label>

            <label className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-fg-secondary">Password</span>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-brand-blue hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <Input type="password" placeholder="••••••••" autoComplete="current-password" required />
            </label>

            <Button type="submit" size="lg" disabled={loading} className="mt-2">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>

            <div className="my-2 flex items-center gap-3 text-xs text-fg-tertiary">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button type="button" variant="secondary" size="lg">
              <Phone className="size-4" />
              Sign in with Phone (OTP)
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-fg-tertiary">
            By signing in you agree to Nile Valley Logistics' acceptable use policy.
          </p>
        </div>

        <div className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-fg-tertiary">
          tx-system · v0.1 · phase 0
        </div>
      </div>
    </div>
  );
}
