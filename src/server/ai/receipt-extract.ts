"use server";

import type { ExpenseCategory } from "@/lib/types/expenses";

export interface ReceiptExtraction {
  source: "claude" | "mock";
  vendor: string;
  amountKes: number;
  originalAmount?: number;
  originalCurrency?: "KES" | "USD" | "UGX" | "TZS" | "RWF";
  /** Best guess; driver can override. */
  categoryGuess: ExpenseCategory;
  /** ISO date (yyyy-mm-dd). */
  incurredAt: string;
  location?: string;
  countryCode?: string;
  confidence: "high" | "medium" | "low";
  notes?: string;
}

/**
 * Extract fields from a captured receipt photo.
 *
 * - When ANTHROPIC_API_KEY is set, this would call Claude vision.
 * - Until then we return plausible mock fields based on the chosen
 *   category, so the PWA flow is fully exercisable.
 */
export async function extractReceiptFields(input: {
  /** What the driver chose before snapping. We honour it as the guess
   *  unless the receipt clearly says otherwise. */
  hintedCategory: ExpenseCategory;
  imageDataUrl: string;
}): Promise<ReceiptExtraction> {
  if (process.env.ANTHROPIC_API_KEY) {
    // TODO Phase 4B+: call Claude vision and parse the response.
    return mock(input.hintedCategory);
  }
  await new Promise((r) => setTimeout(r, 600));
  return mock(input.hintedCategory);
}

function mock(category: ExpenseCategory): ReceiptExtraction {
  const today = new Date().toISOString().slice(0, 10);
  const presets: Partial<Record<ExpenseCategory, Partial<ReceiptExtraction>>> = {
    fuel: {
      vendor: "Total Mariakani",
      amountKes: 24500,
      location: "Mariakani",
      countryCode: "KE",
    },
    tolls: {
      vendor: "KENHA Toll Plaza",
      amountKes: 240,
      location: "Mlolongo",
      countryCode: "KE",
    },
    border_charges: {
      vendor: "URA Customs",
      amountKes: 4800,
      location: "Malaba",
      countryCode: "UG",
    },
    weighbridge: {
      vendor: "KENHA Weighbridge",
      amountKes: 1500,
      location: "Mariakani",
      countryCode: "KE",
    },
    driver_per_diem: {
      vendor: "Driver per-diem",
      amountKes: 2000,
      countryCode: "KE",
    },
    driver_overnight: {
      vendor: "Eldoret Lodgings",
      amountKes: 2500,
      location: "Eldoret",
      countryCode: "KE",
    },
    driver_welfare: {
      vendor: "Naivas Supermarket",
      amountKes: 1200,
      location: "Mai Mahiu",
      countryCode: "KE",
    },
    vehicle_repair: {
      vendor: "Mwiki Workshop",
      amountKes: 8500,
      location: "Mwiki",
      countryCode: "KE",
    },
    tyres: {
      vendor: "Roadtrek Tyres",
      amountKes: 38000,
      location: "Mombasa",
      countryCode: "KE",
    },
    spares: {
      vendor: "Bandari Motors Spares",
      amountKes: 4500,
      location: "Mombasa",
      countryCode: "KE",
    },
    lubricants: {
      vendor: "Tropical Lubricants",
      amountKes: 9800,
      location: "Mombasa",
      countryCode: "KE",
    },
    fines_penalties: {
      vendor: "Traffic fine",
      amountKes: 5000,
      location: "Mombasa Road",
      countryCode: "KE",
    },
    other: {
      vendor: "Other vendor",
      amountKes: 1000,
      countryCode: "KE",
    },
  };
  const preset = presets[category] ?? presets.other!;
  return {
    source: "mock",
    vendor: preset.vendor!,
    amountKes: preset.amountKes!,
    categoryGuess: category,
    incurredAt: today,
    location: preset.location,
    countryCode: preset.countryCode,
    confidence: "medium",
    notes:
      "Mock extraction. When ANTHROPIC_API_KEY is set, Claude vision will read the receipt for real.",
  };
}
