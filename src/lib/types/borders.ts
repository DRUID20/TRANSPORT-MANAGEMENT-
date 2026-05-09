/**
 * Cross-border workflow — Phase 2D.
 * Border crossings recorded per trip.
 */

export type BorderStatus = "approaching" | "queued" | "cleared" | "rejected";

export interface BorderCrossing {
  id: string;
  tripId: string;
  /** Display label, e.g. "Malaba (KE → UG)". */
  postName: string;
  /** ISO 3166-1 alpha-2, e.g. "KE". */
  countryFrom: string;
  countryTo: string;
  status: BorderStatus;
  /** When the truck arrived at the post (ISO datetime). */
  arrivedAt?: string;
  /** When customs cleared (ISO datetime). */
  clearedAt?: string;
  /** Axle-load measurement at the post (kg). */
  axleLoadKg?: number;
  /** Transit permit number issued at this post. */
  transitPermitNumber?: string;
  /** Border charges paid (KES base; settlement in foreign ccy converted). */
  chargesKes?: number;
  notes?: string;
  createdAt: string;
}

/** Common East African border posts on Nile Valley's lanes. */
export const COMMON_BORDERS: Array<{
  postName: string;
  countryFrom: string;
  countryTo: string;
}> = [
  { postName: "Malaba (KE → UG)",          countryFrom: "KE", countryTo: "UG" },
  { postName: "Busia (KE → UG)",           countryFrom: "KE", countryTo: "UG" },
  { postName: "Namanga (KE → TZ)",         countryFrom: "KE", countryTo: "TZ" },
  { postName: "Taveta (KE → TZ)",          countryFrom: "KE", countryTo: "TZ" },
  { postName: "Holili (KE → TZ)",          countryFrom: "KE", countryTo: "TZ" },
  { postName: "Nadapal (KE → SS)",         countryFrom: "KE", countryTo: "SS" },
  { postName: "Mutukula (UG → TZ)",        countryFrom: "UG", countryTo: "TZ" },
  { postName: "Katuna / Gatuna (UG → RW)", countryFrom: "UG", countryTo: "RW" },
  { postName: "Mirama Hills (UG → RW)",    countryFrom: "UG", countryTo: "RW" },
  { postName: "Cyanika (RW → UG)",         countryFrom: "RW", countryTo: "UG" },
  { postName: "Goli (UG → DRC)",           countryFrom: "UG", countryTo: "CD" },
  { postName: "Kasindi (UG → DRC)",        countryFrom: "UG", countryTo: "CD" },
];

export const borderStatusLabel: Record<BorderStatus, string> = {
  approaching: "Approaching",
  queued: "Queued",
  cleared: "Cleared",
  rejected: "Rejected",
};
