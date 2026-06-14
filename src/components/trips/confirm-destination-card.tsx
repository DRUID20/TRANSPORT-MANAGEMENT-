"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Loader2, RefreshCcw, Search } from "lucide-react";
import { confirmTripDestination, lookupRateForTrip } from "@/server/actions/trips";
import type { RateBasis } from "@/lib/types/trips";
import type { Currency } from "@/lib/types/ledger";
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

const BASIS: { value: RateBasis; label: string }[] = [
  { value: "per_m3", label: "per m³" },
  { value: "per_litre", label: "per litre" },
  { value: "per_trip", label: "per trip (flat)" },
];

function computeRevenue(basis: RateBasis, amount: number, litres: number): number {
  if (basis === "per_m3") return amount * (litres / 1000);
  if (basis === "per_litre") return amount * litres;
  return amount; // per_trip
}

/**
 * Bind the trip's delivery destination AND price it. The rate is destination-
 * driven, so the rate-card lookup happens here (not at booking). After the
 * destination is entered the dispatcher looks up / overrides the rate; on
 * confirm we store the destination + the priced revenue, and anchor the Road
 * User Charge packet on the decision.
 */
export function ConfirmDestinationCard({
  tripId,
  current,
  confirmedAt,
  confirmedBy,
  canForce,
  defaultActor,
  origin,
  customerId,
  cargoClass,
  cargoQuantity,
  revenueAmount,
  revenueCurrency,
}: {
  tripId: string;
  current?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  canForce: boolean;
  defaultActor: string;
  origin: string;
  customerId?: string;
  cargoClass?: string;
  cargoQuantity: number;
  revenueAmount: number;
  revenueCurrency: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [lookingUp, startLookup] = useTransition();
  const isLocked = !!current && !!confirmedAt;
  const priced = revenueAmount > 0;
  const [open, setOpen] = useState(!isLocked);
  const [destination, setDestination] = useState(current ?? "");
  const [where, setWhere] = useState("depot");
  const [actorName, setActorName] = useState(defaultActor);
  const [rateAmount, setRateAmount] = useState("");
  const [rateBasis, setRateBasis] = useState<RateBasis>("per_m3");
  const [rateCurrency, setRateCurrency] = useState<Currency>(
    (["KES", "USD", "UGX"].includes(revenueCurrency) ? revenueCurrency : "USD") as Currency,
  );
  const [rateSource, setRateSource] = useState<"card" | "manual" | "none" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amt = Number(rateAmount) || 0;
  const previewRevenue = amt > 0 ? computeRevenue(rateBasis, amt, cargoQuantity) : 0;

  function onLookup() {
    if (!destination.trim()) {
      setError("Enter the destination first to look up its rate.");
      return;
    }
    setError(null);
    startLookup(async () => {
      const rate = await lookupRateForTrip({
        origin,
        destination: destination.trim(),
        customerId,
        cargoClass,
      });
      if (rate) {
        setRateAmount(String(rate.amount));
        setRateBasis(rate.basis);
        setRateCurrency(rate.currency);
        setRateSource("card");
      } else {
        setRateSource("none");
      }
    });
  }

  function onSubmit() {
    setError(null);
    if (!destination.trim()) return setError("Destination is required.");
    if (!actorName.trim()) return setError("Your name is required for the audit trail.");
    start(async () => {
      const r = await confirmTripDestination({
        tripId,
        destination: destination.trim(),
        actorName: actorName.trim(),
        location: TRANSIT_POINTS.find((p) => p.value === where)?.label,
        force: isLocked,
        // Only send a manual override when the dispatcher typed/edited a rate;
        // otherwise the server looks it up from the card on confirm.
        ...(amt > 0 ? { rateAmount: amt, rateBasis, rateCurrency } : {}),
      });
      if (!r.ok) return setError(r.error);
      toast.success(isLocked ? "Destination updated" : "Destination confirmed", {
        description: `Bound to ${destination.trim()}`,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Card className={isLocked && priced ? "" : "border-status-warning/40 bg-status-warning/5"}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4 text-fg-tertiary" />
              {isLocked ? "Delivery destination & rate" : "Confirm destination & rate"}
            </CardTitle>
            <CardDescription>
              {isLocked
                ? `Bound to ${current}. Confirmed by ${confirmedBy ?? "—"} on ${
                    confirmedAt ? new Date(confirmedAt).toLocaleString() : "—"
                  }.${priced ? ` Priced ${revenueCurrency} ${Math.round(revenueAmount).toLocaleString()}.` : " Rate not set — reopen to price it."}`
                : "Rate is destination-driven, so it's looked up here (not at booking). Set the unload point at the depot or the transit border (Malaba / Busia), then look up / confirm the rate."}
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
        <CardContent className="flex flex-col gap-4">
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

          {/* Rate — looked up from the card for origin→destination, overridable. */}
          <div className="rounded-lg border border-border bg-bg-base/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-secondary">
                Freight rate · {origin} → {destination || "…"}
              </span>
              <Button variant="outline" size="sm" onClick={onLookup} disabled={lookingUp}>
                {lookingUp ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                Look up rate
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min={0}
                  value={rateAmount}
                  onChange={(e) => {
                    setRateAmount(e.currentTarget.value);
                    setRateSource("manual");
                  }}
                  className="font-mono tnum"
                  placeholder="0.00"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Basis</Label>
                <Select value={rateBasis} onChange={(e) => setRateBasis(e.currentTarget.value as RateBasis)}>
                  {BASIS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Currency</Label>
                <Select value={rateCurrency} onChange={(e) => setRateCurrency(e.currentTarget.value as Currency)}>
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                  <option value="UGX">UGX</option>
                </Select>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-fg-tertiary">
                {rateSource === "card" && "From rate card — edit to override."}
                {rateSource === "none" && "No rate card for this route — enter the agreed rate."}
                {rateSource === "manual" && "Manual rate."}
                {rateSource === null && "Look up the card rate, or enter the agreed rate. Leave blank to auto-apply the card rate on confirm."}
              </span>
              {amt > 0 && (
                <span className="font-mono tnum font-semibold text-fg-primary">
                  Revenue ≈ {rateCurrency} {Math.round(previewRevenue).toLocaleString()}
                </span>
              )}
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
                <><MapPin className="size-4" /> {isLocked ? "Update" : "Confirm destination & rate"}</>
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
