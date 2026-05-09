"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Flag,
  Loader2,
  Package,
  PauseCircle,
  Truck as TruckIcon,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { transitionTrip } from "@/server/actions/trips";
import { allowedTransitions, isTerminal, type TripStatus } from "@/lib/types/trips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ButtonSpec {
  to: TripStatus;
  label: string;
  icon: LucideIcon;
  variant: "primary" | "secondary" | "success" | "danger" | "outline";
  /** If true, the action requires a location to be specified. */
  requiresLocation?: boolean;
}

const SPECS: Partial<Record<TripStatus, ButtonSpec>> = {
  loading:    { to: "loading",    label: "Start Loading",   icon: Package,       variant: "primary" },
  in_transit: { to: "in_transit", label: "Depart",          icon: TruckIcon,     variant: "primary" },
  at_border:  { to: "at_border",  label: "Arrive at Border", icon: Flag,          variant: "secondary", requiresLocation: true },
  delivered:  { to: "delivered",  label: "Mark Delivered",  icon: CheckCircle2,  variant: "success" },
  closed:     { to: "closed",     label: "Close Trip",      icon: CheckCircle2,  variant: "success" },
  delayed:    { to: "delayed",    label: "Flag Delay",      icon: PauseCircle,   variant: "outline" },
  cancelled:  { to: "cancelled",  label: "Cancel",          icon: XCircle,       variant: "danger" },
};

export function TripStatusUpdate({
  tripId,
  currentStatus,
}: {
  tripId: string;
  currentStatus: TripStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<TripStatus | null>(null);
  const [actorName, setActorName] = useState("Dispatcher");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");

  const allowed = allowedTransitions(currentStatus);

  if (isTerminal(currentStatus)) {
    return (
      <div className="rounded-md border border-border bg-bg-base/40 p-4 text-center text-sm text-fg-tertiary">
        Trip is <span className="font-medium">{currentStatus}</span>. No further status changes allowed.
      </div>
    );
  }

  function go(to: TripStatus) {
    setError(null);
    const spec = SPECS[to];
    if (spec?.requiresLocation && !location) {
      // Open the inline form instead of firing immediately
      setConfirming(to);
      return;
    }
    startTransition(async () => {
      const result = await transitionTrip({
        tripId,
        toStatus: to,
        actorName: actorName || "Dispatcher",
        note: note || undefined,
        location: location || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(null);
      setNote("");
      setLocation("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      {/* Optional context (actor + note + location) */}
      <details className="group rounded-md border border-border bg-bg-base/40 p-3 text-sm">
        <summary className="cursor-pointer text-xs uppercase tracking-wider text-fg-tertiary">
          Update context (actor · location · note)
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Actor (who is updating)</Label>
            <Input value={actorName} onChange={(e) => setActorName(e.currentTarget.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Location (e.g. Malaba KE→UG)</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.currentTarget.value)}
              placeholder="Malaba (KE → UG)"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.currentTarget.value)}
              rows={2}
              placeholder="Anything notable about this status change…"
            />
          </div>
        </div>
      </details>

      {/* Action buttons for allowed transitions */}
      <div className="flex flex-wrap items-center gap-2">
        {allowed.map((to) => {
          const spec = SPECS[to];
          if (!spec) return null;
          const Icon = spec.icon;
          const needsLocation = spec.requiresLocation && !location;
          return (
            <div key={to} className="flex flex-col gap-1">
              <Button
                onClick={() => go(to)}
                variant={spec.variant}
                disabled={pending}
              >
                {pending && confirming === to ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Icon className="size-4" />
                )}
                {spec.label}
              </Button>
              {needsLocation && confirming === to && (
                <span className="text-[10px] text-status-warning">
                  Add a location above first
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
