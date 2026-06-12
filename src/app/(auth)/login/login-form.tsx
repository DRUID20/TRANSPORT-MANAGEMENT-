"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/server/actions/auth";

/**
 * Login form — submits to the signIn server action which sets the
 * session cookie and redirects via Next's internal redirect. On
 * validation failure the action returns { ok: false, error } and we
 * render it under the form.
 */
export function LoginForm({ returnTo }: { returnTo?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (returnTo) formData.set("returnTo", returnTo);
    startTransition(async () => {
      const result = await signIn(formData);
      if (result && !result.ok) setError(result.error);
    });
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

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-fg-secondary">Password</span>
        <Input
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          error={Boolean(error)}
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
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}
