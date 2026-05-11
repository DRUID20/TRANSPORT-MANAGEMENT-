"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { createBooking } from "@/server/actions/bookings";
import { lookupRate } from "@/server/actions/rates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RateBasis } from "@/lib/types/trips";

type Cus = { id: string; name: string; billingCurrency: "KES" | "USD" };

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
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [agreedAmount, setAgreedAmount] = useState("");
  const [agreedBasis, setAgreedBasis] = useState<RateBasis>("per_tonne");
  const [agreedCurrency, setAgreedCurrency] = useState<"KES" | "USD" | "UGX" | "TZS" | "RWF">("USD");
  const [rateHint, setRateHint] = useState<string | null>(null);
  const [lookingUp, startLookup] = useTransition();

  function onLookupRate() {
    setRateHint(null);
    startLookup(async () => {
      const rate = await lookupRate({
        origin,
        destination,
        customerId: customerId || undefined,
      });
      if (!rate) {
        setRateHint(`No rate found for ${origin} → ${destination}. Add one in /rates.`);
        return;
      }
      setAgreedAmount(String(rate.amount));
      setAgreedBasis(rate.basis);
      setAgreedCurrency(rate.currency);
      setRateHint(
        rate.customerId
          ? `Customer-specific rate applied.`
          : `Default rate applied.`,
      );
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createBooking({
      customerId,
      origin,
      destination,
      cargoType: String(fd.get("cargoType") ?? ""),
      cargoQuantity: Number(fd.get("cargoQuantity") ?? 0),
      cargoUnit: String(fd.get("cargoUnit") ?? "tonnes") as never,
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
          <Field label="Origin">
            <Input value={origin} onChange={(e) => setOrigin(e.currentTarget.value)} required placeholder="Mombasa" />
          </Field>
          <Field label="Destination">
            <Input value={destination} onChange={(e) => setDestination(e.currentTarget.value)} required placeholder="Kampala" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cargo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Cargo type" className="sm:col-span-3">
            <Input name="cargoType" required placeholder="Coffee beans (bagged)" />
          </Field>
          <Field label="Quantity">
            <Input name="cargoQuantity" type="number" required min={0} step="0.01" className="font-mono tnum" />
          </Field>
          <Field label="Unit">
            <Select name="cargoUnit" defaultValue="tonnes">
              <option value="tonnes">Tonnes</option>
              <option value="TEUs">TEUs (containers)</option>
              <option value="units">Units</option>
              <option value="litres">Litres</option>
            </Select>
          </Field>
          <Field label="Requested date">
            <Input name="requestedDate" type="date" required />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rate</CardTitle>
              <CardDescription>Pulled from the rate table; you can override.</CardDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onLookupRate}
              disabled={lookingUp || !origin || !destination}
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
            <Select value={agreedBasis} onChange={(e) => setAgreedBasis(e.currentTarget.value as never)}>
              <option value="per_tonne">Per tonne</option>
              <option value="per_container">Per container</option>
              <option value="per_trip">Per trip</option>
              <option value="per_km">Per km</option>
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={agreedCurrency} onChange={(e) => setAgreedCurrency(e.currentTarget.value as never)}>
              <option value="USD">USD</option>
              <option value="KES">KES</option>
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
        <CardContent><Textarea name="notes" rows={3} /></CardContent>
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
