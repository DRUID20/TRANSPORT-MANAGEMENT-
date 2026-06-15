import type { TripStatus } from "@/lib/types/trips";

/**
 * Five user-facing wizard stages. Each maps to one URL slug under
 * /trips/[id]/<slug> and to a range of the underlying status machine.
 * The wizard exposes ONE stage at a time so dispatchers don't see the
 * whole page at once.
 */
export const STAGES = ["loading", "in-transit", "border", "delivery", "invoice"] as const;
export type StageSlug = (typeof STAGES)[number];

export const STAGE_LABEL: Record<StageSlug, string> = {
  loading: "Loading",
  "in-transit": "In transit",
  border: "Border",
  delivery: "Delivery",
  invoice: "Invoice & close",
};

/**
 * Map a trip status to the stage the dispatcher should currently see.
 *
 * Rules:
 *   planned                          → loading   (capture loading)
 *   loading                          → loading   (still capturing)
 *   in_transit                       → in-transit (waiting for border)
 *   at_border                        → border    (border charges + RUC)
 *   delivered + !dischargeCaptured   → delivery  (record delivered volume)
 *   delivered + dischargeCaptured    → invoice   (preview + post)
 *   closed                           → invoice   (read-only summary)
 *   cancelled                        → loading   (frozen, show the start)
 *   delayed                          → derived from previousNonDelayed
 *                                      (delayed isn't a stage; it's a badge)
 *
 * NOTE: the delivery→invoice gate keys off `dischargeCaptured` (real data:
 * has the discharged volume been recorded?) NOT `readyToInvoice` — that flag
 * only flips at close, so it can't drive the stage while the trip is live.
 */
export function currentStage(
  status: TripStatus,
  flags: { dischargeCaptured?: boolean } = {},
): StageSlug {
  switch (status) {
    case "planned":
    case "loading":
      return "loading";
    case "in_transit":
      return "in-transit";
    case "at_border":
      return "border";
    case "delivered":
      return flags.dischargeCaptured ? "invoice" : "delivery";
    case "closed":
      return "invoice";
    case "cancelled":
      return "loading";
    case "delayed":
      // Delayed is a badge, not a stage. Caller should pass the previous
      // non-delayed status if known; this is the safe fallback.
      return "loading";
  }
}

/**
 * Has the dispatcher already reached a given stage? Used by the StageBar
 * to mark past stages as ✓ (clickable to edit) and future stages as
 * locked (not clickable until the current one is completed).
 */
export function stageReached(
  stage: StageSlug,
  status: TripStatus,
  flags: { dischargeCaptured?: boolean } = {},
): boolean {
  const order = STAGES.indexOf(currentStage(status, flags));
  return STAGES.indexOf(stage) <= order;
}

/**
 * Terminal trips (closed + cancelled) freeze the wizard — no edits,
 * no stage advancement, no destructive actions.
 */
export function wizardReadOnly(status: TripStatus): boolean {
  return status === "closed" || status === "cancelled";
}

/**
 * Coarse "what's next" hint for the trips LIST page. Intentionally
 * doc-lookup-free (the list renders dozens of rows — we don't want an N+1
 * documents query per row), so it can't know BOL-approval state. The full,
 * precise blocker lives in the wizard layout's computeBlocker.
 */
export function stageHint(
  status: TripStatus,
  flags: {
    destination?: string;
    loadedLitres?: number;
    dischargedLitres?: number;
  } = {},
): string | undefined {
  switch (status) {
    case "planned":
    case "loading":
      return flags.loadedLitres === undefined
        ? "Approve BOL + capture load"
        : "Mark loading complete";
    case "in_transit":
      return "Confirm arrival at border";
    case "at_border":
      return !flags.destination ? "Assign destination + RUC" : "Record RUC + clear border";
    case "delivered":
      return flags.dischargedLitres === undefined
        ? "Capture delivered volume"
        : "Preview invoice + close";
    case "delayed":
      return "Delayed — resume the trip";
    case "closed":
    case "cancelled":
      return undefined;
  }
}
