"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Droplet, Fuel, Loader2, Save } from "lucide-react";
import { createRate } from "@/server/actions/rates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FUEL_DEPOTS,
  FUEL_PRODUCT_LABELS,
  type FuelProduct,
  type RateBasis,
} from "@/lib/types/trips";

type Cus = { id: string; name: string };

/**
 * Tiny helper that previews what the agreed amount works out to for a
 * standard 40 000 L tanker over a representative distance. Helps the
 * commercial team sanity-check a per-litre rate before they save it.
 *
 *  per_litre        → amount × 40 000
 *  per_litre_per_km → amount × 40 000 × 600 km (Mombasa-Nairobi reference)
 *  per_trip         → amount
 *  per_km           → amount × 600
 */
function previewRevenue(basis: RateBasis, amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  const REFERENCE_LITRES = 40_000;
  const REFERENCE_KM = 600;
  let r: number;
  switch (basis) {
    case "per_litre":
      r = amount * REFERENCE_LITRES;
      break;
    case "per_litre_per_km":
      r = amount * REFERENCE_LITRES * REFERENCE_KM;
      break;
    case "per_km":
      r = amount * REFERENCE_KM;
      break;
    case "per_trip":
      r = amount;
      break;
    default:
      // Legacy bases (per_tonne, per_container) — no preview, the form
      // is for fuel rates and these shouldn't be picked here.
      return "—";
  }
  return r.toLocaleString();
}

export function RateCreateForm({ customers }: { customers: Cus[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [basis, setBasis] = useState<RateBasis>("per_litre");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<"KES" | "USD" | "UGX" | "TZS" | "RWF">("KES");
  const [product, setProduct] = useState<FuelProduct | "">("");

  const preview = previewRevenue(basis, Number(amount));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createRate({
      origin: String(fd.get("origin") ?? ""),
      destination: String(fd.get("destination") ?? ""),
      customerId: String(fd.get("customerId") ?? "") || undefined,
      cargoClass: product || undefined,
      basis,
      amount: Number(amount),
      currency,
      notes: String(fd.get("notes") ?? "") || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/rates");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Route</CardTitle>
          <CardDescription>
            Origin must be a fuel depot. Destination is the customer's offtake
            point — same string used on the booking form.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Origin (depot)">
            <Select name="origin" required defaultValue={FUEL_DEPOTS[0]}>
              {FUEL_DEPOTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </Field>
          <Field label="Destination">
            <Input name="destination" required placeholder="Nairobi" />
          </Field>
          <Field label="Customer (optional)" hint="Leave blank for default rate on this route" className="sm:col-span-2">
            <Select name="customerId" defaultValue="">
              <option value="">— Default (any customer) —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Product (optional)" hint="If set, the rate only applies when the booking matches this product" className="sm:col-span-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProduct("")}
                className={pillClass(product === "")}
              >
                Any
              </button>
              {(Object.keys(FUEL_PRODUCT_LABELS) as FuelProduct[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProduct(p)}
                  className={pillClass(product === p)}
                >
                  <Droplet className="size-3.5" />
                  {p}
                </button>
              ))}
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="size-4 text-fg-tertiary" />
            Pricing
          </CardTitle>
          <CardDescription>
            Per-litre is the typical Kenyan fuel-haul basis. Per-litre-per-km
            is for long-distance contracts that explicitly bill on distance.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Basis">
            <Select
              value={basis}
              onChange={(e) => setBasis(e.currentTarget.value as RateBasis)}
            >
              <option value="per_litre">Per litre</option>
              <option value="per_litre_per_km">Per litre per km</option>
              <option value="per_trip">Per trip (flat)</option>
              <option value="per_km">Per km</option>
            </Select>
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              required
              min={0}
              step="0.0001"
              value={amount}
              onChange={(e) => setAmount(e.currentTarget.value)}
              placeholder={basis === "per_litre_per_km" ? "0.012" : "8.50"}
              className="font-mono tnum"
            />
          </Field>
          <Field label="Currency">
            <Select value={currency} onChange={(e) => setCurrency(e.currentTarget.value as never)}>
              <option value="KES">KES</option>
              <option value="USD">USD</option>
              <option value="UGX">UGX</option>
              <option value="TZS">TZS</option>
              <option value="RWF">RWF</option>
            </Select>
          </Field>
          <div className="sm:col-span-3 rounded-md border border-dashed border-border bg-bg-base/40 p-3 text-[11px] text-fg-tertiary">
            <span>40 000 L</span>
            {basis === "per_litre_per_km" || basis === "per_km"
              ? <span> over 600 km reference (Mombasa-Nairobi)</span>
              : null}
            <span> at this rate ≈ </span>
            <span className="font-mono tnum font-semibold text-fg-primary">
              {preview} {currency}
            </span>
            <span> per trip</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent><Textarea name="notes" rows={3} placeholder="e.g. Effective Q3 2026; demurrage after 4h waiting; price excludes road levies." /></CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Save Rate</>}
        </Button>
      </div>
    </form>
  );
}

function pillClass(active: boolean): string {
  return (
    "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-all " +
    (active
      ? "border-brand-blue bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/30"
      : "border-border bg-bg-elevated text-fg-secondary hover:border-border-strong hover:text-fg-primary")
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={"flex flex-col gap-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
      {hint && <span className="text-[11px] text-fg-tertiary">{hint}</span>}
    </div>
  );
}
