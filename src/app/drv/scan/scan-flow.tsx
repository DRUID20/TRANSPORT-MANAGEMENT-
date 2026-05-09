"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Sparkles, Upload } from "lucide-react";
import { extractDocumentFields, type ExtractionResult } from "@/server/ai/document-extract";
import { uploadDocument } from "@/server/actions/documents";
import { documentKindLabel, type TripDocumentKind } from "@/lib/types/documents";
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
import {
  CameraCapture,
  PreviewWithRetake,
  type CapturedImage,
} from "@/components/driver/camera-capture";

type Step = "type" | "capture" | "extract" | "review" | "done";

export function ScanFlow({
  tripId,
  tripNumber,
  origin,
  destination,
}: {
  tripId: string;
  tripNumber: string;
  origin: string;
  destination: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [kind, setKind] = useState<TripDocumentKind>("weighbridge_slip");
  const [image, setImage] = useState<CapturedImage | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function startExtract(captured: CapturedImage) {
    setImage(captured);
    setError(null);
    setStep("extract");
    start(async () => {
      try {
        const result = await extractDocumentFields({
          kind,
          imageDataUrl: captured.dataUrl,
          context: { tripNumber, origin, destination },
        });
        setExtraction(result);
        const initial: Record<string, string> = {};
        result.fields.forEach((f) => {
          initial[f.key] = f.value;
        });
        setFields(initial);
        setStep("review");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Extraction failed");
        setStep("capture");
      }
    });
  }

  function submit() {
    if (!image || !extraction) return;
    setError(null);
    start(async () => {
      const summary = extraction.fields
        .map((f) => `${f.label}: ${fields[f.key] ?? ""}`)
        .join("\n");
      const result = await uploadDocument({
        tripId,
        kind,
        name: `${documentKindLabel[kind]} — ${origin} → ${destination}`,
        fileName: image.fileName,
        fileSize: image.size,
        mimeType: image.mimeType,
        uploadedBy: "Driver (scan)",
        notes: summary,
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
    setKind("weighbridge_slip");
    setImage(null);
    setExtraction(null);
    setFields({});
    setError(null);
    setStep("type");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Step header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand-blue" />
            Scan a document
          </CardTitle>
          <CardDescription>
            Trip <span className="font-mono">{tripNumber}</span> · {origin} →{" "}
            {destination}
          </CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      {/* Step: pick type */}
      {step === "type" && (
        <Card>
          <CardHeader>
            <CardTitle>1. Pick document type</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Select
              value={kind}
              onChange={(e) => setKind(e.currentTarget.value as TripDocumentKind)}
            >
              {Object.entries(documentKindLabel).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
            <Button size="lg" onClick={() => setStep("capture")}>
              Next — capture photo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: capture */}
      {step === "capture" && (
        <Card>
          <CardHeader>
            <CardTitle>2. Capture {documentKindLabel[kind]}</CardTitle>
            <CardDescription>Point at the document. Hold steady.</CardDescription>
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
                setStep("type");
              }}
            >
              ← Change type
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: extracting */}
      {step === "extract" && (
        <Card>
          <CardHeader>
            <CardTitle>Extracting…</CardTitle>
            <CardDescription>Claude is reading the document.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="size-5 animate-spin text-brand-blue" />
            <span className="text-sm text-fg-secondary">Working on it…</span>
          </CardContent>
        </Card>
      )}

      {/* Step: review */}
      {step === "review" && extraction && image && (
        <Card>
          <CardHeader>
            <CardTitle>3. Review extracted fields</CardTitle>
            <CardDescription>
              Edit any value the AI got wrong, then submit. Manager approves on
              the office app.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PreviewWithRetake
              image={image}
              onRetake={() => {
                setImage(null);
                setExtraction(null);
                setFields({});
                setStep("capture");
              }}
            />

            <div className="rounded-md bg-brand-blue/5 px-3 py-2 ring-1 ring-brand-blue/20">
              <div className="flex items-center gap-2 text-xs text-brand-blue">
                <Sparkles className="size-3" />
                Source: {extraction.source} · confidence {extraction.confidence}
              </div>
              {extraction.notes && (
                <p className="mt-1 text-[10px] text-fg-tertiary">{extraction.notes}</p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {extraction.fields.map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    value={fields[f.key] ?? ""}
                    onChange={(e) =>
                      setFields((prev) => ({ ...prev, [f.key]: e.currentTarget.value }))
                    }
                  />
                </div>
              ))}
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

      {/* Step: done */}
      {step === "done" && (
        <Card className="border-status-success/30 bg-status-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-status-success">
              <CheckCircle2 className="size-5" />
              Submitted
            </CardTitle>
            <CardDescription>
              The document is queued for manager approval on the office app.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={reset} variant="primary">
              Scan another
            </Button>
            <Button onClick={() => router.push(`/drv/trip/${tripId}`)} variant="outline">
              Back to trip
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
