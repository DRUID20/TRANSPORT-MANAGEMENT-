"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Droplet, Fuel, Loader2, Save, Sparkles } from "lucide-react";
import { createBooking } from "@/server/actions/bookings";
import { lookupRate } from "@/server/actions/rates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FUEL_DEPOTS, FUEL_PRODUCT_LABELS, type FuelProduct, type RateBasis } from "@/lib/types/trips";

type Cus = { id: string; name: string; billingCurrency: "KES" | "USD" };

const DEFAULT_DESTINATIONS = [
  "Nairobi",
  "Kisumu",
  "Eldoret",
  "Nakuru",
  "Kampala",
  "Kigali",
  "Bujumbura",
  "Juba",
  "Goma",
  "Other (specify)",
];

export function BookingCreateForm({
  customers,
  preselectCustomerId,
}: {
  customers: Cus[];
  preselectCustomerId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState(preselectCustomerId ?? "");
  const [product, setProduct] = useState<FuelProduct>("AGO");
  const [origin, setOrigin] = useState<string>(FUEL_DEPOTS[0]);
  const [destination, setDestination] = useState<string>(DEFAULT_DESTINATIONS[0]!);
  const [destinationOther, setDestinationOther] = useState("");
  const [agreedAmount, setAgreedAmount] = useState("");
  const [agreedBasis, setAgreedBasis] = useState<RateBasis>("per_litre");
  const [agreedCurrency, setAgreedCurrency] = useState<"KES" | "USD" | "UGX" | "TZS" | "RWF">("KES");
  const [rateHint, setRateHint] = useState<string | null>(null);
  const [lookingUp, startLookup] = useTransition();

  const finalDestination =
    destination === "Other (specify)" ? destinationOther.trim() : destination;

  function onLookupRate() {
    setRateHint(null);
    startLookup(async () => {
      const rate = await lookupRate({
        origin,
        destination: finalDestination,
        customerId: customerId || undefined,
      });
      if (!rate) {
        setRateHint(`No rate found for ${origin} → ${finalDestination}. Add one in /rates.`);
        return;
      }
      setAgreedAmount(String(rate.amount));
      setAgreedBasis(rate.basis);
      setAgreedCurrency(rate.currency);
      setRateHint(
        rate.customerId ? "Customer-specific rate applied." : "Default rate applied.",
      );
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (destination === "Other (specify)" && !destinationOther.trim()) {
      setError("Specify the destination");
      return;
    }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createBooking({
      customerId,
      origin,
      destination: finalDestination,
      product,
      cargoQuantity: Number(fd.get("cargoQuantity") ?? 0),
      cargoUnit: "litres",
      requestedDate: String(fd.get("requestedDate") ?? ""),
      agreedAmount: Number(agreedAmount),
      agreedBasis,
      agreedCurrency,
      notes: String(fd.get("notes") ?? "") || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/bookings/${result.id}`);
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
          <CardTitle>Customer & route</CardTitle>
          <CardDescription>
            Pick the depot for loading and the offtake point for delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer" className="sm:col-span-2">
            <Select
              value={customerId}
              onChange={(e) => setCustomerId(e.currentTarget.value)}
              required
            >
              <option value="" disabled>Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.billingCurrency})</option>
              ))}
            </Select>
          </Field>
          <Field label="Origin (depot)">
            <Select value={origin} onChange={(e) => setOrigin(e.currentTarget.value)} required>
              {FUEL_DEPOTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </Field>
          <Field label="Destination">
            <Select
              value={destination}
              onChange={(e) => setDestination(e.currentTarget.value)}
              required
            >
              {DEFAULT_DESTINATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </Field>
          {destination === "Other (specify)" && (
            <Field label="Destination name" className="sm:col-span-2">
              <Input
                value={destinationOther}
                onChange={(e) => setDestinationOther(e.currentTarget.value)}
                placeholder="e.g. Lokichogio, Mtwapa, Mwanza…"
                required
              />
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="size-4 text-fg-tertiary" />
            Product & volume
          </CardTitle>
          <CardDescription>
            Loading observations (temperature, density, dipstick) are captured
            later from the depot loading sheet.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Product" className="sm:col-span-1">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(FUEL_PRODUCT_LABELS) as FuelProduct[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProduct(p)}
                  className={
                    "inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-all " +
                    (product === p
                      ? "border-brand-blue bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/30"
                      : "border-border bg-bg-elevated text-fg-secondary hover:border-border-strong hover:text-fg-primary")
                  }
                >
                  <Droplet className="size-3.5" />
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Quantity (litres)">
            <Input
              name="cargoQuantity"
              type="number"
              required
              min={1}
              step="1"
              className="font-mono tnum"
              placeholder="40000"
            />
          </Field>
          <Field label="Requested date">
            <Input name="requestedDate" type="date" required className="font-mono tnum" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rate</CardTitle>
              <CardDescription>
                Pulled from the rate table; you can override. Per-litre or
                per-litre-per-km is typical for fuel haul.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onLookupRate}
              disabled={lookingUp || !origin || !finalDestination}
            >
              {lookingUp ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Lookup rate
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Amount">
            <Input
              type="number"
              required
              min={0}
              step="0.01"
              value={agreedAmount}
              onChange={(e) => setAgreedAmount(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="Basis">
            <Select value={agreedBasis} onChange={(e) => setAgreedBasis(e.currentTarget.value as RateBasis)}>
              <option value="per_litre">Per litre</option>
              <option value="per_litre_per_km">Per litre per km</option>
              <option value="per_trip">Per trip (flat)</option>
              <option value="per_km">Per km</option>
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={agreedCurrency} onChange={(e) => setAgreedCurrency(e.currentTarget.value as never)}>
              <option value="KES">KES</option>
              <option value="USD">USD</option>
              <option value="UGX">UGX</option>
              <option value="TZS">TZS</option>
              <option value="RWF">RWF</option>
            </Select>
          </Field>
          {rateHint && (
            <p className="sm:col-span-3 text-xs text-fg-tertiary">{rateHint}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent><Textarea name="notes" rows={3} placeholder="Customer release reference, special instructions, etc." /></CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading || !customerId}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Save Booking</>}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={"flex flex-col gap-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
