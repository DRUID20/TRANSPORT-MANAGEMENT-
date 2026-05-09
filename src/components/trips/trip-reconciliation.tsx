"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { reconcileAndCloseTrip } from "@/server/actions/trips";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface TripReconciliationProps {
  tripId: string;
  status: string;
  revenueAmount: number;
  revenueCurrency: string;
  driverAdvanceKes: number;
  borderChargesKes: number;
  initialActualKm?: number;
  initialActualFuelLitres?: number;
  initialDriverAdvanceUsedKes?: number;
}

export function TripReconciliation(props: TripReconciliationProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [actualKm, setActualKm] = useState(
    props.initialActualKm ? String(props.initialActualKm) : "",
  );
  const [actualFuelLitres, setActualFuelLitres] = useState(
    props.initialActualFuelLitres ? String(props.initialActualFuelLitres) : "",
  );
  const [advanceUsed, setAdvanceUsed] = useState(
    props.initialDriverAdvanceUsedKes ? String(props.initialDriverAdvanceUsedKes) : "",
  );
  const [closingNotes, setClosingNotes] = useState("");

  const used = Number(advanceUsed || 0);
  const advanceBalance = props.driverAdvanceKes - used;
  const totalKnownCostsKes = used + props.borderChargesKes;
  const fuelEff = actualKm && actualFuelLitres && Number(actualFuelLitres) > 0
    ? Number(actualKm) / Number(actualFuelLitres)
    : null;

  function onClose() {
    setError(null);
    start(async () => {
      const result = await reconcileAndCloseTrip({
        tripId: props.tripId,
        actualKm: actualKm ? Number(actualKm) : undefined,
        actualFuelLitres: actualFuelLitres ? Number(actualFuelLitres) : undefined,
        driverAdvanceUsedKes: advanceUsed ? Number(advanceUsed) : undefined,
        closingNotes: closingNotes || undefined,
        actorName: "Dispatcher",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (props.status !== "delivered") return null;

  return (
    <Card className="border-status-success/30 bg-status-success/5">
      <CardHeader>
        <CardTitle className="text-status-success">Reconcile & close</CardTitle>
        <CardDescription>
          Capture actual km, fuel and advance used. Once closed, the trip
          becomes ready to invoice.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {error && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </div>
        )}

        {/* Actuals */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Actual km driven</Label>
            <Input
              type="number"
              min={0}
              value={actualKm}
              onChange={(e) => setActualKm(e.currentTarget.value)}
              className="font-mono tnum"
              placeholder="1180"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Actual fuel (litres)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={actualFuelLitres}
              onChange={(e) => setActualFuelLitres(e.currentTarget.value)}
              className="font-mono tnum"
              placeholder="345"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Driver advance used (KES)</Label>
            <Input
              type="number"
              min={0}
              value={advanceUsed}
              onChange={(e) => setAdvanceUsed(e.currentTarget.value)}
              className="font-mono tnum"
              placeholder={String(props.driverAdvanceKes)}
            />
          </div>
        </div>

        {/* Computed roll-up */}
        <div className="grid gap-3 rounded-md border border-border bg-bg-base/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat
            label="Revenue"
            value={`${props.revenueAmount.toLocaleString()} ${props.revenueCurrency}`}
            tone="success"
          />
          <SummaryStat
            label="Border charges"
            value={`KSh ${props.borderChargesKes.toLocaleString()}`}
          />
          <SummaryStat
            label="Driver advance used"
            value={`KSh ${used.toLocaleString()}`}
          />
          <SummaryStat
            label={advanceBalance >= 0 ? "Advance balance (returned)" : "Advance overspent"}
            value={`KSh ${Math.abs(advanceBalance).toLocaleString()}`}
            tone={advanceBalance >= 0 ? "success" : "danger"}
          />
          <SummaryStat
            label="Known direct costs (KES)"
            value={`KSh ${totalKnownCostsKes.toLocaleString()}`}
            tone="warning"
            hint="Border + driver allowance. Fuel + tolls + maintenance roll up in Phase 4-5."
          />
          {fuelEff && (
            <SummaryStat
              label="Fuel efficiency"
              value={`${fuelEff.toFixed(2)} km/L`}
              tone="info"
            />
          )}
        </div>

        {/* Closing notes */}
        <div className="flex flex-col gap-1.5">
          <Label>Closing notes (optional)</Label>
          <Textarea
            rows={2}
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.currentTarget.value)}
            placeholder="POD received, customer signed, no incidents."
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="success" onClick={onClose} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Close & Reconcile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "warning" | "info";
  hint?: string;
}) {
  const colour =
    tone === "success"
      ? "text-status-success"
      : tone === "danger"
        ? "text-status-danger"
        : tone === "warning"
          ? "text-status-warning"
          : tone === "info"
            ? "text-brand-blue"
            : "text-fg-primary";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-0.5 font-mono tnum text-base font-semibold ${colour}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-fg-tertiary">{hint}</div>}
    </div>
  );
}
