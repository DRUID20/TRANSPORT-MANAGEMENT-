"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { createUser } from "@/server/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";
import { ROLE_KEYS, ROLES } from "@/lib/auth/roles";

export function CreateUserForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [roleKey, setRoleKey] = useState("dispatcher");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    start(async () => {
      const r = await createUser({ email, fullName, phone: phone || undefined, roleKey });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setNotice(
        r.emailSent
          ? `User created — an invite with a temporary password was emailed to ${email}.`
          : `User created, but the invite email failed to send (${r.emailError ?? "unknown error"}). Use “Resend password” on the row to try again.`,
      );
      setEmail("");
      setFullName("");
      setPhone("");
      setRoleKey("dispatcher");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <FormSection
        eyebrow="New user"
        title="Invite a teammate"
        description="They'll get an email with a sign-in link and a temporary password. They can change it from the login screen's “Forgot password” link."
        columns={2}
      >
        {error && (
          <div className="sm:col-span-2 rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm font-medium text-status-danger">
            {error}
          </div>
        )}
        {notice && (
          <div className="sm:col-span-2 rounded-md border border-status-success/30 bg-status-success/10 p-3 text-sm font-medium text-status-success">
            {notice}
          </div>
        )}

        <FormField label="Full name" required>
          <Input value={fullName} onChange={(e) => setFullName(e.currentTarget.value)} required placeholder="Jane Wanjiru" />
        </FormField>
        <FormField label="Email" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} required placeholder="jane@nilevalley.co.ke" />
        </FormField>
        <FormField label="Phone" hint="OPTIONAL">
          <Input value={phone} onChange={(e) => setPhone(e.currentTarget.value)} placeholder="+254 7…" />
        </FormField>
        <FormField label="Role" required helper={ROLES[roleKey as keyof typeof ROLES]?.description}>
          <Select value={roleKey} onChange={(e) => setRoleKey(e.currentTarget.value)} required>
            {ROLE_KEYS.map((k) => (
              <option key={k} value={k}>
                {ROLES[k].label}
              </option>
            ))}
          </Select>
        </FormField>
      </FormSection>

      <FormFooter meta={<span>The temporary password is emailed — it's never shown here.</span>}>
        <Button type="submit" disabled={pending || !email || !fullName}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Create &amp; send invite
        </Button>
      </FormFooter>
    </form>
  );
}
