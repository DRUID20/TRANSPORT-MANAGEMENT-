"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Power } from "lucide-react";
import { resetUserPassword, setUserActive, setUserRole } from "@/server/actions/users";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ROLE_KEYS, ROLES } from "@/lib/auth/roles";

export function UserRowActions({
  userId,
  roleKey,
  isActive,
  isSelf,
}: {
  userId: string;
  roleKey: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string; emailSent?: boolean; emailError?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.error ?? "Something went wrong.");
        return;
      }
      if (r.emailSent === false) setError(`Saved, but email failed: ${r.emailError ?? "unknown"}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Select
          value={roleKey}
          disabled={pending}
          onChange={(e) => run(() => setUserRole({ userId, roleKey: e.currentTarget.value }))}
          className="h-9 w-[140px] text-[13px]"
          aria-label="Role"
        >
          {ROLE_KEYS.map((k) => (
            <option key={k} value={k}>
              {ROLES[k].label}
            </option>
          ))}
          {!ROLE_KEYS.includes(roleKey as never) && <option value={roleKey}>{roleKey}</option>}
        </Select>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => resetUserPassword({ userId }))}
          title="Email a fresh temporary password"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
          Resend password
        </Button>

        <Button
          type="button"
          size="sm"
          variant={isActive ? "outline" : "success"}
          disabled={pending || isSelf}
          title={isSelf ? "You can't deactivate your own account" : isActive ? "Deactivate" : "Activate"}
          onClick={() => run(() => setUserActive({ userId, isActive: !isActive }))}
        >
          <Power className="size-3.5" />
          {isActive ? "Deactivate" : "Activate"}
        </Button>
      </div>
      {error && <span className="text-[11px] font-semibold text-status-danger">{error}</span>}
    </div>
  );
}
