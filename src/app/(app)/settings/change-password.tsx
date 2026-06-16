"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { changeMyPassword } from "@/server/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormSection } from "@/components/ui/form-section";

/**
 * Change-password card. Requires the user's CURRENT password and a confirm —
 * matches the server-side check in changeMyPassword. No admin override here;
 * for forgotten passwords the user signs out and uses "Forgot password".
 */
export function ChangePassword() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    start(async () => {
      const r = await changeMyPassword({
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOk(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <FormSection
        eyebrow="Security"
        title="Change password"
        description="Enter your current password to confirm, then choose a new one (min 8 characters)."
        columns={2}
      >
        {error && (
          <div className="sm:col-span-2 rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm font-medium text-status-danger">
            {error}
          </div>
        )}
        {ok && (
          <div className="sm:col-span-2 flex items-center gap-2 rounded-md border border-status-success/30 bg-status-success/10 p-3 text-sm font-medium text-status-success">
            <CheckCircle2 className="size-4" />
            Password updated. Use it next time you sign in.
          </div>
        )}

        <FormField label="Current password" required className="sm:col-span-2">
          <Input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.currentTarget.value)}
            required
          />
        </FormField>
        <FormField label="New password" required helper="At least 8 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.currentTarget.value)}
            required
            minLength={8}
          />
        </FormField>
        <FormField label="Confirm new password" required>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.currentTarget.value)}
            required
            minLength={8}
          />
        </FormField>

        <div className="sm:col-span-2 flex items-center justify-end">
          <Button type="submit" disabled={pending || !current || !next || !confirm}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Update password
          </Button>
        </div>
      </FormSection>
    </form>
  );
}
