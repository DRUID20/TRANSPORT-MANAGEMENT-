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
 *   delivered + !readyToInvoice      → delivery  (record delivered volume)
 *   delivered + readyToInvoice       → invoice   (preview + post)
 *   closed                           → invoice   (read-only summary)
 *   cancelled                        → loading   (frozen, show the start)
 *   delayed                          → derived from previousNonDelayed
 *                                      (delayed isn't a stage; it's a badge)
 */
export function currentStage(
  status: TripStatus,
  flags: { readyToInvoice?: boolean } = {},
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
      return flags.readyToInvoice ? "invoice" : "delivery";
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
  flags: { readyToInvoice?: boolean } = {},
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
