"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Banknote,
  Droplet,
  Fuel,
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
  FUEL_DEPOTS,
  FUEL_PRODUCT_LABELS,
  type FuelProduct,
  type RateBasis,
} from "@/lib/types/trips";

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

type Errors = Partial<
  Record<
    "customerId" | "destination" | "cargoQuantity" | "agreedAmount" | "requestedDate",
    string
  >
>;

const INITIAL = {
  customerId: "",
  product: "AGO" as FuelProduct,
  origin: FUEL_DEPOTS[0],
  destination: DEFAULT_DESTINATIONS[0]!,
  destinationOther: "",
  cargoQuantity: "",
  requestedDate: "",
  agreedAmount: "",
  agreedBasis: "per_litre" as RateBasis,
  agreedCurrency: "KES" as "KES" | "USD" | "UGX" | "TZS" | "RWF",
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

  const [customerId, setCustomerId] = useState(preselectCustomerId ?? INITIAL.customerId);
  const [product, setProduct] = useState<FuelProduct>(INITIAL.product);
  const [origin, setOrigin] = useState<string>(INITIAL.origin);
  const [destination, setDestination] = useState<string>(INITIAL.destination);
  const [destinationOther, setDestinationOther] = useState(INITIAL.destinationOther);
  const [cargoQuantity, setCargoQuantity] = useState(INITIAL.cargoQuantity);
  const [requestedDate, setRequestedDate] = useState(INITIAL.requestedDate);
  const [agreedAmount, setAgreedAmount] = useState(INITIAL.agreedAmount);
  const [agreedBasis, setAgreedBasis] = useState<RateBasis>(INITIAL.agreedBasis);
  const [agreedCurrency, setAgreedCurrency] = useState<typeof INITIAL.agreedCurrency>(
    INITIAL.agreedCurrency,
  );
  const [notes, setNotes] = useState(INITIAL.notes);
  const [rateHint, setRateHint] = useState<string | null>(null);
  const [lookingUp, startLookup] = useTransition();

  // Workspace defaults from /settings (localStorage). Applied once on
  // mount so the dispatcher's usual depot + currency come pre-selected.
  useEffect(() => {
    try {
      const depot = window.localStorage.getItem("tx.prefs.defaultDepot");
      if (depot && (FUEL_DEPOTS as readonly string[]).includes(depot)) {
        setOrigin(depot);
      }
      const cur = window.localStorage.getItem("tx.prefs.defaultCurrency");
      if (cur && ["KES", "USD", "UGX", "TZS", "RWF"].includes(cur)) {
        setAgreedCurrency(cur as typeof INITIAL.agreedCurrency);
      }
    } catch {
      // localStorage unavailable — keep built-in defaults.
    }
  }, []);

  const finalDestination =
    destination === "Other (specify)" ? destinationOther.trim() : destination;

  function onReset() {
    setCustomerId(preselectCustomerId ?? INITIAL.customerId);
    setProduct(INITIAL.product);
    setOrigin(INITIAL.origin);
    setDestination(INITIAL.destination);
    setDestinationOther(INITIAL.destinationOther);
    setCargoQuantity(INITIAL.cargoQuantity);
    setRequestedDate(INITIAL.requestedDate);
    setAgreedAmount(INITIAL.agreedAmount);
    setAgreedBasis(INITIAL.agreedBasis);
    setAgreedCurrency(INITIAL.agreedCurrency);
    setNotes(INITIAL.notes);
    setErrors({});
    setError(null);
    setRateHint(null);
  }

  function onLookupRate() {
    setRateHint(null);
    startLookup(async () => {
      const rate = await lookupRate({
        origin,
        destination: finalDestination,
        customerId: customerId || undefined,
      });
      if (!rate) {
        setRateHint(
          `No rate found for ${origin} → ${finalDestination || "destination"}. Add one in /rates.`,
        );
        return;
      }
      setAgreedAmount(String(rate.amount));
      setAgreedBasis(rate.basis);
      setAgreedCurrency(rate.currency);
      setRateHint(
        rate.customerId
          ? "Customer-specific rate applied."
          : "Default route rate applied.",
      );
    });
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!customerId) next.customerId = "Pick a customer to invoice.";
    if (destination === "Other (specify)" && !destinationOther.trim()) {
      next.destination = "Specify the destination name.";
    }
    if (!cargoQuantity || Number(cargoQuantity) <= 0) {
      next.cargoQuantity = "Enter volume in litres.";
    }
    if (!requestedDate) next.requestedDate = "Pick a requested date.";
    if (!agreedAmount || Number(agreedAmount) <= 0) {
      next.agreedAmount = "Enter the agreed amount.";
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
      origin,
      destination: finalDestination,
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
    <form onSubmit={onSubmit} className="flex flex-col gap-5 pb-20">
      {error && (
        <div className="surface-card animate-content-in border-status-danger/30 bg-status-danger/5 p-4 text-sm text-status-danger">
          {error}
        </div>
      )}

      <FormSection
        eyebrow="Step 1"
        title="Customer & route"
        description="Pick the customer to invoice, the depot for loading, and the off-take point for delivery."
        columns={2}
      >
        <FormField
          label="Customer"
          required
          className="sm:col-span-2"
          error={errors.customerId}
          helper={!errors.customerId ? "Drives invoicing currency and rate lookup." : undefined}
        >
          <Select
            value={customerId}
            onChange={(e) => setCustomerId(e.currentTarget.value)}
            required
            error={Boolean(errors.customerId)}
          >
            <option value="" disabled>
              Select a customer…
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.billingCurrency})
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Origin (depot)" required>
          <Select
            value={origin}
            onChange={(e) => setOrigin(e.currentTarget.value)}
            required
          >
            {FUEL_DEPOTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          label="Destination"
          required
          error={errors.destination}
          helper={
            !errors.destination
              ? "Pick a preset or choose 'Other (specify)' to type a new one."
              : undefined
          }
        >
          <Select
            value={destination}
            onChange={(e) => setDestination(e.currentTarget.value)}
            required
          >
            {DEFAULT_DESTINATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </FormField>
        {destination === "Other (specify)" && (
          <FormField
            label="Destination name"
            required
            className="sm:col-span-2"
            error={errors.destination}
          >
            <Input
              value={destinationOther}
              onChange={(e) => setDestinationOther(e.currentTarget.value)}
              placeholder="e.g. Lokichogio, Mtwapa, Mwanza…"
              error={Boolean(errors.destination)}
              required
            />
          </FormField>
        )}
      </FormSection>

      <FormSection
        eyebrow="Step 2"
        title="Product & volume"
        description="Loading observations (temperature, density, dipstick) are captured later from the depot loading sheet."
        columns={3}
      >
        <FormField label="Product" required className="sm:col-span-1">
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
        <FormField
          label="Quantity"
          required
          hint="LITRES"
          error={errors.cargoQuantity}
        >
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
        eyebrow="Step 3"
        title="Rate"
        description="Pulled from the rate table — you can override. Per-litre or per-litre-per-km is the typical fuel-haul basis."
        action={
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
              <Sparkles className="size-3.5" />
            )}
            Lookup rate
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
            placeholder={agreedBasis === "per_litre_per_km" ? "0.0125" : "8.4250"}
            className="font-mono tnum"
            error={Boolean(errors.agreedAmount)}
            leadingIcon={<Banknote />}
          />
        </FormField>
        <FormField label="Basis" required>
          <Select
            value={agreedBasis}
            onChange={(e) => setAgreedBasis(e.currentTarget.value as RateBasis)}
          >
            <option value="per_litre">Per litre</option>
            <option value="per_litre_per_km">Per litre per km</option>
            <option value="per_trip">Per trip (flat)</option>
            <option value="per_km">Per km</option>
          </Select>
        </FormField>
        <FormField label="Currency" required>
          <Select
            value={agreedCurrency}
            onChange={(e) => setAgreedCurrency(e.currentTarget.value as never)}
          >
            <option value="KES">KES</option>
            <option value="USD">USD</option>
            <option value="UGX">UGX</option>
            <option value="TZS">TZS</option>
            <option value="RWF">RWF</option>
          </Select>
        </FormField>
        {rateHint && (
          <p className="sm:col-span-3 -mt-1 text-xs text-fg-tertiary">{rateHint}</p>
        )}
      </FormSection>

      <FormSection
        eyebrow="Optional"
        title="Notes"
        description="Customer release reference, special instructions, demurrage clauses, anything the dispatcher needs."
        columns={1}
      >
        <FormField label="Notes" hint="OPTIONAL">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            rows={3}
            placeholder="e.g. KPC release ref RL-2026-0481. Customer prefers AM delivery."
          />
        </FormField>
      </FormSection>

      <FormFooter
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Fuel className="size-3.5 text-fg-tertiary" />
            All times in EAT. Booking creates a draft trip you can plan into dispatch.
          </span>
        }
      >
        <Button type="button" variant="ghost" onClick={onReset} disabled={loading}>
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !customerId}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save booking
            </>
          )}
        </Button>
      </FormFooter>
    </form>
  );
}
