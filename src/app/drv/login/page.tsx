import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { listDrivers } from "@/server/actions/drivers";
import { setDriverSession } from "@/server/actions/driver-session";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default async function DriverLoginPage() {
  const drivers = (await listDrivers()).filter(
    (d) => d.status !== "terminated",
  );

  async function signIn(formData: FormData) {
    "use server";
    const driverId = String(formData.get("driverId"));
    await setDriverSession(driverId);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10">
      {/* Brand-blue radial glow */}
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
            Pick your name to sign in.
          </p>

          <ul className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
            {drivers.map((d) => (
              <li key={d.id}>
                <form action={signIn}>
                  <input type="hidden" name="driverId" value={d.id} />
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-md border border-border bg-bg-base p-3 text-left transition-all hover:border-border-strong hover:bg-bg-elevated"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-navy font-mono text-xs font-semibold text-white">
                      {d.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-fg-primary">{d.fullName}</div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] tnum text-fg-tertiary">
                        <Phone className="size-2.5" />
                        {d.phone}
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-fg-tertiary transition-transform group-hover:translate-x-0.5" />
                  </button>
                </form>
              </li>
            ))}
          </ul>

          <div className="mt-5 text-center text-[10px] text-fg-tertiary">
            By signing in you agree to Nile Valley Logistics' driver-app rules.
          </div>
        </div>

        <div className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-fg-tertiary">
          tx-system · driver app · phase 2F
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
