"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Loader2, RefreshCcw } from "lucide-react";
import { confirmTripDestination } from "@/server/actions/trips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

const TRANSIT_POINTS = [
  { value: "depot", label: "At the depot (before dispatch)" },
  { value: "malaba", label: "Malaba border post" },
  { value: "busia", label: "Busia border post" },
  { value: "other", label: "Elsewhere en-route" },
];

/**
 * Bind the trip's delivery destination — at the depot, or at the transit
 * border (Malaba / Busia). After confirmation the address is locked for the
 * Road User Charge packet and downstream invoicing; the trip detail screen
 * switches from "destination TBC" to the bound value.
 */
export function ConfirmDestinationCard({
  tripId,
  current,
  confirmedAt,
  confirmedBy,
  canForce,
  defaultActor,
}: {
  tripId: string;
  current?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  /** True only when status is still planned/loading — lets a dispatcher
   *  correct an earlier bind. After loading it's frozen for accountability. */
  canForce: boolean;
  defaultActor: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const isLocked = !!current && !!confirmedAt;
  const [open, setOpen] = useState(!isLocked);
  const [destination, setDestination] = useState(current ?? "");
  const [where, setWhere] = useState("depot");
  const [actorName, setActorName] = useState(defaultActor);
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    setError(null);
    if (!destination.trim()) {
      setError("Destination is required.");
      return;
    }
    if (!actorName.trim()) {
      setError("Your name is required for the audit trail.");
      return;
    }
    start(async () => {
      const r = await confirmTripDestination({
        tripId,
        destination: destination.trim(),
        actorName: actorName.trim(),
        location: TRANSIT_POINTS.find((p) => p.value === where)?.label,
        force: isLocked,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success(isLocked ? "Destination updated" : "Destination confirmed", {
        description: `Bound to ${destination.trim()}`,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Card className={isLocked ? "" : "border-status-warning/40 bg-status-warning/5"}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4 text-fg-tertiary" />
              {isLocked ? "Delivery destination" : "Confirm delivery destination"}
            </CardTitle>
            <CardDescription>
              {isLocked
                ? `Bound to ${current}. Confirmed by ${confirmedBy ?? "—"} on ${
                    confirmedAt ? new Date(confirmedAt).toLocaleString() : "—"
                  }.`
                : "The truck is loaded at the depot; bind the unload point here or at the transit border (Malaba / Busia). The Road User Charge packet anchors on this decision."}
            </CardDescription>
          </div>
          {isLocked && canForce && !open && (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <RefreshCcw className="size-3.5" /> Correct
            </Button>
          )}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_240px]">
            <div className="flex flex-col gap-1.5">
              <Label>Destination</Label>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.currentTarget.value)}
                placeholder="e.g. Kampala — Total City Oilibya"
                className="font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Where confirmed</Label>
              <Select value={where} onChange={(e) => setWhere(e.currentTarget.value)}>
                {TRANSIT_POINTS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:max-w-md">
            <Label>Your name (for the audit trail)</Label>
            <Input value={actorName} onChange={(e) => setActorName(e.currentTarget.value)} />
          </div>
          {error && (
            <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button onClick={onSubmit} disabled={pending}>
              {pending ? (
                <><Loader2 className="size-4 animate-spin" /> Saving…</>
              ) : (
                <><MapPin className="size-4" /> {isLocked ? "Update destination" : "Confirm destination"}</>
              )}
            </Button>
            {isLocked && (
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
