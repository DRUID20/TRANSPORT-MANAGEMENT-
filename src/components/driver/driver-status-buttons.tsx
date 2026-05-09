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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { transitionTrip } from "@/server/actions/trips";
import { allowedTransitions, isTerminal, type TripStatus } from "@/lib/types/trips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Spec {
  to: TripStatus;
  label: string;
  icon: LucideIcon;
  variant: "primary" | "success" | "outline" | "danger";
  requiresLocation?: boolean;
}

const SPECS: Partial<Record<TripStatus, Spec>> = {
  loading:    { to: "loading",    label: "Started Loading",  icon: Package,      variant: "primary" },
  in_transit: { to: "in_transit", label: "Departed",         icon: TruckIcon,    variant: "primary" },
  at_border:  { to: "at_border",  label: "At Border Post",   icon: Flag,         variant: "outline", requiresLocation: true },
  delivered:  { to: "delivered",  label: "Delivered",        icon: CheckCircle2, variant: "success" },
  delayed:    { to: "delayed",    label: "Flag Delay",       icon: PauseCircle,  variant: "outline" },
};

export function DriverStatusButtons({
  tripId,
  currentStatus,
  actorName,
}: {
  tripId: string;
  currentStatus: TripStatus;
  actorName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showLocation, setShowLocation] = useState(false);
  const [location, setLocation] = useState("");

  const allowed = allowedTransitions(currentStatus).filter((s) => SPECS[s]);

  if (isTerminal(currentStatus)) {
    return (
      <div className="rounded-md border border-border bg-bg-base/40 p-4 text-center text-sm text-fg-tertiary">
        Trip is <span className="font-medium">{currentStatus}</span>. No more updates needed.
      </div>
    );
  }

  function go(to: TripStatus) {
    setError(null);
    const spec = SPECS[to];
    if (spec?.requiresLocation && !location) {
      setShowLocation(true);
      return;
    }
    start(async () => {
      const result = await transitionTrip({
        tripId,
        toStatus: to,
        actorName,
        location: location || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLocation("");
      setShowLocation(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      {showLocation && (
        <div className="rounded-md border border-status-warning/30 bg-status-warning/5 p-3">
          <Label>Border name</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.currentTarget.value)}
            placeholder="Malaba (KE → UG)"
            className="mt-1"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {allowed.map((to) => {
          const spec = SPECS[to]!;
          const Icon = spec.icon;
          return (
            <Button
              key={to}
              size="lg"
              variant={spec.variant}
              onClick={() => go(to)}
              disabled={pending}
              className="h-14 justify-start text-base"
            >
              {pending ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
              {spec.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
