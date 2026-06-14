"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  Plus,
  Receipt,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  addService,
  addSpare,
  completeAndBillJobCard,
  removeService,
  removeSpare,
  setStatus,
  updateAnalysis,
} from "@/server/actions/job-cards";
import { toast } from "@/components/ui/toast";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { JobCardDetail } from "@/lib/types/workshop";

type Sup = { id: string; name: string };

export function JobCardEditor({
  jobCard,
  suppliers,
}: {
  jobCard: JobCardDetail;
  suppliers: Sup[];
}) {
  const router = useRouter();
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));
  const readOnly = jobCard.status === "completed" || jobCard.status === "cancelled";

  // Bill preview: spares with a supplier roll onto draft bills (one per
  // supplier); spares without a supplier are internal/non-billable.
  const billableSpares = jobCard.spares.filter((s) => !s.posted && s.supplierId);
  const supplierCount = new Set(billableSpares.map((s) => s.supplierId)).size;
  const internalCount = jobCard.spares.filter((s) => !s.posted && !s.supplierId).length;

  // Analysis edit
  const [analysis, setAnalysis] = useState(jobCard.mechanicAnalysis);
  const [analysisDirty, setAnalysisDirty] = useState(false);
  const [savingAnalysis, startAnalysisSave] = useTransition();

  // Add-service form
  const [svcDesc, setSvcDesc] = useState("");
  const [svcHours, setSvcHours] = useState("");
  const [svcCost, setSvcCost] = useState("");
  const [addingSvc, startAddSvc] = useTransition();

  // Add-spare form
  const [spareDesc, setSpareDesc] = useState("");
  const [spareQty, setSpareQty] = useState("");
  const [spareUnit, setSpareUnit] = useState("");
  const [spareSupplier, setSpareSupplier] = useState("");
  const [addingSpare, startAddSpare] = useTransition();

  // Close form
  const [closingOdo, setClosingOdo] = useState(
    jobCard.closingOdometer ? String(jobCard.closingOdometer) : "",
  );
  const [closeNotes, setCloseNotes] = useState(jobCard.notes ?? "");
  const [closing, startClosing] = useTransition();

  const [error, setError] = useState<string | null>(null);

  function reset() {
    setError(null);
  }

  async function onSaveAnalysis() {
    reset();
    startAnalysisSave(async () => {
      await updateAnalysis(jobCard.id, analysis);
      setAnalysisDirty(false);
      router.refresh();
    });
  }

  async function onAddService() {
    reset();
    if (!svcDesc) return;
    startAddSvc(async () => {
      const r = await addService(jobCard.id, {
        description: svcDesc,
        hours: Number(svcHours || 0),
        costKes: Number(svcCost || 0),
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSvcDesc("");
      setSvcHours("");
      setSvcCost("");
      router.refresh();
    });
  }

  async function onAddSpare() {
    reset();
    if (!spareDesc) return;
    startAddSpare(async () => {
      const r = await addSpare(jobCard.id, {
        description: spareDesc,
        quantity: Number(spareQty || 0),
        unitCostKes: Number(spareUnit || 0),
        supplierId: spareSupplier || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSpareDesc("");
      setSpareQty("");
      setSpareUnit("");
      setSpareSupplier("");
      router.refresh();
    });
  }

  async function onComplete() {
    reset();
    startClosing(async () => {
      const r = await completeAndBillJobCard(jobCard.id, {
        closingOdometer: closingOdo ? Number(closingOdo) : undefined,
        notes: closeNotes || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success("Job card completed", {
        description:
          r.billNumbers.length > 0
            ? `Draft supplier bill(s): ${r.billNumbers.join(", ")}`
            : "No billable spares — nothing posted to AP.",
      });
      router.refresh();
    });
  }

  async function onRemoveService(serviceId: string) {
    await removeService(jobCard.id, serviceId);
    router.refresh();
  }

  async function onRemoveSpare(spareId: string) {
    await removeSpare(jobCard.id, spareId);
    router.refresh();
  }

  async function onSetAwaitingParts() {
    await setStatus(jobCard.id, "awaiting_parts");
    router.refresh();
  }

  async function onResumeWork() {
    await setStatus(jobCard.id, "in_progress");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      {/* Mechanic analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mechanic analysis</CardTitle>
              <CardDescription>
                Diagnostic + work plan. Keep it current.
              </CardDescription>
            </div>
            {!readOnly && analysisDirty && (
              <Button onClick={onSaveAnalysis} size="sm" disabled={savingAnalysis}>
                {savingAnalysis ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {readOnly ? (
            <p className="whitespace-pre-wrap text-sm text-fg-secondary">
              {analysis || "—"}
            </p>
          ) : (
            <Textarea
              value={analysis}
              onChange={(e) => {
                setAnalysis(e.currentTarget.value);
                setAnalysisDirty(true);
              }}
              rows={5}
              placeholder="What did you find? What's the plan?"
            />
          )}
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="size-4 text-fg-tertiary" />
            Services performed
          </CardTitle>
          <CardDescription>
            Labour cost is added to the job card total.
          </CardDescription>
        </CardHeader>
        <CardContent className="!p-0">
          {jobCard.services.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-fg-tertiary">
              No services recorded yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[13px] font-semibold uppercase tracking-wider text-fg-secondary">
                  <th className="px-5 py-2 font-medium">Service</th>
                  <th className="px-5 py-2 font-medium">Hours</th>
                  <th className="px-5 py-2 text-right font-medium">Cost (KES)</th>
                  <th className="w-12 px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobCard.services.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3 text-fg-primary">
                      <div>{s.description}</div>
                      <div className="font-mono text-[10px] text-fg-tertiary">
                        <Clock className="mr-0.5 inline size-2.5" />
                        {new Date(s.performedAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono tnum text-fg-secondary">
                      {s.hours}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tnum text-fg-primary">
                      {s.costKes.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!readOnly && (
                        <button
                          onClick={() => onRemoveService(s.id)}
                          className="text-fg-tertiary transition-colors hover:text-status-danger"
                          aria-label="Remove service"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-bg-base/40">
                  <td className="px-5 py-2 text-[13px] font-semibold uppercase tracking-wider text-fg-secondary" colSpan={2}>
                    Subtotal — labour
                  </td>
                  <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                    {jobCard.laborTotalKes.toLocaleString()}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
        {!readOnly && (
          <div className="border-t border-border p-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_100px_140px_auto]">
              <div className="flex flex-col gap-1.5">
                <Label>Service description</Label>
                <Input
                  value={svcDesc}
                  onChange={(e) => setSvcDesc(e.currentTarget.value)}
                  placeholder="Brake pad replacement"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  min={0}
                  value={svcHours}
                  onChange={(e) => setSvcHours(e.currentTarget.value)}
                  className="font-mono tnum"
                  placeholder="2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Cost (KES)</Label>
                <Input
                  type="number"
                  min={0}
                  value={svcCost}
                  onChange={(e) => setSvcCost(e.currentTarget.value)}
                  className="font-mono tnum"
                  placeholder="4000"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={onAddService} disabled={addingSvc || !svcDesc} className="w-full">
                  {addingSvc ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Spares */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-4 text-fg-tertiary" />
            Spares used
          </CardTitle>
          <CardDescription>
            Spares with a supplier become draft supplier bills (AP) when you
            complete the card; spares with no supplier are treated as internal
            (non-billable). In-house labour above isn&apos;t billed.
          </CardDescription>
        </CardHeader>
        <CardContent className="!p-0">
          {jobCard.spares.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-fg-tertiary">
              No spares recorded yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[13px] font-semibold uppercase tracking-wider text-fg-secondary">
                  <th className="px-5 py-2 font-medium">Item</th>
                  <th className="px-5 py-2 font-medium">Supplier</th>
                  <th className="px-5 py-2 font-medium">Qty</th>
                  <th className="px-5 py-2 text-right font-medium">Unit (KES)</th>
                  <th className="px-5 py-2 text-right font-medium">Total (KES)</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="w-12 px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobCard.spares.map((s) => {
                  const sup = s.supplierId ? supplierById.get(s.supplierId) : undefined;
                  return (
                    <tr key={s.id}>
                      <td className="px-5 py-3 text-fg-primary">{s.description}</td>
                      <td className="px-5 py-3 text-xs text-fg-secondary">
                        {sup?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-mono tnum text-fg-secondary">
                        {s.quantity}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tnum text-fg-secondary">
                        {s.unitCostKes.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tnum text-fg-primary">
                        {s.totalCostKes.toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        {s.posted && s.billId ? (
                          <Link
                            href={`/bills/${s.billId}`}
                            className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline"
                          >
                            <Receipt className="size-3" /> Billed
                          </Link>
                        ) : s.supplierId ? (
                          <span className="text-[11px] text-fg-tertiary">To bill</span>
                        ) : (
                          <span className="text-[11px] text-status-warning">Internal</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {!readOnly && !s.posted && (
                          <button
                            onClick={() => onRemoveSpare(s.id)}
                            className="text-fg-tertiary transition-colors hover:text-status-danger"
                            aria-label="Remove spare"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-bg-base/40">
                  <td className="px-5 py-2 text-[13px] font-semibold uppercase tracking-wider text-fg-secondary" colSpan={4}>
                    Subtotal — spares
                  </td>
                  <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                    {jobCard.sparesTotalKes.toLocaleString()}
                  </td>
                  <td />
                  <td />
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
        {!readOnly && (
          <div className="border-t border-border p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_120px_140px_180px_auto]">
              <div className="flex flex-col gap-1.5">
                <Label>Spare description</Label>
                <Input
                  value={spareDesc}
                  onChange={(e) => setSpareDesc(e.currentTarget.value)}
                  placeholder="Brake pads — Actros"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={spareQty}
                  onChange={(e) => setSpareQty(e.currentTarget.value)}
                  className="font-mono tnum"
                  placeholder="4"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Unit cost (KES)</Label>
                <Input
                  type="number"
                  min={0}
                  value={spareUnit}
                  onChange={(e) => setSpareUnit(e.currentTarget.value)}
                  className="font-mono tnum"
                  placeholder="3500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Supplier</Label>
                <Select
                  value={spareSupplier}
                  onChange={(e) => setSpareSupplier(e.currentTarget.value)}
                >
                  <option value="">— None —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={onAddSpare}
                  disabled={addingSpare || !spareDesc || !spareQty || !spareUnit}
                  className="w-full"
                >
                  {addingSpare ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Total */}
      <Card>
        <CardContent className="!p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-wider text-fg-secondary">
                Job Card total
              </div>
              <div className="mt-1 font-mono text-3xl tnum font-medium text-fg-primary">
                KSh {jobCard.totalKes.toLocaleString()}
              </div>
            </div>
            {!readOnly && jobCard.status === "in_progress" && (
              <Button variant="secondary" onClick={onSetAwaitingParts}>
                Mark Awaiting Parts
              </Button>
            )}
            {!readOnly && jobCard.status === "awaiting_parts" && (
              <Button variant="secondary" onClick={onResumeWork}>
                Resume Work
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Complete */}
      {!readOnly && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Job Card</CardTitle>
            <CardDescription>
              {supplierCount > 0
                ? `Completing raises ${supplierCount} draft supplier bill${supplierCount === 1 ? "" : "s"} for the spares (post to AP when you send them).`
                : "No spares with a supplier to bill."}
              {internalCount > 0 && ` ${internalCount} internal spare${internalCount === 1 ? "" : "s"} (no supplier) won't be billed.`}
              {" "}Totals lock; the truck returns to Active if no other open cards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-[200px_1fr_auto]">
              <div className="flex flex-col gap-1.5">
                <Label>Closing odometer (km)</Label>
                <Input
                  type="number"
                  min={0}
                  value={closingOdo}
                  onChange={(e) => setClosingOdo(e.currentTarget.value)}
                  className="font-mono tnum"
                  placeholder={
                    jobCard.openingOdometer
                      ? String(jobCard.openingOdometer)
                      : ""
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Closing notes</Label>
                <Input
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.currentTarget.value)}
                  placeholder="All within manufacturer tolerances. Next service at 311,000km."
                />
              </div>
              <div className="flex items-end">
                <Button onClick={onComplete} disabled={closing} variant="success">
                  {closing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Completing…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      {supplierCount > 0 ? "Complete & Raise Bills" : "Complete"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {readOnly && jobCard.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Closing notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{jobCard.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
