"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wallet } from "lucide-react";
import { recordSubcontractorPayment } from "@/server/actions/subcontractors";
import type { SubcontractorPaymentMethod } from "@/lib/types/fleet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

const METHODS: { value: SubcontractorPaymentMethod; label: string }[] = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "supplier_direct", label: "Paid by supplier (on our behalf)" },
];

/**
 * Record a payment out of a subcontractor's account — a cash/M-Pesa/bank
 * withdrawal, or "paid by supplier" which also raises a draft AP bill to that
 * supplier (we now owe them).
 */
export function RecordSubcontractorPayment({
  subcontractorId,
  suppliers,
}: {
  subcontractorId: string;
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<SubcontractorPaymentMethod>("mpesa");
  const [supplierId, setSupplierId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setDate(new Date().toISOString().slice(0, 10));
    setAmount("");
    setMethod("mpesa");
    setSupplierId("");
    setReference("");
    setNotes("");
    setError(null);
  }

  function onSubmit() {
    setError(null);
    start(async () => {
      const r = await recordSubcontractorPayment({
        subcontractorId,
        date,
        amountKes: Number(amount) || 0,
        method,
        supplierId: method === "supplier_direct" ? supplierId || undefined : undefined,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success("Payment recorded", {
        description:
          method === "supplier_direct"
            ? "A draft supplier bill was raised for what we now owe the supplier."
            : undefined,
      });
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> Record payment
      </Button>

      <Modal
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
        title="Record subcontractor payment"
        description="A withdrawal from their account, or a payment the supplier made on our behalf."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={pending}>
              <Wallet className="size-3.5" />
              {pending ? "Saving…" : "Record payment"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.currentTarget.value)} className="font-mono tnum" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Amount (KES)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.currentTarget.value)}
              className="font-mono tnum"
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Method</Label>
            <Select value={method} onChange={(e) => setMethod(e.currentTarget.value as SubcontractorPaymentMethod)}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </div>
          {method === "supplier_direct" && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Supplier who paid them</Label>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.currentTarget.value)}>
                <option value="">— Select supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <span className="text-[11px] text-fg-tertiary">
                Raises a draft bill to this supplier (Subcontracted Haulage) — we now owe them.
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Reference (optional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.currentTarget.value)} placeholder="M-Pesa code / cheque no." />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)} rows={2} />
          </div>
          {error && (
            <div className="sm:col-span-2 rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
              {error}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
