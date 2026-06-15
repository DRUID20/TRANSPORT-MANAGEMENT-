"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createAsset } from "@/server/actions/assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";
import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_KEYS,
  DEPRECIATION_METHOD_LABEL,
  type AssetCategory,
  type DepreciationMethod,
} from "@/lib/types/assets";

export function AssetCreateForm({ suppliers }: { suppliers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [category, setCategory] = useState<AssetCategory>("motor_vehicles");
  const cfg = ASSET_CATEGORIES[category];
  const [method, setMethod] = useState<DepreciationMethod>("straight_line");
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState(today);
  const [usefulLifeMonths, setUsefulLifeMonths] = useState(String(cfg.defaultUsefulLifeMonths ?? 60));
  const [ratePct, setRatePct] = useState("25");
  const [residual, setResidual] = useState("0");
  const [serialNumber, setSerialNumber] = useState("");
  const [location, setLocation] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [description, setDescription] = useState("");

  const depreciable = cfg.depreciable && method !== "none";

  function onCategory(next: AssetCategory) {
    setCategory(next);
    const c = ASSET_CATEGORIES[next];
    if (!c.depreciable) setMethod("none");
    else if (method === "none") setMethod("straight_line");
    if (c.defaultUsefulLifeMonths) setUsefulLifeMonths(String(c.defaultUsefulLifeMonths));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const r = await createAsset({
      name,
      category,
      description: description || undefined,
      serialNumber: serialNumber || undefined,
      location: location || undefined,
      supplierId: supplierId || undefined,
      acquisitionDate,
      cost: Number(cost) || 0,
      depreciationMethod: cfg.depreciable ? method : "none",
      usefulLifeMonths: depreciable && method === "straight_line" ? Number(usefulLifeMonths) || undefined : undefined,
      depreciationRatePct: depreciable && method === "reducing_balance" ? Number(ratePct) || undefined : undefined,
      residualValue: Number(residual) || 0,
      depreciationStartDate: acquisitionDate,
      notes: undefined,
    });
    if (!r.ok) {
      setError(r.error);
      setLoading(false);
      return;
    }
    router.push(`/assets/${r.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 pb-20">
      {error && (
        <div className="surface-card border-status-danger/30 bg-status-danger/5 p-4 text-sm font-medium text-status-danger">
          {error}
        </div>
      )}

      <FormSection eyebrow="Step 1" title="Asset details" description="What it is and where it sits." columns={2}>
        <FormField label="Asset name" required className="sm:col-span-2">
          <Input value={name} onChange={(e) => setName(e.currentTarget.value)} required placeholder="Toyota Hilux pickup KDA 123A" />
        </FormField>
        <FormField label="Category" required helper={`Posts to CoA ${cfg.costCode}${cfg.accumCode ? ` / ${cfg.accumCode} / ${cfg.expenseCode}` : " (not depreciated)"}`}>
          <Select value={category} onChange={(e) => onCategory(e.currentTarget.value as AssetCategory)} required>
            {ASSET_CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>{ASSET_CATEGORIES[k].label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Supplier" hint="OPTIONAL">
          <Select value={supplierId} onChange={(e) => setSupplierId(e.currentTarget.value)}>
            <option value="">— None —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Serial / tag no." hint="OPTIONAL">
          <Input value={serialNumber} onChange={(e) => setSerialNumber(e.currentTarget.value)} />
        </FormField>
        <FormField label="Location" hint="OPTIONAL">
          <Input value={location} onChange={(e) => setLocation(e.currentTarget.value)} placeholder="Head office / Depot" />
        </FormField>
        <FormField label="Description" hint="OPTIONAL" className="sm:col-span-2">
          <Textarea value={description} onChange={(e) => setDescription(e.currentTarget.value)} rows={2} />
        </FormField>
      </FormSection>

      <FormSection eyebrow="Step 2" title="Cost & depreciation" description="Acquisition cost and how it depreciates. Depreciation posts to the GL when you run the monthly charge." columns={2}>
        <FormField label="Acquisition date" required>
          <Input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.currentTarget.value)} required className="font-mono tnum" />
        </FormField>
        <FormField label="Cost (KES)" required>
          <Input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.currentTarget.value)} required className="font-mono tnum" />
        </FormField>
        <FormField label="Depreciation method" required>
          <Select value={method} onChange={(e) => setMethod(e.currentTarget.value as DepreciationMethod)} disabled={!cfg.depreciable} required>
            {(cfg.depreciable ? (["straight_line", "reducing_balance"] as const) : (["none"] as const)).map((m) => (
              <option key={m} value={m}>{DEPRECIATION_METHOD_LABEL[m]}</option>
            ))}
          </Select>
        </FormField>
        {depreciable && method === "straight_line" && (
          <FormField label="Useful life (months)" required>
            <Input type="number" min={1} value={usefulLifeMonths} onChange={(e) => setUsefulLifeMonths(e.currentTarget.value)} className="font-mono tnum" />
          </FormField>
        )}
        {depreciable && method === "reducing_balance" && (
          <FormField label="Annual rate (%)" required>
            <Input type="number" min={0} max={100} step="0.1" value={ratePct} onChange={(e) => setRatePct(e.currentTarget.value)} className="font-mono tnum" />
          </FormField>
        )}
        <FormField label="Residual value (KES)" hint="OPTIONAL">
          <Input type="number" min={0} step="0.01" value={residual} onChange={(e) => setResidual(e.currentTarget.value)} className="font-mono tnum" />
        </FormField>
      </FormSection>

      <FormFooter meta={<span>The asset is registered immediately; depreciation accrues when you run the monthly charge.</span>}>
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !name || !cost}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Register asset
        </Button>
      </FormFooter>
    </form>
  );
}
