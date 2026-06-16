"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Edit3, Fuel, Loader2 } from "lucide-react";
import { reconcileAndCloseTrip } from "@/server/actions/trips";
import { billableFreight } from "@/lib/types/trips";
import { Button } from "@/components/ui/button";
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
  cargoUnit: string;
  cargoQuantity: number;
  loadedLitres?: number;
  loadedLitres20C?: number;
  /** Km / litres / km-L derived from the station-manager-verified fuel-log
   *  timeline. This — not free-text — is what gets reconciled. The dispatcher
   *  only overrides via "Edit with reason" when the auto-derivation is wrong. */
  derivation: {
    startOdoKm?: number;
    endOdoKm?: number;
    kmCovered?: number;
    litresDuring: number;
    kmPerLitre?: number;
    contributingLogCount: number;
    note?: string;
  };
}

export function TripReconciliation(props: TripReconciliationProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const derivedKm = props.derivation.kmCovered ?? props.initialActualKm;
  const derivedLitres = props.derivation.litresDuring || props.initialActualFuelLitres || 0;

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideKm, setOverrideKm] = useState(
    props.initialActualKm ? String(props.initialActualKm) : "",
  );
  const [overrideLitres, setOverrideLitres] = useState(
    props.initialActualFuelLitres ? String(props.initialActualFuelLitres) : "",
  );
  const [overrideReason, setOverrideReason] = useState("");

  const [advanceUsed, setAdvanceUsed] = useState(
    props.initialDriverAdvanceUsedKes ? String(props.initialDriverAdvanceUsedKes) : "",
  );
  const [closingNotes, setClosingNotes] = useState("");

  // Billable freight on loaded L20 (the BOL figure), not the booked volume.
  const bill = billableFreight({
    cargoUnit: props.cargoUnit,
    cargoQuantity: props.cargoQuantity,
    revenueAmount: props.revenueAmount,
    revenueCurrency: props.revenueCurrency,
    loadedLitres: props.loadedLitres,
    loadedLitres20C: props.loadedLitres20C,
  });
  const billLabel =
    bill.source === "loaded"
      ? "Freight to invoice (loaded L20)"
      : "Freight to invoice (booked)";

  // What we'll actually persist: derived figures by default; the override
  // values only when the dispatcher explicitly opened the panel AND typed a
  // value AND gave a reason. (Reason makes overrides auditable in the trip's
  // closing notes — no silent corrections.)
  const useOverride = overrideOpen && overrideReason.trim().length > 0;
  const persistedKm = useOverride && overrideKm ? Number(overrideKm) : derivedKm;
  const persistedLitres =
    useOverride && overrideLitres ? Number(overrideLitres) : derivedLitres || undefined;
  const displayKmPerLitre =
    persistedKm !== undefined && persistedLitres && persistedLitres > 0
      ? Math.round((persistedKm / persistedLitres) * 100) / 100
      : props.derivation.kmPerLitre;

  const used = Number(advanceUsed || 0);
  const advanceBalance = props.driverAdvanceKes - used;
  const totalKnownCostsKes = used + props.borderChargesKes;

  function onClose() {
    setError(null);
    start(async () => {
      const overrideNote =
        useOverride && overrideReason.trim()
          ? `Reconciliation override: ${overrideReason.trim()}`
          : undefined;
      const result = await reconcileAndCloseTrip({
        tripId: props.tripId,
        actualKm: persistedKm,
        actualFuelLitres: persistedLitres,
        driverAdvanceUsedKes: advanceUsed ? Number(advanceUsed) : undefined,
        closingNotes:
          [closingNotes.trim(), overrideNote].filter(Boolean).join("\n") || undefined,
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
    <section className="surface-card overflow-hidden border-status-success/30 bg-status-success/5">
      <header className="border-b border-status-success/20 px-5 py-4">
        <h2 className="text-[13px] font-semibold tracking-tight text-status-success">
          Reconcile and close
        </h2>
        <p className="text-xs text-fg-tertiary">
          Trip km, litres and km/L are derived from station-manager-verified fuel logs.
          Confirm the figures, capture advance used, then close.
        </p>
      </header>
      <div className="flex flex-col gap-5 px-5 py-5">
        {error && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </div>
        )}

        {/* Derived figures (read-only) */}
        <div className="rounded-md border-2 border-border bg-bg-base/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Fuel className="size-4 text-fg-tertiary" />
              <h3 className="text-[13px] font-bold tracking-tight text-fg-primary">
                Derived from fuel logs
              </h3>
            </div>
            <Link
              href={`/fuel?trip=${props.tripId}`}
              className="text-[11px] font-semibold text-brand-blue hover:underline"
            >
              View {props.derivation.contributingLogCount} fuel log
              {props.derivation.contributingLogCount === 1 ? "" : "s"} →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DerivedStat
              label="Start odometer"
              value={fmtKm(props.derivation.startOdoKm)}
              hint="Last fuel log on/before departure"
            />
            <DerivedStat
              label="End odometer"
              value={fmtKm(props.derivation.endOdoKm)}
              hint="Last fuel log on/before delivery"
            />
            <DerivedStat
              label="Km driven"
              value={fmtKm(persistedKm, true)}
              tone="info"
            />
            <DerivedStat
              label="Litres used"
              value={persistedLitres ? `${persistedLitres.toLocaleString()} L` : "—"}
              tone="info"
            />
            {displayKmPerLitre && (
              <DerivedStat
                label="Fuel efficiency"
                value={`${displayKmPerLitre.toFixed(2)} km/L`}
                tone="success"
              />
            )}
          </div>
          {props.derivation.note && (
            <p className="mt-3 text-[11px] font-medium text-status-warning">
              {props.derivation.note}
            </p>
          )}

          <div className="mt-4 border-t border-border pt-3">
            {!overrideOpen ? (
              <button
                type="button"
                onClick={() => setOverrideOpen(true)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-fg-tertiary transition-colors hover:text-fg-primary"
              >
                <Edit3 className="size-3" />
                Edit with reason (override)
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[12px] font-medium text-fg-secondary">
                  Override the derived figures only if you have a specific reason
                  (broken odometer, missed fuel log, mis-keyed reading). The reason
                  is appended to closing notes for audit.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Override km driven</Label>
                    <Input
                      type="number"
                      min={0}
                      value={overrideKm}
                      onChange={(e) => setOverrideKm(e.currentTarget.value)}
                      className="font-mono tnum"
                      placeholder={derivedKm ? String(derivedKm) : "1180"}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Override litres</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={overrideLitres}
                      onChange={(e) => setOverrideLitres(e.currentTarget.value)}
                      className="font-mono tnum"
                      placeholder={derivedLitres ? String(derivedLitres) : "345"}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Reason (required for override)</Label>
                  <Input
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.currentTarget.value)}
                    placeholder="Odometer reset mid-trip / missing fuel log / etc."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setOverrideOpen(false);
                      setOverrideKm("");
                      setOverrideLitres("");
                      setOverrideReason("");
                    }}
                  >
                    Cancel override
                  </Button>
                  <span className="text-[11px] font-medium text-fg-tertiary">
                    {useOverride ? "Override will be applied on close." : "Reason needed to apply."}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Money roll-up — borrow + freight + costs */}
        <div className="grid gap-3 rounded-md border border-border bg-bg-base/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat
            label={billLabel}
            value={`${bill.amount.toLocaleString()} ${bill.currency}`}
            tone="success"
            hint={
              bill.billedLitres !== undefined && bill.ratePerLitre !== undefined
                ? `${bill.billedLitres.toLocaleString()} L × ${bill.ratePerLitre} ${bill.currency}/L` +
                  (bill.source !== "booked"
                    ? ` (booked ${props.cargoQuantity.toLocaleString()} L)`
                    : "")
                : undefined
            }
          />
          <SummaryStat
            label="Border charges"
            value={`KSh ${props.borderChargesKes.toLocaleString()}`}
          />
          <SummaryStat label="Driver advance used" value={`KSh ${used.toLocaleString()}`} />
          <SummaryStat
            label={advanceBalance >= 0 ? "Advance balance (returned)" : "Advance overspent"}
            value={`KSh ${Math.abs(advanceBalance).toLocaleString()}`}
            tone={advanceBalance >= 0 ? "success" : "danger"}
          />
          <SummaryStat
            label="Known direct costs (KES)"
            value={`KSh ${totalKnownCostsKes.toLocaleString()}`}
            tone="warning"
            hint="Border + driver allowance reconciled here; fuel, tolls and workshop appear via their own modules."
          />
        </div>

        {/* Advance used (still typed — paid out of advance, not on a log) */}
        <div className="grid gap-3 sm:grid-cols-2">
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
            Close and Reconcile
          </Button>
        </div>
      </div>
    </section>
  );
}

function fmtKm(value: number | undefined, allowZero = false): string {
  if (value === undefined || (!allowZero && value === 0)) return "—";
  return `${value.toLocaleString()} km`;
}

function DerivedStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "info" | "success";
}) {
  const colour =
    tone === "info" ? "text-brand-blue" : tone === "success" ? "text-status-success" : "text-fg-primary";
  return (
    <div className="rounded-md bg-bg-surface px-3 py-2.5 ring-1 ring-inset ring-border">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </div>
      <div className={`mt-0.5 font-mono tnum text-base font-bold ${colour}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-fg-tertiary">{hint}</div>}
    </div>
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
