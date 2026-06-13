"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Banknote,
  Droplet,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { createBooking } from "@/server/actions/bookings";
import { lookupRate } from "@/server/actions/rates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  FUEL_PRODUCT_LABELS,
  type Currency,
  type FuelProduct,
  type RateBasis,
} from "@/lib/types/trips";

type Cus = { id: string; name: string; billingCurrency: "KES" | "USD" | "UGX" };

type Errors = Partial<
  Record<
    "customerId" | "origin" | "destination" | "cargoQuantity" | "agreedAmount" | "requestedDate",
    string
  >
>;

const INIT = {
  customerId: "",
  product: "AGO" as FuelProduct,
  origin: "",
  destination: "",
  cargoQuantity: "",
  requestedDate: "",
  agreedAmount: "",
  // Default: per cubic metre in USD — the typical cross-border fuel-haul
  // pricing convention. Operators can override.
  agreedBasis: "per_m3" as RateBasis,
  agreedCurrency: "USD" as Currency,
  notes: "",
};

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
  const [errors, setErrors] = useState<Errors>({});

  const [customerId, setCustomerId] = useState(preselectCustomerId ?? INIT.customerId);
  const [product, setProduct] = useState<FuelProduct>(INIT.product);
  const [origin, setOrigin] = useState<string>(INIT.origin);
  const [destination, setDestination] = useState<string>(INIT.destination);
  const [cargoQuantity, setCargoQuantity] = useState(INIT.cargoQuantity);
  const [requestedDate, setRequestedDate] = useState(INIT.requestedDate);
  const [agreedAmount, setAgreedAmount] = useState(INIT.agreedAmount);
  const [agreedBasis, setAgreedBasis] = useState<RateBasis>(INIT.agreedBasis);
  const [agreedCurrency, setAgreedCurrency] = useState<Currency>(INIT.agreedCurrency);
  const [notes, setNotes] = useState(INIT.notes);
  const [rateHint, setRateHint] = useState<string | null>(null);
  const [lookingUp, startLookup] = useTransition();

  // Hydrate workspace defaults from /settings on first render.
  useEffect(() => {
    try {
      const lp = window.localStorage.getItem("tx.prefs.defaultLoadingPoint");
      if (lp) setOrigin(lp);
      const cur = window.localStorage.getItem("tx.prefs.defaultCurrency");
      if (cur === "KES" || cur === "USD" || cur === "UGX") setAgreedCurrency(cur);
    } catch {
      // Private mode — silent fallback.
    }
  }, []);

  // When the user picks a customer, default the billing currency to whatever
  // their account is billed in. Lookup still overrides this if a rate exists.
  useEffect(() => {
    if (!customerId) return;
    const c = customers.find((c) => c.id === customerId);
    if (c) setAgreedCurrency(c.billingCurrency);
  }, [customerId, customers]);

  function onReset() {
    setCustomerId(preselectCustomerId ?? INIT.customerId);
    setProduct(INIT.product);
    setOrigin(INIT.origin);
    setDestination(INIT.destination);
    setCargoQuantity(INIT.cargoQuantity);
    setRequestedDate(INIT.requestedDate);
    setAgreedAmount(INIT.agreedAmount);
    setAgreedBasis(INIT.agreedBasis);
    setAgreedCurrency(INIT.agreedCurrency);
    setNotes(INIT.notes);
    setErrors({});
    setError(null);
    setRateHint(null);
  }

  function onLookupRate() {
    setRateHint(null);
    startLookup(async () => {
      const rate = await lookupRate({
        origin,
        destination,
        customerId: customerId || undefined,
      });
      if (!rate) {
        setRateHint(
          `No saved rate for ${origin || "this origin"} to ${destination || "this destination"}. Enter the agreed rate manually.`,
        );
        return;
      }
      setAgreedAmount(String(rate.amount));
      setAgreedBasis(rate.basis);
      setAgreedCurrency(rate.currency);
      setRateHint(rate.customerId ? "Customer rate applied." : "Default rate applied.");
    });
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!customerId) next.customerId = "Required.";
    if (!origin.trim()) next.origin = "Required.";
    if (!destination.trim()) next.destination = "Required.";
    if (!cargoQuantity || Number(cargoQuantity) <= 0) {
      next.cargoQuantity = "Enter litres.";
    }
    if (!requestedDate) next.requestedDate = "Required.";
    if (!agreedAmount || Number(agreedAmount) <= 0) {
      next.agreedAmount = "Required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    const result = await createBooking({
      customerId,
      origin: origin.trim(),
      destination: destination.trim(),
      product,
      cargoQuantity: Number(cargoQuantity),
      cargoUnit: "litres",
      requestedDate,
      agreedAmount: Number(agreedAmount),
      agreedBasis,
      agreedCurrency,
      notes: notes || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/bookings/${result.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="stagger-children flex flex-col gap-4 pb-24">
      {error && (
        <div className="surface-card animate-content-in border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <FormSection title="Customer and route" columns={2}>
        <FormField label="Customer" required className="sm:col-span-2" error={errors.customerId}>
          <Select
            value={customerId}
            onChange={(e) => setCustomerId(e.currentTarget.value)}
            required
            error={Boolean(errors.customerId)}
          >
            <option value="" disabled>Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.billingCurrency})</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Loading point" required error={errors.origin}>
          <Input
            value={origin}
            onChange={(e) => setOrigin(e.currentTarget.value)}
            placeholder="e.g. KPC Mombasa"
            required
            error={Boolean(errors.origin)}
          />
        </FormField>
        <FormField label="Destination" required error={errors.destination}>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.currentTarget.value)}
            placeholder="e.g. Kampala"
            required
            error={Boolean(errors.destination)}
          />
        </FormField>
      </FormSection>

      <FormSection title="Product and volume" columns={3}>
        <FormField label="Product" required>
          <SegmentedControl
            value={product}
            onChange={setProduct}
            options={(Object.keys(FUEL_PRODUCT_LABELS) as FuelProduct[]).map((p) => ({
              value: p,
              label: p,
              icon: <Droplet className="size-3.5" />,
            }))}
            fullWidth
          />
        </FormField>
        <FormField label="Quantity" required hint="LITRES" error={errors.cargoQuantity}>
          <Input
            value={cargoQuantity}
            onChange={(e) => setCargoQuantity(e.currentTarget.value)}
            type="number"
            min={1}
            step="1"
            placeholder="40,000"
            className="font-mono tnum"
            error={Boolean(errors.cargoQuantity)}
          />
        </FormField>
        <FormField label="Requested date" required error={errors.requestedDate}>
          <Input
            value={requestedDate}
            onChange={(e) => setRequestedDate(e.currentTarget.value)}
            type="date"
            className="font-mono tnum"
            error={Boolean(errors.requestedDate)}
          />
        </FormField>
      </FormSection>

      <FormSection
        title="Rate"
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onLookupRate}
            disabled={lookingUp || !origin.trim() || !destination.trim()}
          >
            {lookingUp ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            Lookup
          </Button>
        }
        columns={3}
      >
        <FormField label="Amount" required error={errors.agreedAmount}>
          <Input
            value={agreedAmount}
            onChange={(e) => setAgreedAmount(e.currentTarget.value)}
            type="number"
            min={0}
            step="0.0001"
            placeholder={agreedBasis === "per_m3" ? "85" : agreedBasis === "per_litre" ? "8.50" : "350000"}
            className="font-mono tnum"
            error={Boolean(errors.agreedAmount)}
            leadingIcon={<Banknote />}
          />
        </FormField>
        <FormField label="Basis" required>
          <Select
            value={agreedBasis}
            onChange={(e) => {
              const next = e.currentTarget.value as RateBasis;
              setAgreedBasis(next);
              if (next === "per_m3") setAgreedCurrency("USD");
            }}
          >
            <option value="per_m3">Per m³ (USD)</option>
            <option value="per_litre">Per litre</option>
            <option value="per_trip">Per trip</option>
          </Select>
        </FormField>
        <FormField label="Currency" required>
          <Select value={agreedCurrency} onChange={(e) => setAgreedCurrency(e.currentTarget.value as Currency)}>
            <option value="USD">USD</option>
            <option value="KES">KES</option>
            <option value="UGX">UGX</option>
          </Select>
        </FormField>
        {rateHint && (
          <p className="sm:col-span-3 -mt-1 text-[11px] text-fg-tertiary">{rateHint}</p>
        )}
      </FormSection>

      <FormSection title="Notes" columns={1}>
        <FormField label="Notes" hint="OPTIONAL">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            rows={2}
            placeholder="Release reference, special instructions"
          />
        </FormField>
      </FormSection>

      <FormFooter>
        <Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={loading}>
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !customerId}>
          {loading ? <><Loader2 className="size-3.5 animate-spin" />Saving</> : <><Save className="size-3.5" />Save</>}
        </Button>
      </FormFooter>
    </form>
  );
}
