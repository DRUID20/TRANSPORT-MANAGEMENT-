"use server";

import type { TripDocumentKind } from "@/lib/types/documents";

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
}

export interface ExtractionResult {
  source: "claude" | "mock";
  documentName: string;
  fields: ExtractedField[];
  confidence: "high" | "medium" | "low";
  notes?: string;
}

/**
 * Extract fields from a captured photo of a trip document.
 *
 * - When ANTHROPIC_API_KEY is set, this would call Claude vision.
 * - Until then we return plausible mock fields per document kind, so the
 *   PWA flow is fully exercisable without external services.
 */
export async function extractDocumentFields(input: {
  kind: TripDocumentKind;
  /** base64 image data URL (data:image/jpeg;base64,...) -- not used by mock. */
  imageDataUrl: string;
  /** Optional context to help the model focus (trip number, route, etc). */
  context?: { tripNumber?: string; origin?: string; destination?: string };
}): Promise<ExtractionResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    // TODO: real Claude vision call — left as TODO until the user provides
    // an API key. For now we still return a mock so the rest of the flow
    // works end-to-end.
    return mockExtract(input.kind, input.context);
  }
  // Simulate a small delay so the UI's "extracting…" state is visible
  await new Promise((r) => setTimeout(r, 600));
  return mockExtract(input.kind, input.context);
}

function mockExtract(
  kind: TripDocumentKind,
  ctx?: { tripNumber?: string; origin?: string; destination?: string },
): ExtractionResult {
  const fields = templateFor(kind, ctx);
  return {
    source: "mock",
    documentName: `${labelFor(kind)} (mock extract)`,
    fields,
    confidence: "medium",
    notes:
      "Mock extraction. When ANTHROPIC_API_KEY is set, Claude vision will return real field values.",
  };
}

function labelFor(kind: TripDocumentKind): string {
  const map: Record<TripDocumentKind, string> = {
    manifest: "Manifest",
    bill_of_lading: "Bill of Lading",
    road_user_charge: "Road User Charge",
    commercial_invoice: "Commercial Invoice",
    packing_list: "Packing List",
    waybill: "Waybill",
    t1_transit: "T1 Transit",
    comesa_yellow_card: "COMESA Yellow Card",
    certificate_of_origin: "Certificate of Origin",
    gate_out_slip: "Gate-Out Slip",
    weighbridge_slip: "Weighbridge Slip",
    proof_of_delivery: "Proof of Delivery",
    damage_report: "Damage Report",
    photo: "Photo",
    other: "Document",
  };
  return map[kind];
}

function templateFor(
  kind: TripDocumentKind,
  ctx?: { tripNumber?: string; origin?: string; destination?: string },
): ExtractedField[] {
  const route = ctx ? `${ctx.origin ?? ""} → ${ctx.destination ?? ""}` : "";
  switch (kind) {
    case "manifest":
      return [
        { key: "manifest_no", label: "Manifest no.", value: "MAN-2026-3398" },
        { key: "consignor", label: "Consignor", value: "Pearl of Africa Coffee" },
        { key: "consignee", label: "Consignee", value: "Kampala Coffee Importers" },
        { key: "route", label: "Route", value: route },
        { key: "units", label: "Total units", value: "28 t" },
      ];
    case "commercial_invoice":
      return [
        { key: "invoice_no", label: "Invoice no.", value: "INV-2026-9920" },
        { key: "supplier", label: "Supplier", value: "Pearl of Africa Coffee" },
        { key: "amount", label: "Amount", value: "44,800.00" },
        { key: "currency", label: "Currency", value: "USD" },
        { key: "date", label: "Date", value: new Date().toISOString().slice(0, 10) },
      ];
    case "packing_list":
      return [
        { key: "list_no", label: "List no.", value: "PL-2026-2210" },
        { key: "packages", label: "Packages", value: "560 bags × 50kg" },
        { key: "gross_weight", label: "Gross weight", value: "28,300 kg" },
        { key: "net_weight", label: "Net weight", value: "28,000 kg" },
      ];
    case "waybill":
      return [
        { key: "waybill_no", label: "Waybill no.", value: "NV-WB-09822" },
        { key: "issuer", label: "Issued by", value: "Nile Valley Logistics" },
        { key: "trip", label: "Trip", value: ctx?.tripNumber ?? "—" },
      ];
    case "t1_transit":
      return [
        { key: "t1_no", label: "T1 no.", value: "T1-UG-2026-0042819" },
        { key: "issuing_office", label: "Issuing office", value: "Mombasa Customs" },
        { key: "validity", label: "Valid until", value: "+ 7 days" },
      ];
    case "comesa_yellow_card":
      return [
        { key: "policy_no", label: "Policy no.", value: "COMESA-YC-2026-118822" },
        { key: "vehicle", label: "Vehicle", value: "KCB 421R" },
        { key: "valid_from", label: "Valid from", value: new Date().toISOString().slice(0, 10) },
        { key: "valid_to", label: "Valid to", value: "+ 12 months" },
      ];
    case "certificate_of_origin":
      return [
        { key: "coo_no", label: "CoO no.", value: "EAC-COO-2026-330221" },
        { key: "country", label: "Country of origin", value: "Uganda" },
      ];
    case "gate_out_slip":
      return [
        { key: "gate_no", label: "Gate no.", value: "G-04" },
        { key: "left_at", label: "Left at", value: new Date().toISOString().slice(11, 16) },
        { key: "vehicle", label: "Vehicle", value: "KCB 421R" },
      ];
    case "weighbridge_slip":
      return [
        { key: "post", label: "Post", value: "Mariakani" },
        { key: "vehicle", label: "Vehicle", value: "KCB 421R" },
        { key: "gross_kg", label: "Gross", value: "39,800 kg" },
        { key: "tare_kg", label: "Tare", value: "11,400 kg" },
        { key: "net_kg", label: "Net", value: "28,400 kg" },
      ];
    case "proof_of_delivery":
      return [
        { key: "recipient", label: "Received by", value: "Kampala Coffee Importers" },
        { key: "signed_at", label: "Signed at", value: new Date().toISOString().slice(0, 16).replace("T", " ") },
        { key: "condition", label: "Condition", value: "Good — no damages" },
      ];
    case "damage_report":
      return [
        { key: "incident", label: "Incident", value: "Minor scrape on tarpaulin" },
        { key: "occurred_at", label: "Occurred at", value: route },
        { key: "severity", label: "Severity", value: "Low" },
      ];
    case "photo":
    case "other":
    default:
      return [
        { key: "summary", label: "Summary", value: "(driver to caption)" },
      ];
  }
}
