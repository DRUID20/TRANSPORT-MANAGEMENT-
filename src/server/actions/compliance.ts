"use server";

import {
  listDrivers,
  listTrailers,
  listTrucks,
} from "@/server/store/mock-store";
import { classifyExpiry, type ExpiryStatus } from "@/lib/types/fleet";

export type ExpiryEntityKind = "truck" | "trailer" | "driver";

export interface ExpiryItem {
  key: string;                  // unique row id
  entityKind: ExpiryEntityKind;
  entityId: string;
  entityLabel: string;          // e.g. truck registration or driver name
  documentLabel: string;        // e.g. "Insurance", "COMESA permit"
  dueDate: string;              // ISO date
  status: ExpiryStatus;         // ok | warning | critical | expired
  daysUntilExpiry: number;      // negative if overdue
  href: string;                 // drill-down link
}

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

  const expiredCount = items.filter((i) => i.status === "expired").length;
  const criticalCount = items.filter((i) => i.status === "critical").length;
  const warningCount = items.filter((i) => i.status === "warning").length;

  return {
    trucksInWorkshop,
    insuranceExpiring,
    comesaExpiring,
    driverDocsExpiring,
    expiredCount,
    criticalCount,
    warningCount,
    totalItems: items.length,
  };
}
