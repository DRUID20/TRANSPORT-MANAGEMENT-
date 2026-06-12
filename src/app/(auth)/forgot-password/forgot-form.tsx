"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordResetOtp } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await requestPasswordResetOtp(formData);
      if (result.ok) setSent(true);
      else setError(result.error);
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-status-success/30 bg-status-success/10 p-5 text-center">
        <CheckCircle2 className="size-6 text-status-success" />
        <div className="text-sm text-fg-primary">
          If an account exists for that email, a 6-digit code has been sent.
          Check your inbox.
        </div>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
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
            <Loader2 className="size-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send className="size-4" />
            Send reset code
          </>
        )}
      </Button>
    </form>
  );
}
