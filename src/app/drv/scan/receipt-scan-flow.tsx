"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Sparkles, Upload } from "lucide-react";
import {
  extractReceiptFields,
  type ReceiptExtraction,
} from "@/server/ai/receipt-extract";
import { createExpense } from "@/server/actions/expenses";
import {
  expenseCategoryLabel,
  type ExpenseCategory,
  type PaymentMethod,
} from "@/lib/types/expenses";
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
import {
  CameraCapture,
  PreviewWithRetake,
  type CapturedImage,
} from "@/components/driver/camera-capture";

type Step = "category" | "capture" | "extract" | "review" | "done";

const COMMON_CATEGORIES: ExpenseCategory[] = [
  "fuel",
  "tolls",
  "border_charges",
  "weighbridge",
  "driver_per_diem",
  "driver_overnight",
  "driver_welfare",
  "vehicle_repair",
  "spares",
  "lubricants",
  "fines_penalties",
  "other",
];

export function ReceiptScanFlow({
  tripId,
  tripNumber,
  truckId,
  driverId,
}: {
  tripId: string;
  tripNumber: string;
  truckId: string;
  driverId: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<ExpenseCategory>("fuel");
  const [image, setImage] = useState<CapturedImage | null>(null);
  const [extraction, setExtraction] = useState<ReceiptExtraction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Editable form state once extracted
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [incurredAt, setIncurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [countryCode, setCountryCode] = useState("KE");
  const [paidBy, setPaidBy] = useState<PaymentMethod>("advance");
  const [description, setDescription] = useState("");

  function startExtract(captured: CapturedImage) {
    setImage(captured);
    setError(null);
    setStep("extract");
    start(async () => {
      try {
        const r = await extractReceiptFields({
          hintedCategory: category,
          imageDataUrl: captured.dataUrl,
        });
        setExtraction(r);
        setVendor(r.vendor);
        setAmount(String(r.amountKes));
        setIncurredAt(r.incurredAt);
        if (r.location) setLocation(r.location);
        if (r.countryCode) setCountryCode(r.countryCode);
        setCategory(r.categoryGuess);
        setDescription(r.vendor);
        setStep("review");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Extraction failed");
        setStep("capture");
      }
    });
  }

  function submit() {
    setError(null);
    start(async () => {
      const result = await createExpense({
        amountKes: Number(amount),
        category,
        description: description || vendor,
        location: location || undefined,
        countryCode,
        incurredAt,
        paidBy,
        tripId,
        truckId,
        driverId,
        submittedBy: "Driver (scan)",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep("done");
      router.refresh();
    });
  }

  function reset() {
    setCategory("fuel");
    setImage(null);
    setExtraction(null);
    setError(null);
    setVendor("");
    setAmount("");
    setIncurredAt(new Date().toISOString().slice(0, 10));
    setLocation("");
    setCountryCode("KE");
    setPaidBy("advance");
    setDescription("");
    setStep("category");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand-blue" />
            Scan a receipt
          </CardTitle>
          <CardDescription>
            Trip <span className="font-mono">{tripNumber}</span> · Submits for
            manager approval.
          </CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      {step === "category" && (
        <Card>
          <CardHeader>
            <CardTitle>1. What kind of expense?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Select
              value={category}
              onChange={(e) => setCategory(e.currentTarget.value as ExpenseCategory)}
            >
              {COMMON_CATEGORIES.map((c) => (
                <option key={c} value={c}>{expenseCategoryLabel[c]}</option>
              ))}
            </Select>
            <Button size="lg" onClick={() => setStep("capture")}>
              Next — capture receipt
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "capture" && (
        <Card>
          <CardHeader>
            <CardTitle>2. Snap the receipt</CardTitle>
            <CardDescription>
              Make sure the amount and vendor are readable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {image ? (
              <div className="flex flex-col gap-3">
                <PreviewWithRetake image={image} onRetake={() => setImage(null)} />
                <Button size="lg" onClick={() => startExtract(image)}>
                  <Sparkles className="size-4" />
                  Extract with AI
                </Button>
              </div>
            ) : (
              <CameraCapture onCapture={startExtract} />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => {
                setImage(null);
                setStep("category");
              }}
            >
              ← Change category
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "extract" && (
        <Card>
          <CardHeader>
            <CardTitle>Reading receipt…</CardTitle>
            <CardDescription>Claude is extracting the fields.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="size-5 animate-spin text-brand-blue" />
            <span className="text-sm text-fg-secondary">Working on it…</span>
          </CardContent>
        </Card>
      )}

      {step === "review" && extraction && image && (
        <Card>
          <CardHeader>
            <CardTitle>3. Confirm details</CardTitle>
            <CardDescription>
              Edit anything the AI got wrong before submitting.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PreviewWithRetake
              image={image}
              onRetake={() => {
                setImage(null);
                setExtraction(null);
                setStep("capture");
              }}
            />

            <div className="rounded-md bg-brand-blue/5 px-3 py-2 ring-1 ring-brand-blue/20">
              <div className="flex items-center gap-2 text-xs text-brand-blue">
                <Sparkles className="size-3" />
                Source: {extraction.source} · confidence {extraction.confidence}
              </div>
              {extraction.notes && (
                <p className="mt-1 text-[10px] text-fg-tertiary">
                  {extraction.notes}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Field label="Vendor">
                <Input value={vendor} onChange={(e) => setVendor(e.currentTarget.value)} />
              </Field>
              <Field label="Amount (KES)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.currentTarget.value)}
                  className="font-mono tnum text-2xl"
                />
              </Field>
              <Field label="Category">
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.currentTarget.value as ExpenseCategory)}
                >
                  {COMMON_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{expenseCategoryLabel[c]}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={incurredAt}
                  onChange={(e) => setIncurredAt(e.currentTarget.value)}
                  className="font-mono tnum"
                />
              </Field>
              <Field label="Location">
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.currentTarget.value)}
                />
              </Field>
              <Field label="Country">
                <Select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.currentTarget.value)}
                >
                  <option value="KE">Kenya</option>
                  <option value="UG">Uganda</option>
                  <option value="TZ">Tanzania</option>
                  <option value="RW">Rwanda</option>
                  <option value="SS">South Sudan</option>
                  <option value="CD">DR Congo</option>
                </Select>
              </Field>
              <Field label="Paid by">
                <Select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.currentTarget.value as PaymentMethod)}
                >
                  <option value="advance">From driver advance</option>
                  <option value="cash">Cash (own pocket)</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="fuel_card">Fuel card</option>
                </Select>
              </Field>
              <Field label="Description / note">
                <Textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                />
              </Field>
            </div>

            <Button size="lg" onClick={submit} disabled={pending} variant="primary">
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Submit for approval
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card className="border-status-success/30 bg-status-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-status-success">
              <CheckCircle2 className="size-5" />
              Submitted
            </CardTitle>
            <CardDescription>
              Your expense is queued for manager approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={reset} variant="primary">
              Scan another receipt
            </Button>
            <Button onClick={() => router.push("/drv/expenses")} variant="outline">
              View my expenses
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
