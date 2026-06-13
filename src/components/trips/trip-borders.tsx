"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Clock, Flag, Loader2, Plus, Trash2 } from "lucide-react";
import {
  clearBorder,
  recordBorderArrival,
  removeBorderCrossing,
} from "@/server/actions/borders";
import {
  borderStatusLabel,
  COMMON_BORDERS,
  type BorderCrossing,
} from "@/lib/types/borders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function formatDuration(fromIso: string, toIso?: string): string {
  const from = new Date(fromIso).getTime();
  const to = toIso ? new Date(toIso).getTime() : Date.now();
  const mins = Math.max(0, Math.round((to - from) / 60_000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return `${d}d ${remH}h`;
}

export function TripBorders({
  tripId,
  borders,
}: {
  tripId: string;
  borders: BorderCrossing[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Add form state
  const [postIndex, setPostIndex] = useState(0);
  const [permit, setPermit] = useState("");
  const [axle, setAxle] = useState("");
  const [charges, setCharges] = useState("");
  const [notes, setNotes] = useState("");

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const post = COMMON_BORDERS[postIndex];
    if (!post) {
      setError("Select a border post.");
      return;
    }
    startTransition(async () => {
      const result = await recordBorderArrival({
        tripId,
        postName: post.postName,
        countryFrom: post.countryFrom,
        countryTo: post.countryTo,
        status: "queued",
        transitPermitNumber: permit || undefined,
        axleLoadKg: axle ? Number(axle) : undefined,
        chargesKes: charges ? Number(charges) : undefined,
        notes: notes || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPermit("");
      setAxle("");
      setCharges("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <section className="surface-card overflow-hidden">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-[13px] font-semibold tracking-tight text-fg-primary">
          Cross-border crossings
        </h2>
        <p className="text-xs text-fg-tertiary">
          Border posts on the route. Arrival timestamp, axle-load, transit
          permit, charges.
        </p>
      </header>
      <div className="flex flex-col gap-5 px-5 py-5">
        {error && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </div>
        )}

        {/* List */}
        {borders.length === 0 ? (
          <p className="py-6 text-center text-sm text-fg-tertiary">
            No border crossings recorded yet for this trip.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-bg-base/40">
            {borders.map((b) => (
              <BorderRow key={b.id} crossing={b} />
            ))}
          </ul>
        )}

        {/* Total cross-border charges */}
        {borders.length > 0 && (
          <div className="flex items-center justify-end gap-3 border-t border-border pt-3">
            <span className="text-xs uppercase tracking-wider text-fg-tertiary">
              Total border charges
            </span>
            <span className="font-mono tnum text-base font-semibold text-fg-primary">
              KSh{" "}
              {borders.reduce((sum, b) => sum + (b.chargesKes ?? 0), 0).toLocaleString()}
            </span>
          </div>
        )}

        {/* Add */}
        <form
          onSubmit={onAdd}
          className="rounded-md border border-dashed border-border bg-bg-base/40 p-4"
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-fg-primary">
            <Flag className="size-4 text-fg-tertiary" />
            Record border arrival
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Border post</Label>
              <Select
                value={String(postIndex)}
                onChange={(e) => setPostIndex(Number(e.currentTarget.value))}
              >
                {COMMON_BORDERS.map((p, i) => (
                  <option key={p.postName} value={i}>
                    {p.postName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Transit permit no. (optional)</Label>
              <Input
                value={permit}
                onChange={(e) => setPermit(e.currentTarget.value)}
                placeholder="UG-TRP-2026-009912"
                className="font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Axle-load (kg)</Label>
              <Input
                type="number"
                min={0}
                value={axle}
                onChange={(e) => setAxle(e.currentTarget.value)}
                className="font-mono tnum"
                placeholder="28400"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Charges (KES)</Label>
              <Input
                type="number"
                min={0}
                value={charges}
                onChange={(e) => setCharges(e.currentTarget.value)}
                className="font-mono tnum"
                placeholder="4800"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                rows={2}
                placeholder="Queue length, any issues, etc."
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Record arrival
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-fg-tertiary">
            Once cleared, click the green tick on the row to capture the cleared
            timestamp and lock the queue duration.
          </p>
        </form>
      </div>
    </section>
  );
}

function BorderRow({ crossing }: { crossing: BorderCrossing }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showClear, setShowClear] = useState(false);
  const [permit, setPermit] = useState(crossing.transitPermitNumber ?? "");
  const [axle, setAxle] = useState(
    crossing.axleLoadKg ? String(crossing.axleLoadKg) : "",
  );
  const [charges, setCharges] = useState(
    crossing.chargesKes ? String(crossing.chargesKes) : "",
  );

  function onClear() {
    startTransition(async () => {
      await clearBorder({
        borderId: crossing.id,
        axleLoadKg: axle ? Number(axle) : undefined,
        transitPermitNumber: permit || undefined,
        chargesKes: charges ? Number(charges) : undefined,
      });
      setShowClear(false);
      router.refresh();
    });
  }

  function onRemove() {
    startTransition(async () => {
      await removeBorderCrossing(crossing.id);
      router.refresh();
    });
  }

  const tone =
    crossing.status === "cleared"
      ? ("success" as const)
      : crossing.status === "rejected"
        ? ("danger" as const)
        : crossing.status === "queued"
          ? ("warning" as const)
          : ("info" as const);

  return (
    <li className="flex flex-col gap-2 p-3 transition-colors hover:bg-bg-base/40">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-bg-base text-fg-tertiary ring-1 ring-border">
          <Flag className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold text-fg-primary">
              {crossing.postName}
            </span>
            <Badge variant={tone} dot>
              {borderStatusLabel[crossing.status]}
            </Badge>
            {crossing.arrivedAt && (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] tnum text-fg-tertiary">
                <Clock className="size-2.5" />
                {formatDuration(crossing.arrivedAt, crossing.clearedAt)}
                {!crossing.clearedAt && " in queue"}
              </span>
            )}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <Field label="Arrived" value={crossing.arrivedAt ? new Date(crossing.arrivedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"} />
            <Field label="Cleared" value={crossing.clearedAt ? new Date(crossing.clearedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"} />
            <Field label="Axle-load" value={crossing.axleLoadKg ? `${crossing.axleLoadKg.toLocaleString()} kg` : "—"} mono />
            <Field label="Charges" value={crossing.chargesKes !== undefined ? `KSh ${crossing.chargesKes.toLocaleString()}` : "—"} mono />
          </div>
          {crossing.transitPermitNumber && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-bg-base px-2 py-0.5 font-mono text-[10px] text-fg-secondary ring-1 ring-border">
              Transit permit: {crossing.transitPermitNumber}
            </div>
          )}
          {crossing.notes && (
            <div className="mt-1 text-xs text-fg-tertiary">{crossing.notes}</div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {crossing.status !== "cleared" && (
          <Button
            variant="success"
            size="sm"
            onClick={() => setShowClear((v) => !v)}
            disabled={pending}
          >
            <CheckCircle2 className="size-3.5" />
            Mark Cleared
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={pending}
          className="ml-auto text-fg-tertiary hover:text-status-danger"
          aria-label="Remove crossing"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {showClear && (
        <div className="rounded-md border border-status-success/30 bg-status-success/5 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Transit permit no.</Label>
              <Input
                value={permit}
                onChange={(e) => setPermit(e.currentTarget.value)}
                className="font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Axle-load (kg)</Label>
              <Input
                type="number"
                min={0}
                value={axle}
                onChange={(e) => setAxle(e.currentTarget.value)}
                className="font-mono tnum"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Charges (KES)</Label>
              <Input
                type="number"
                min={0}
                value={charges}
                onChange={(e) => setCharges(e.currentTarget.value)}
                className="font-mono tnum"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowClear(false)}>
              Cancel
            </Button>
            <Button variant="success" size="sm" onClick={onClear} disabled={pending}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              Confirm Cleared
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</span>
      <span className={"text-fg-primary " + (mono ? "font-mono tnum" : "")}>{value}</span>
    </div>
  );
}
