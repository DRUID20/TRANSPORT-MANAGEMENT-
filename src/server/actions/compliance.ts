"use server";

import {
  getEmployee,
  listComplianceRecords,
  listDrivers,
  listTrailers,
  listTrucks,
} from "@/server/store/mock-store";
import { classifyExpiry, type ExpiryStatus } from "@/lib/types/fleet";
import { KIND_LABELS, type ComplianceKind } from "@/lib/types/hr-compliance";

export type ExpiryEntityKind = "truck" | "trailer" | "driver";

/**
 * Document categories used for filtering and aggregation. 'fuel' covers the
 * petroleum-specific paperwork (HazMat endorsement, EPRA dangerous-goods
 * permit, PUC certificate, EPRA transit licence, petroleum carriers'
 * liability, tank calibration cert). 'general' is everything else.
 */
export type ExpiryCategory = "fuel" | "general";

export interface ExpiryItem {
  key: string;                  // unique row id
  entityKind: ExpiryEntityKind;
  entityId: string;
  entityLabel: string;          // e.g. truck registration or driver name
  documentLabel: string;        // e.g. "Insurance", "COMESA permit"
  category: ExpiryCategory;
  dueDate: string;              // ISO date
  status: ExpiryStatus;         // ok | warning | critical | expired
  daysUntilExpiry: number;      // negative if overdue
  href: string;                 // drill-down link
}

/** Document labels that count as fuel-specific (petroleum) paperwork. */
const FUEL_DOC_LABELS: ReadonlySet<string> = new Set([
  "EPRA transit licence",
  "Petroleum carriers' liability",
  "Tank calibration",
  KIND_LABELS.hazmat_endorsement,
  KIND_LABELS.epra_dangerous_goods,
  KIND_LABELS.puc_certificate,
]);

/** HR compliance kinds that flow into the fuel-compliance bucket. */
const FUEL_HR_KINDS: ReadonlySet<ComplianceKind> = new Set<ComplianceKind>([
  "hazmat_endorsement",
  "epra_dangerous_goods",
  "puc_certificate",
]);

