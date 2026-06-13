"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordResetOtp, verifyPasswordResetOtp } from "@/server/actions/auth";

type Step = "request" | "verify";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const addr = String(fd.get("email") ?? "");
    startTransition(async () => {
      const result = await requestPasswordResetOtp(fd);
      if (result.ok) {
        setEmail(addr);
        setStep("verify");
      } else {
        setError(result.error);
      }
    });
  }

  function submitVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("email", email);
    startTransition(async () => {
      const result = await verifyPasswordResetOtp(fd);
      if (result.ok) {
        router.push("/login?reset=1");
      } else {
        setError(result.error);
      }
    });
  }

  if (step === "verify") {
    return (
      <form className="flex flex-col gap-3" onSubmit={submitVerify}>
        <div className="rounded-lg border border-brand-blue/25 bg-brand-blue/5 px-3 py-2.5 text-xs text-fg-secondary">
          If an account exists for <span className="font-medium text-fg-primary">{email}</span>, a
          6-digit code is on its way. Enter it below with your new password. The code expires in 15
          minutes.
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-secondary">6-digit code</span>
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            required
            autoFocus
            error={Boolean(error)}
            leadingIcon={<KeyRound />}
            className="text-center font-mono text-lg tracking-[0.5em]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-secondary">New password</span>
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            required
            leadingIcon={<Lock />}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-secondary">Confirm new password</span>
          <Input
            name="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            minLength={8}
            required
            leadingIcon={<Lock />}
          />
        </label>

        {error && (
          <div className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" disabled={pending} className="mt-2">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Resetting…
            </>
          ) : (
            <>
              <KeyRound className="size-4" /> Reset password
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={() => {
            setStep("request");
            setError(null);
          }}
          className="mt-1 inline-flex items-center justify-center gap-1.5 text-xs text-fg-tertiary transition-colors hover:text-fg-secondary"
        >
          <ArrowLeft className="size-3" /> Use a different email
        </button>
      </form>
    );
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={submitRequest}>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-fg-secondary">Email</span>
        <Input
          name="email"
          type="email"
          placeholder="you@nilevalley.co.ke"
          autoComplete="email"
          required
          error={Boolean(error)}
          autoFocus
        />
      </label>
      {error && (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
          {error}
        </div>
      )}
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Send className="size-4" /> Send reset code
          </>
        )}
      </Button>
      <Link
        href="/login"
        className="mt-1 inline-flex items-center justify-center gap-1.5 text-xs text-fg-tertiary transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft className="size-3" /> Back to sign in
      </Link>
    </form>
  );
}
