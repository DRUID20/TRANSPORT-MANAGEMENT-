"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, Loader2, RotateCcw, Save } from "lucide-react";
import { createExpense } from "@/server/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";
import { expenseCategoryLabel, paymentMethodLabel } from "@/lib/types/expenses";

type T = { id: string; number: string; label: string; truckId: string; driverId: string };
type Truck = { id: string; registration: string };
type Driver = { id: string; fullName: string };
type Supplier = { id: string; name: string };

export function ExpenseCreateForm({
  trips,
  trucks,
  drivers,
  suppliers,
  ratesToKes,
  preselectTripId,
  preselectTruckId,
}: {
  trips: T[];
  trucks: Truck[];
  drivers: Driver[];
  suppliers: Supplier[];
  ratesToKes: Record<string, number>;
  preselectTripId?: string;
  preselectTruckId?: string;
}) {
  const router = useRouter();
  const truckById = new Map(trucks.map((t) => [t.id, t.registration]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripId, setTripId] = useState(preselectTripId ?? "");
  const [truckId, setTruckId] = useState(preselectTruckId ?? "");
  const [driverId, setDriverId] = useState("");
  const [currency, setCurrency] = useState<"KES" | "USD" | "UGX">("KES");
  const [amount, setAmount] = useState("");
  const [formKey, setFormKey] = useState(0);

  // FX is applied behind the scenes: KES is always 1; USD/UGX use the latest
  // live rate. amountKes is what gets stored + posted.
  const rate = currency === "KES" ? 1 : ratesToKes[currency] ?? 1;
  const amountKes = (Number(amount) || 0) * rate;

  function onTripChange(value: string) {
    setTripId(value);
    const t = trips.find((x) => x.id === value);
    // Truck (and driver) are derived from the trip — a truck expense can only
    // exist via a trip. Clearing the trip clears the truck.
    setTruckId(t?.truckId ?? "");
    setDriverId(t?.driverId ?? "");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createExpense({
      amountKes: Math.round(amountKes * 100) / 100,
      originalAmount: currency === "KES" ? undefined : Number(amount) || 0,
      originalCurrency: currency === "KES" ? undefined : currency,
      category: String(fd.get("category") ?? "other") as never,
      description: String(fd.get("description") ?? ""),
      location: String(fd.get("location") ?? "") || undefined,
      countryCode: String(fd.get("countryCode") ?? "KE").toUpperCase(),
      incurredAt: String(
        fd.get("incurredAt") ?? new Date().toISOString().slice(0, 10),
      ),
      paidBy: String(fd.get("paidBy") ?? "cash") as never,
      tripId: tripId || undefined,
      truckId: truckId || undefined,
      driverId: driverId || undefined,
      supplierId: String(fd.get("supplierId") ?? "") || undefined,
      submittedBy: String(fd.get("submittedBy") ?? "Dispatcher"),
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/expenses/${result.id}`);
  }

  function reset() {
    setTripId(preselectTripId ?? "");
    setTruckId(preselectTruckId ?? "");
    setDriverId("");
    setCurrency("KES");
    setAmount("");
    setError(null);
    setFormKey((k) => k + 1);
  }

  return (
    <form key={formKey} onSubmit={onSubmit} className="flex flex-col gap-5 pb-20">
      {error && (
        <div className="surface-card animate-content-in border-status-danger/30 bg-status-danger/5 p-4 text-sm text-status-danger">
          {error}
        </div>
      )}

      <FormSection
        eyebrow="Step 1"
        title="What & how much"
        description="Describe the spend and pick the category. Numbers are KES; foreign amounts get converted via the daily rate."
        columns={2}
      >
        <FormField label="Description" required className="sm:col-span-2">
          <Input
            name="description"
            required
            placeholder="Diesel — Mariakani Total"
          />
        </FormField>
        <FormField label="Currency" required>
          <Select
            value={currency}
            onChange={(e) => setCurrency(e.currentTarget.value as "KES" | "USD" | "UGX")}
          >
            <option value="KES">KES — Kenyan Shilling</option>
            <option value="UGX">UGX — Ugandan Shilling</option>
            <option value="USD">USD — US Dollar</option>
          </Select>
        </FormField>
        <FormField
          label="Amount"
          required
          hint={currency}
          helper={
            currency !== "KES" && Number(amount) > 0
              ? `≈ KSh ${amountKes.toLocaleString(undefined, { maximumFractionDigits: 0 })} (live rate ${rate})`
              : "Converted to KES automatically."
          }
        >
          <Input
            value={amount}
            onChange={(e) => setAmount(e.currentTarget.value)}
            type="number"
            required
            min={0}
            step="0.01"
            className="font-mono tnum"
            leadingIcon={<Banknote />}
            placeholder="0.00"
          />
        </FormField>
        <FormField label="Category" required>
          <Select name="category" defaultValue="fuel">
            {Object.entries(expenseCategoryLabel).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Paid by" required>
          <Select name="paidBy" defaultValue="cash">
            {Object.entries(paymentMethodLabel).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Date incurred" required>
          <Input
            name="incurredAt"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="font-mono tnum"
          />
        </FormField>
        <FormField label="Location" hint="OPTIONAL">
          <Input name="location" placeholder="Mariakani" />
        </FormField>
        <FormField label="Country" required className="sm:col-span-2">
          <Select name="countryCode" defaultValue="KE">
            <option value="KE">🇰🇪 Kenya</option>
            <option value="UG">🇺🇬 Uganda</option>
            <option value="TZ">🇹🇿 Tanzania</option>
            <option value="RW">🇷🇼 Rwanda</option>
            <option value="SS">🇸🇸 South Sudan</option>
            <option value="CD">🇨🇩 DR Congo</option>
            <option value="BI">🇧🇮 Burundi</option>
            <option value="ET">🇪🇹 Ethiopia</option>
          </Select>
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Step 2"
        title="Allocation"
        description="Tie the expense to a trip and/or truck so it shows on the P&L per truck and reduces gross profit on that trip."
        columns={2}
      >
        <FormField
          label="Trip"
          hint="OPTIONAL"
          helper="Auto-fills truck + driver from the trip record."
          className="sm:col-span-2"
        >
          <Select value={tripId} onChange={(e) => onTripChange(e.currentTarget.value)}>
            <option value="">— None —</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Truck" helper="Set from the trip — a truck expense must go through a trip.">
          <Input
            readOnly
            value={truckId ? truckById.get(truckId) ?? "—" : ""}
            placeholder="Select a trip first"
            className="bg-bg-base/40"
          />
        </FormField>
        <FormField label="Driver" hint="OPTIONAL">
          <Select
            value={driverId}
            onChange={(e) => setDriverId(e.currentTarget.value)}
          >
            <option value="">— None —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Supplier" hint="OPTIONAL" className="sm:col-span-2">
          <Select name="supplierId" defaultValue="">
            <option value="">— None —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Submitted by" className="sm:col-span-2">
          <Input name="submittedBy" defaultValue="Dispatcher" />
        </FormField>
      </FormSection>

      <FormFooter
        meta={
          <span>
            Expenses start in pending status and need manager approval. The
            cashier issues cash on request — there's no separate reimbursement.
          </span>
        }
      >
        <Button type="button" variant="ghost" onClick={reset} disabled={loading}>
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Submit expense
            </>
          )}
        </Button>
      </FormFooter>
    </form>
  );
}
