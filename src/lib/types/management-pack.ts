/**
 * Monthly Management Pack — Phase 9.
 *
 * One pack per calendar month. Bundles every report Finance + Ops needs
 * for the monthly close, with a narrative section and a 3-stage signoff
 * workflow: Prepared → Reviewed → Signed-off → Published.
 *
 * Each pack is keyed by YYYY-MM. Once signed-off it's locked; in a real
 * deployment the underlying figures get snapshotted so historical packs
 * don't shift if data changes later.
 */

export type ManagementPackStatus =
  | "draft"
  | "in_review"
  | "signed_off"
  | "published";

export interface ManagementPack {
  id: string;
  /** YYYY-MM, used as the unique key. */
  yearMonth: string;
  startDate: string;
  endDate: string;
  status: ManagementPackStatus;

  /** Narrative sections — plain text, edited by Finance / MD. */
  narrative: string;
  highlights: string;
  risks: string;

  /** Workflow stamps. */
  preparedById?: string;
  preparedAt?: string;
  reviewedById?: string;
  reviewedAt?: string;
  signedOffById?: string;
  signedOffAt?: string;
  publishedAt?: string;

  createdAt: string;
}

export const STATUS_ORDER: ManagementPackStatus[] = [
  "draft",
  "in_review",
  "signed_off",
  "published",
];

export const STATUS_LABELS: Record<ManagementPackStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  signed_off: "Signed-off",
  published: "Published",
};
