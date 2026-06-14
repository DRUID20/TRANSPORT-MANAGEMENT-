"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Droplet, Loader2, RotateCcw, Save } from "lucide-react";
import { createBooking } from "@/server/actions/bookings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FUEL_PRODUCT_LABELS, type FuelProduct } from "@/lib/types/trips";

type Cus = { id: string; name: string; billingCurrency: "KES" | "USD" | "UGX" };

type Errors = Partial<
  Record<"customerId" | "origin" | "cargoQuantity" | "requestedDate", string>
>;

const INIT = {
  customerId: "",
  product: "AGO" as FuelProduct,
  origin: "",
  destination: "",
  cargoQuantity: "",
  requestedDate: "",
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
  const [notes, setNotes] = useState(INIT.notes);

  // Hydrate the default loading point from /settings on first render.
  useEffect(() => {
    try {
      const lp = window.localStorage.getItem("tx.prefs.defaultLoadingPoint");
      if (lp) setOrigin(lp);
    } catch {
      // Private mode — silent fallback.
    }
  }, []);

  function onReset() {
    setCustomerId(preselectCustomerId ?? INIT.customerId);
    setProduct(INIT.product);
    setOrigin(INIT.origin);
    setDestination(INIT.destination);
    setCargoQuantity(INIT.cargoQuantity);
    setRequestedDate(INIT.requestedDate);
    setNotes(INIT.notes);
    setErrors({});
    setError(null);
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!customerId) next.customerId = "Required.";
    if (!origin.trim()) next.origin = "Required.";
    if (!cargoQuantity || Number(cargoQuantity) <= 0) next.cargoQuantity = "Enter litres.";
    if (!requestedDate) next.requestedDate = "Required.";
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
      destination: destination.trim() || undefined,
      product,
      cargoQuantity: Number(cargoQuantity),
      cargoUnit: "litres",
      requestedDate,
      // Rate is set on the trip after the destination is bound — not here.
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
        <FormField
          label="Destination"
          hint="OPTIONAL"
          helper="Bound on the trip — at the depot or transit border (Malaba / Busia). The rate is looked up then."
        >
          <Input
            value={destination}
            onChange={(e) => setDestination(e.currentTarget.value)}
            placeholder="To be confirmed at loading / border"
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