function daysUntil(iso: string, today = new Date()): number {
  const d = new Date(iso);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function pushIfPresent(
  items: ExpiryItem[],
  base: {
    entityKind: ExpiryEntityKind;
    entityId: string;
    entityLabel: string;
    documentLabel: string;
    href: string;
    dueDate: string | undefined;
  },
) {
  if (!base.dueDate) return;
  const status = classifyExpiry(base.dueDate);
  items.push({
    entityKind: base.entityKind,
    entityId: base.entityId,
    entityLabel: base.entityLabel,
    documentLabel: base.documentLabel,
    category: FUEL_DOC_LABELS.has(base.documentLabel) ? "fuel" : "general",
    href: base.href,
    dueDate: base.dueDate,
    status,
    daysUntilExpiry: daysUntil(base.dueDate),
    key: `${base.entityKind}:${base.entityId}:${base.documentLabel}`,
  });
}

/** Pulls every expiry across the fleet. */
export async function listExpiries(): Promise<ExpiryItem[]> {
  const items: ExpiryItem[] = [];
  for (const t of listTrucks()) {
    const base = {
      entityKind: "truck" as const,
      entityId: t.id,
      entityLabel: t.registration,
      href: `/trucks/${t.id}`,
    };
    pushIfPresent(items, { ...base, documentLabel: "Insurance",     dueDate: t.insuranceExpiry });
    pushIfPresent(items, { ...base, documentLabel: "NTSA Inspection", dueDate: t.ntsaInspectionExpiry });
    pushIfPresent(items, { ...base, documentLabel: "COMESA Permit", dueDate: t.comesaPermitExpiry });
    pushIfPresent(items, { ...base, documentLabel: "Transit Permit", dueDate: t.transitPermitExpiry });
    pushIfPresent(items, { ...base, documentLabel: "EPRA transit licence", dueDate: t.epraTransitLicenceExpiry });
    pushIfPresent(items, { ...base, documentLabel: "Petroleum carriers' liability", dueDate: t.petroleumLiabilityExpiry });
    pushIfPresent(items, { ...base, documentLabel: "Tank calibration", dueDate: t.calibrationDueDate });
  }
  for (const tr of listTrailers()) {
    const base = {
      entityKind: "trailer" as const,
      entityId: tr.id,
      entityLabel: tr.registration,
      href: `/trailers/${tr.id}`,
    };
    pushIfPresent(items, { ...base, documentLabel: "Insurance",       dueDate: tr.insuranceExpiry });
    pushIfPresent(items, { ...base, documentLabel: "NTSA Inspection", dueDate: tr.ntsaInspectionExpiry });
  }
  for (const d of listDrivers()) {
    const base = {
      entityKind: "driver" as const,
      entityId: d.id,
      entityLabel: d.fullName,
      href: `/drivers/${d.id}`,
    };
    pushIfPresent(items, { ...base, documentLabel: "Licence",  dueDate: d.licenceExpiry });
    pushIfPresent(items, { ...base, documentLabel: "Medical",  dueDate: d.medicalExpiry });
    pushIfPresent(items, { ...base, documentLabel: "Passport", dueDate: d.passportExpiry });
    pushIfPresent(items, { ...base, documentLabel: "COMESA Driver Permit", dueDate: d.comesaDriverPermitExpiry });
  }

  // HR compliance records — surface fuel-specific kinds (HazMat, EPRA-DG,
  // PUC) on the same fleet expiry feed so the dispatcher sees them next to
  // truck and trailer paperwork. Non-fuel HR records (work permits,
  // first-aid, etc.) belong on the dedicated HR page and stay there.
  for (const r of listComplianceRecords()) {
    if (!r.expiryDate) continue;
    if (!FUEL_HR_KINDS.has(r.kind)) continue;
    const emp = getEmployee(r.employeeId);
    if (!emp) continue;
    const status = classifyExpiry(r.expiryDate);
    items.push({
      entityKind: "driver",
      entityId: r.employeeId,
      entityLabel: emp.fullName,
      documentLabel: KIND_LABELS[r.kind],
      category: "fuel",
      href: `/hr/employees/${r.employeeId}`,
      dueDate: r.expiryDate,
      status,
      daysUntilExpiry: daysUntil(r.expiryDate),
      key: `hr:${r.id}`,
    });
  }

  // Sort: most urgent (smallest days) first
  return items.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

/** Aggregate counts for the dashboard 'Needs Attention' card. */
export async function getComplianceSummary() {
  const items = await listExpiries();
  const trucksInWorkshop = listTrucks().filter((t) => t.status === "in_workshop").length;

  const insuranceExpiring = items.filter(
    (i) => i.documentLabel === "Insurance" && (i.status === "warning" || i.status === "critical" || i.status === "expired"),
  ).length;

  const comesaExpiring = items.filter(
    (i) =>
      (i.documentLabel === "COMESA Permit" || i.documentLabel === "COMESA Driver Permit") &&
      (i.status === "warning" || i.status === "critical" || i.status === "expired"),
  ).length;

  const driverDocsExpiring = items.filter(
    (i) =>
      i.entityKind === "driver" &&
      (i.documentLabel === "Licence" || i.documentLabel === "Medical") &&
      (i.status === "warning" || i.status === "critical" || i.status === "expired"),
  ).length;

  /**
   * Fuel-specific compliance: HazMat / EPRA-DG / PUC (driver-side) + EPRA
   * transit licence / petroleum carriers' liability / tank calibration
   * (truck-side). Counts entries flagged as expiring or already past due.
   *
   * If an operator loses petroleum-carrier authorisation the trip can't
   * legally run, so this gets its own line on the dashboard alongside the
   * general fleet expiries — operationally it's a different conversation.
   */
  const fuelComplianceExpiring = items.filter(
    (i) =>
      i.category === "fuel" &&
      (i.status === "warning" || i.status === "critical" || i.status === "expired"),
  ).length;

  const expiredCount = items.filter((i) => i.status === "expired").length;
  const criticalCount = items.filter((i) => i.status === "critical").length;
  const warningCount = items.filter((i) => i.status === "warning").length;

  return {
    trucksInWorkshop,
    insuranceExpiring,
    comesaExpiring,
    driverDocsExpiring,
    fuelComplianceExpiring,
    expiredCount,
    criticalCount,
    warningCount,
    totalItems: items.length,
  };
}
