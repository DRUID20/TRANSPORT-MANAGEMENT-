/**
 * In-memory mock store for Phase 1.
 *
 * NOT for production. We swap this out for Drizzle-backed Postgres queries
 * before Phase 2. The seed data lets the UI demo flows immediately.
 *
 * Survives per server-process lifetime; resets on `npm run dev` restart.
 */

import { randomUUID } from "node:crypto";
import type {
  Driver,
  Subcontractor,
  Supplier,
  Trailer,
  Truck,
} from "@/lib/types/fleet";
import type {
  JobCard,
  JobCardDetail,
  JobCardService,
  JobCardSpare,
  JobCardStatus,
} from "@/lib/types/workshop";
import type {
  Booking,
  BookingStatus,
  Customer,
  Rate,
  Trip,
  TripStatus,
  TripStatusEvent,
} from "@/lib/types/trips";
import {
  allowedTransitions,
  computeFuelRevenue,
  isTerminal,
} from "@/lib/types/trips";
import type {
  TripDocument,
  TripDocumentKind,
  TripDocumentStatus,
} from "@/lib/types/documents";
import type { BorderCrossing, BorderStatus } from "@/lib/types/borders";
import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  PaymentMethod,
} from "@/lib/types/expenses";
import type { FuelLog } from "@/lib/types/fuel";
import type {
  Account,
  AccountClass,
  AccountStatus,
  NormalBalance,
} from "@/lib/types/accounts";
import { increasesByDebit } from "@/lib/types/accounts";
import type {
  Currency as LedgerCurrency,
  JournalEntry,
  JournalEntryDetail,
  JournalLine,
  JournalReferenceType,
  JournalStatus,
  TrialBalanceRow,
} from "@/lib/types/ledger";
import type {
  CustomerInvoice,
  CustomerPayment,
  InvoiceLineItem,
  InvoiceStatus,
  InvoiceWithLines,
  PaymentMethod as ARPaymentMethod,
} from "@/lib/types/ar";
import type {
  APPaymentMethod,
  BillLineItem,
  BillStatus,
  BillWithLines,
  SupplierBill,
  SupplierPayment,
} from "@/lib/types/ap";
import type { BankStatementTransaction } from "@/lib/types/bank";
import type {
  Contract,
  ContractStatus,
  Department,
  Employee,
  EmployeeStatus,
} from "@/lib/types/hr";
import type {
  ComplianceKind,
  ComplianceRecord,
} from "@/lib/types/hr-compliance";
import type {
  AttendanceRecord,
  AttendanceStatus,
  LeaveBalance,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from "@/lib/types/leave";
import { KENYA_STATUTORY_LEAVE, workingDaysBetween } from "@/lib/types/leave";
import type {
  Loan,
  LoanStatus,
  PayrollAllowance,
  PayrollInput,
  PayrollPeriod,
  PayrollPeriodStatus,
} from "@/lib/types/payroll";
import {
  NITA_EMPLOYER,
  computeAhl,
  computeNssfEmployee,
  computePaye,
  computeSha,
} from "@/lib/types/payroll";
import type {
  AppraisalCycle,
  AppraisalCycleStatus,
  AppraisalGoal,
  AppraisalReview,
  AppraisalReviewStatus,
  CompetencyRating,
} from "@/lib/types/appraisal";
import { STANDARD_COMPETENCIES } from "@/lib/types/appraisal";
import type {
  JobDescription,
  RbacAction,
  RbacPermission,
  RbacResource,
} from "@/lib/types/rbac";
import type {
  ManagementPack,
  ManagementPackStatus,
} from "@/lib/types/management-pack";
import { STATUS_ORDER as PACK_STATUS_ORDER } from "@/lib/types/management-pack";
import { ageBucket as computeAgeBucket } from "@/lib/types/ar";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Master switch for illustrative seed data. The TMS ships with an empty
 * workspace by default — every truck, customer, rate, booking, trip,
 * supplier, employee, journal entry and notification you see started life
 * here as a seed array. Flip this to `true` to repopulate the in-memory
 * store with the full demo dataset (useful when building UI in isolation).
 */
const DEMO_DATA = false;

// Seed subcontractors
const subcontractorSeed: Subcontractor[] = [
  {
    id: "sub-001",
    name: "Mwalimu Logistics Ltd",
    contactPerson: "James Mwalimu",
    phone: "+254 722 884 110",
    email: "ops@mwalimulogistics.co.ke",
    kraPin: "P051234567A",
    mpesaNumber: "+254 722 884 110",
    notes: "Reliable; 4 trucks; Mombasa-based",
    createdAt: "2026-01-12T08:00:00Z",
  },
  {
    id: "sub-002",
    name: "Hassan Transport Co.",
    contactPerson: "Hassan Omar",
    phone: "+254 711 552 030",
    kraPin: "P051889440D",
    mpesaNumber: "+254 711 552 030",
    notes: "Specialises in cross-border DRC routes",
    createdAt: "2026-02-03T08:00:00Z",
  },
  {
    id: "sub-003",
    name: "Uganda Express Haulage",
    contactPerson: "Robert Mbeki",
    phone: "+256 701 224 008",
    email: "robert@ugexpress.co.ug",
    notes: "Cross-border partner for Kampala leg",
    createdAt: "2026-03-22T08:00:00Z",
  },
];

// Seed trucks — mix of company-owned and subcontractor
const truckSeed: Truck[] = [
  {
    id: "trk-001",
    registration: "KCB 421R",
    ownerType: "company_owned",
    make: "Mercedes-Benz",
    model: "Actros 2545",
    year: 2022,
    fuelType: "diesel",
    capacityTonnes: 28,
    axles: 3,
    status: "active",
    insuranceExpiry: "2026-08-15",
    ntsaInspectionExpiry: "2026-11-04",
    comesaPermitExpiry: "2026-06-20",
    // Tanker spec (Fuel-only TMS — F-3 seed)
    tankCapacityLitres: 40_000,
    compartmentCount: 5,
    permittedProducts: ["AGO", "PMS"],
    lastCalibrationDate: "2024-06-01",
    calibrationDueDate: "2026-06-02",         // warning band (~21d)
    petroleumLiabilityExpiry: "2026-05-30",   // warning band (~18d)
    epraTransitLicenceExpiry: "2027-01-15",
    createdAt: "2026-01-04T08:00:00Z",
  },
  {
    id: "trk-002",
    registration: "KDA 117K",
    ownerType: "company_owned",
    make: "Scania",
    model: "R 450",
    year: 2023,
    fuelType: "diesel",
    capacityTonnes: 30,
    axles: 3,
    status: "active",
    insuranceExpiry: "2026-12-30",
    ntsaInspectionExpiry: "2026-09-12",
    comesaPermitExpiry: "2026-05-25",
    tankCapacityLitres: 42_000,
    compartmentCount: 6,
    permittedProducts: ["AGO"],
    lastCalibrationDate: "2025-02-20",
    calibrationDueDate: "2027-02-20",
    petroleumLiabilityExpiry: "2026-05-19",   // critical (~7d)
    epraTransitLicenceExpiry: "2027-04-30",
    createdAt: "2026-01-05T08:00:00Z",
  },
  {
    id: "trk-003",
    registration: "KBW 882P",
    ownerType: "company_owned",
    make: "Volvo",
    model: "FH16",
    year: 2021,
    fuelType: "diesel",
    capacityTonnes: 32,
    axles: 3,
    status: "in_workshop",
    insuranceExpiry: "2026-05-22",
    ntsaInspectionExpiry: "2026-07-30",
    comesaPermitExpiry: "2026-04-18",
    notes: "Engine overhaul in progress",
    createdAt: "2026-01-08T08:00:00Z",
  },
  {
    id: "trk-004",
    registration: "KCT 559M",
    ownerType: "subcontractor",
    subcontractorId: "sub-001",
    make: "Mercedes-Benz",
    model: "Actros 2641",
    year: 2020,
    fuelType: "diesel",
    capacityTonnes: 28,
    axles: 3,
    status: "active",
    insuranceExpiry: "2026-09-10",
    ntsaInspectionExpiry: "2026-10-22",
    comesaPermitExpiry: "2026-07-14",
    createdAt: "2026-02-15T08:00:00Z",
  },
  {
    id: "trk-005",
    registration: "KDD 304L",
    ownerType: "subcontractor",
    subcontractorId: "sub-001",
    make: "MAN",
    model: "TGS 33.480",
    year: 2019,
    fuelType: "diesel",
    capacityTonnes: 30,
    axles: 3,
    status: "active",
    insuranceExpiry: "2026-06-08",
    createdAt: "2026-02-15T08:00:00Z",
  },
  {
    id: "trk-006",
    registration: "KCC 209N",
    ownerType: "company_owned",
    make: "Isuzu",
    model: "FVZ 34",
    year: 2024,
    fuelType: "diesel",
    capacityTonnes: 18,
    axles: 3,
    status: "active",
    insuranceExpiry: "2026-12-01",
    ntsaInspectionExpiry: "2026-11-15",
    comesaPermitExpiry: "2026-07-30",
    createdAt: "2026-03-02T08:00:00Z",
  },
  {
    id: "trk-007",
    registration: "KDB 612J",
    ownerType: "subcontractor",
    subcontractorId: "sub-002",
    make: "Scania",
    model: "G 410",
    year: 2018,
    fuelType: "diesel",
    capacityTonnes: 28,
    axles: 3,
    status: "idle",
    insuranceExpiry: "2026-04-30",
    notes: "Idle since 2026-04-12 — awaiting next assignment",
    createdAt: "2026-02-20T08:00:00Z",
  },
];

// Module-level state (persists across requests in same process)
const trucks = new Map<string, Truck>(
  DEMO_DATA ? truckSeed.map((t) => [t.id, t]) : [],
);
const subcontractors = new Map<string, Subcontractor>(
  DEMO_DATA ? subcontractorSeed.map((s) => [s.id, s]) : [],
);

// ============================================================
// Trucks
// ============================================================
export function listTrucks(): Truck[] {
  return [...trucks.values()].sort((a, b) =>
    a.registration.localeCompare(b.registration),
  );
}

export function getTruck(id: string): Truck | undefined {
  return trucks.get(id);
}

export function getTruckByRegistration(registration: string): Truck | undefined {
  const norm = registration.replace(/\s+/g, "").toUpperCase();
  for (const t of trucks.values()) {
    if (t.registration.replace(/\s+/g, "").toUpperCase() === norm) return t;
  }
  return undefined;
}

export function createTruck(input: Omit<Truck, "id" | "createdAt">): Truck {
  const truck: Truck = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  trucks.set(truck.id, truck);
  return truck;
}

export function updateTruck(id: string, patch: Partial<Truck>): Truck | undefined {
  const existing = trucks.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, id: existing.id };
  trucks.set(id, updated);
  return updated;
}

export function deleteTruck(id: string): boolean {
  return trucks.delete(id);
}

// ============================================================
// Subcontractors
// ============================================================
export function listSubcontractors(): Subcontractor[] {
  return [...subcontractors.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getSubcontractor(id: string): Subcontractor | undefined {
  return subcontractors.get(id);
}

export function createSubcontractor(
  input: Omit<Subcontractor, "id" | "createdAt">,
): Subcontractor {
  const sub: Subcontractor = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  subcontractors.set(sub.id, sub);
  return sub;
}

export function updateSubcontractor(
  id: string,
  patch: Partial<Subcontractor>,
): Subcontractor | undefined {
  const existing = subcontractors.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, id: existing.id };
  subcontractors.set(id, updated);
  return updated;
}

export function trucksForSubcontractor(subcontractorId: string): Truck[] {
  return listTrucks().filter((t) => t.subcontractorId === subcontractorId);
}

// ============================================================
// Trailers
// ============================================================
const trailerSeed: Trailer[] = [
  {
    id: "trl-001",
    registration: "ZB 1180T",
    ownerType: "company_owned",
    type: "flatbed",
    capacityTonnes: 30,
    axles: 3,
    year: 2021,
    status: "active",
    attachedTruckId: "trk-001",
    insuranceExpiry: "2026-08-15",
    ntsaInspectionExpiry: "2026-10-04",
    createdAt: "2026-01-04T08:00:00Z",
  },
  {
    id: "trl-002",
    registration: "ZA 4422P",
    ownerType: "company_owned",
    type: "container_skeleton",
    capacityTonnes: 32,
    axles: 3,
    year: 2022,
    status: "active",
    attachedTruckId: "trk-002",
    insuranceExpiry: "2026-12-30",
    createdAt: "2026-01-05T08:00:00Z",
  },
  {
    id: "trl-003",
    registration: "ZA 8870K",
    ownerType: "company_owned",
    type: "tanker",
    capacityTonnes: 36,
    axles: 3,
    year: 2020,
    status: "in_workshop",
    insuranceExpiry: "2026-05-22",
    notes: "Hose replacement scheduled",
    createdAt: "2026-01-08T08:00:00Z",
  },
  {
    id: "trl-004",
    registration: "ZB 3340N",
    ownerType: "subcontractor",
    subcontractorId: "sub-001",
    type: "curtain_side",
    capacityTonnes: 28,
    axles: 3,
    year: 2019,
    status: "active",
    attachedTruckId: "trk-004",
    insuranceExpiry: "2026-09-10",
    createdAt: "2026-02-15T08:00:00Z",
  },
  {
    id: "trl-005",
    registration: "ZA 0019M",
    ownerType: "company_owned",
    type: "low_loader",
    capacityTonnes: 60,
    axles: 4,
    year: 2023,
    status: "idle",
    insuranceExpiry: "2026-11-20",
    createdAt: "2026-03-02T08:00:00Z",
  },
];

const trailers = new Map<string, Trailer>(
  DEMO_DATA ? trailerSeed.map((t) => [t.id, t]) : [],
);

export function listTrailers(): Trailer[] {
  return [...trailers.values()].sort((a, b) =>
    a.registration.localeCompare(b.registration),
  );
}
export function getTrailer(id: string): Trailer | undefined {
  return trailers.get(id);
}
export function createTrailer(input: Omit<Trailer, "id" | "createdAt">): Trailer {
  const trailer: Trailer = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  trailers.set(trailer.id, trailer);
  return trailer;
}
export function updateTrailer(id: string, patch: Partial<Trailer>): Trailer | undefined {
  const existing = trailers.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, id: existing.id };
  trailers.set(id, updated);
  return updated;
}
export function deleteTrailer(id: string): boolean {
  return trailers.delete(id);
}
export function trailerForTruck(truckId: string): Trailer | undefined {
  return [...trailers.values()].find((t) => t.attachedTruckId === truckId);
}

// ============================================================
// Drivers
// ============================================================
const driverSeed: Driver[] = [
  {
    id: "drv-001",
    fullName: "Joseph Mwangi",
    phone: "+254 722 410 220",
    nationalId: "21884401",
    status: "active",
    licenceClass: "CE",
    licenceNumber: "DL/CE/0009212",
    licenceExpiry: "2027-06-12",
    medicalExpiry: "2026-08-01",
    passportNumber: "A8849921",
    passportExpiry: "2029-04-15",
    comesaDriverPermitExpiry: "2026-11-30",
    defaultTruckId: "trk-001",
    hireDate: "2019-03-15",
    createdAt: "2019-03-15T08:00:00Z",
  },
  {
    id: "drv-002",
    fullName: "Ali Hassan",
    phone: "+254 711 552 308",
    nationalId: "29104412",
    status: "active",
    licenceClass: "CE",
    licenceNumber: "DL/CE/0011008",
    licenceExpiry: "2026-05-22",
    medicalExpiry: "2026-06-15",
    passportNumber: "B1182240",
    passportExpiry: "2028-09-04",
    comesaDriverPermitExpiry: "2026-08-22",
    defaultTruckId: "trk-002",
    hireDate: "2020-08-01",
    createdAt: "2020-08-01T08:00:00Z",
  },
  {
    id: "drv-003",
    fullName: "Daniel Otieno",
    phone: "+254 733 880 102",
    nationalId: "31226601",
    status: "active",
    licenceClass: "CE",
    licenceNumber: "DL/CE/0013884",
    licenceExpiry: "2027-12-04",
    medicalExpiry: "2026-09-10",
    passportNumber: "B4421008",
    passportExpiry: "2030-02-22",
    comesaDriverPermitExpiry: "2027-01-20",
    defaultTruckId: "trk-003",
    hireDate: "2021-04-12",
    createdAt: "2021-04-12T08:00:00Z",
  },
  {
    id: "drv-004",
    fullName: "Mwangi Kariuki",
    phone: "+254 720 991 002",
    nationalId: "27442100",
    status: "on_trip",
    licenceClass: "CE",
    licenceNumber: "DL/CE/0010104",
    licenceExpiry: "2026-04-30",
    medicalExpiry: "2026-04-12",
    passportExpiry: "2027-11-08",
    comesaDriverPermitExpiry: "2026-04-25",
    defaultTruckId: "trk-006",
    hireDate: "2018-11-02",
    notes: "Multiple expiries due — flag for renewal",
    createdAt: "2018-11-02T08:00:00Z",
  },
  {
    id: "drv-005",
    fullName: "Patrick Wafula",
    phone: "+254 712 442 880",
    nationalId: "30880411",
    status: "active",
    licenceClass: "CE",
    licenceNumber: "DL/CE/0014490",
    licenceExpiry: "2027-08-15",
    medicalExpiry: "2026-12-04",
    passportNumber: "B6612200",
    passportExpiry: "2031-03-18",
    comesaDriverPermitExpiry: "2027-04-10",
    hireDate: "2022-02-08",
    createdAt: "2022-02-08T08:00:00Z",
  },
  {
    id: "drv-006",
    fullName: "Stephen Njoroge",
    phone: "+254 718 102 300",
    nationalId: "32661108",
    status: "active",
    licenceClass: "CD",
    licenceNumber: "DL/CD/0015220",
    licenceExpiry: "2027-04-08",
    medicalExpiry: "2026-10-22",
    hireDate: "2023-01-14",
    createdAt: "2023-01-14T08:00:00Z",
  },
  {
    id: "drv-007",
    fullName: "Hassan Omar",
    phone: "+254 715 880 044",
    nationalId: "28442109",
    status: "on_leave",
    licenceClass: "CE",
    licenceNumber: "DL/CE/0009990",
    licenceExpiry: "2026-09-15",
    medicalExpiry: "2026-07-30",
    hireDate: "2020-05-22",
    notes: "On annual leave until 2026-05-22",
    createdAt: "2020-05-22T08:00:00Z",
  },
];

const drivers = new Map<string, Driver>(
  DEMO_DATA ? driverSeed.map((d) => [d.id, d]) : [],
);

export function listDrivers(): Driver[] {
  return [...drivers.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
}
export function getDriver(id: string): Driver | undefined {
  return drivers.get(id);
}
export function createDriver(input: Omit<Driver, "id" | "createdAt">): Driver {
  const d: Driver = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  drivers.set(d.id, d);
  return d;
}
export function updateDriver(id: string, patch: Partial<Driver>): Driver | undefined {
  const existing = drivers.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, id: existing.id };
  drivers.set(id, updated);
  return updated;
}
export function driverForTruck(truckId: string): Driver | undefined {
  return [...drivers.values()].find((d) => d.defaultTruckId === truckId);
}

// ============================================================
// Suppliers
// ============================================================
const supplierSeed: Supplier[] = [
  {
    id: "sup-001",
    name: "Bandari Motors Spares",
    contactPerson: "Ravi Patel",
    phone: "+254 722 110 880",
    email: "sales@bandarispares.co.ke",
    kraPin: "P051889411X",
    paymentTerms: "net_30",
    defaultPaymentMethod: "bank",
    bankName: "Equity Bank",
    bankAccount: "0123456789",
    defaultExpenseCategory: "Spare Parts & Consumables",
    notes: "Primary spares supplier — Mombasa Road",
    createdAt: "2024-01-08T08:00:00Z",
  },
  {
    id: "sup-002",
    name: "Roadtrek Tyres Ltd",
    contactPerson: "Mary Wanjiru",
    phone: "+254 711 442 008",
    email: "orders@roadtrek.co.ke",
    kraPin: "P051234980A",
    paymentTerms: "net_14",
    defaultPaymentMethod: "bank",
    defaultExpenseCategory: "Tyres — Purchases",
    createdAt: "2024-02-22T08:00:00Z",
  },
  {
    id: "sup-003",
    name: "Vivo Energy Kenya",
    contactPerson: "Fleet Account Manager",
    phone: "+254 709 440 000",
    email: "fleet@vivoenergy.co.ke",
    kraPin: "P051000404M",
    paymentTerms: "net_30",
    defaultPaymentMethod: "bank",
    defaultExpenseCategory: "Fuel",
    notes: "Fuel card account — diesel only",
    createdAt: "2024-03-10T08:00:00Z",
  },
  {
    id: "sup-004",
    name: "Mwiki Workshop Services",
    contactPerson: "Joseph Kamau",
    phone: "+254 720 884 110",
    paymentTerms: "cash_on_delivery",
    defaultPaymentMethod: "mpesa",
    mpesaNumber: "+254 720 884 110",
    defaultExpenseCategory: "Vehicle Repairs & Maintenance",
    notes: "Mechanical repairs subcontracted on overflow",
    createdAt: "2024-04-18T08:00:00Z",
  },
  {
    id: "sup-005",
    name: "Tropical Lubricants Ltd",
    contactPerson: "James Otieno",
    phone: "+254 715 220 008",
    email: "ja@tropicallubes.co.ke",
    paymentTerms: "net_30",
    defaultPaymentMethod: "bank",
    defaultExpenseCategory: "Lubricants & Oils",
    createdAt: "2024-05-08T08:00:00Z",
  },
];

const suppliers = new Map<string, Supplier>(
  DEMO_DATA ? supplierSeed.map((s) => [s.id, s]) : [],
);

export function listSuppliers(): Supplier[] {
  return [...suppliers.values()].sort((a, b) => a.name.localeCompare(b.name));
}
export function getSupplier(id: string): Supplier | undefined {
  return suppliers.get(id);
}
export function createSupplier(input: Omit<Supplier, "id" | "createdAt">): Supplier {
  const s: Supplier = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  suppliers.set(s.id, s);
  return s;
}
export function updateSupplier(id: string, patch: Partial<Supplier>): Supplier | undefined {
  const existing = suppliers.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, id: existing.id };
  suppliers.set(id, updated);
  return updated;
}

// ============================================================
// Job Cards (Workshop)
// ============================================================
const jobCards = new Map<string, JobCard>();
const jobCardServices = new Map<string, JobCardService>();
const jobCardSpares = new Map<string, JobCardSpare>();
let jobCardCounter = 1;

function nextJobCardNumber(): string {
  const year = new Date().getFullYear();
  const num = String(jobCardCounter++).padStart(3, "0");
  return `JC-${year}-${num}`;
}

function recomputeTotals(jobCardId: string) {
  const jc = jobCards.get(jobCardId);
  if (!jc) return;
  const labor = [...jobCardServices.values()]
    .filter((s) => s.jobCardId === jobCardId)
    .reduce((sum, s) => sum + s.costKes, 0);
  const sparesTotal = [...jobCardSpares.values()]
    .filter((s) => s.jobCardId === jobCardId)
    .reduce((sum, s) => sum + s.totalCostKes, 0);
  jobCards.set(jobCardId, {
    ...jc,
    laborTotalKes: labor,
    sparesTotalKes: sparesTotal,
    totalKes: labor + sparesTotal,
  });
}

// Seed: one open job card on KBW 882P (which is in_workshop), one completed on KCT 559M
function seedJobCards() {
  const jc1Id = "jc-001";
  const jc1: JobCard = {
    id: jc1Id,
    number: "JC-2026-001",
    truckId: "trk-003", // KBW 882P
    status: "in_progress",
    mechanicName: "Joseph Kamau",
    openingOdometer: 412_880,
    mechanicAnalysis:
      "Complete engine overhaul. Cylinder head removed; pistons + rings replaced. Awaiting injectors from Bandari Motors.",
    openedAt: "2026-04-12T08:00:00Z",
    laborTotalKes: 0,
    sparesTotalKes: 0,
    totalKes: 0,
  };
  jobCards.set(jc1Id, jc1);

  // Services on jc1
  [
    {
      description: "Engine teardown and inspection",
      hours: 8,
      costKes: 12_000,
      performedAt: "2026-04-12T16:00:00Z",
    },
    {
      description: "Cylinder head reconditioning",
      hours: 6,
      costKes: 18_000,
      performedAt: "2026-04-15T17:00:00Z",
    },
    {
      description: "Piston + ring replacement",
      hours: 5,
      costKes: 10_000,
      performedAt: "2026-04-18T15:00:00Z",
    },
  ].forEach((s) => {
    const id = `jcs-${randomUUID().slice(0, 8)}`;
    jobCardServices.set(id, { id, jobCardId: jc1Id, ...s });
  });

  // Spares on jc1
  [
    {
      description: "Piston rings — set",
      quantity: 6,
      unitCostKes: 4500,
      supplierId: "sup-001",
      consumedAt: "2026-04-15T10:00:00Z",
    },
    {
      description: "Head gasket — Mercedes Actros",
      quantity: 1,
      unitCostKes: 22_000,
      supplierId: "sup-001",
      consumedAt: "2026-04-15T12:00:00Z",
    },
    {
      description: "Engine oil — 15W-40, 20L drum",
      quantity: 2,
      unitCostKes: 9800,
      supplierId: "sup-005",
      consumedAt: "2026-04-18T09:00:00Z",
    },
  ].forEach((s) => {
    const id = `jcp-${randomUUID().slice(0, 8)}`;
    jobCardSpares.set(id, {
      id,
      jobCardId: jc1Id,
      ...s,
      totalCostKes: s.quantity * s.unitCostKes,
      posted: true,
      postedAt: s.consumedAt,
    });
  });
  recomputeTotals(jc1Id);

  // Completed job card
  const jc2Id = "jc-002";
  const jc2: JobCard = {
    id: jc2Id,
    number: "JC-2026-002",
    truckId: "trk-004", // KCT 559M
    status: "completed",
    mechanicName: "Stanley Mutua",
    openingOdometer: 281_440,
    closingOdometer: 281_452,
    mechanicAnalysis:
      "Routine 30,000km service: oil + filters, brake pad inspection.",
    notes: "All within manufacturer tolerances. Next service at 311,000km.",
    openedAt: "2026-04-22T08:00:00Z",
    closedAt: "2026-04-22T17:00:00Z",
    laborTotalKes: 0,
    sparesTotalKes: 0,
    totalKes: 0,
  };
  jobCards.set(jc2Id, jc2);

  [
    {
      description: "Routine service inspection",
      hours: 3,
      costKes: 6000,
      performedAt: "2026-04-22T13:00:00Z",
    },
    {
      description: "Oil & filter change",
      hours: 1.5,
      costKes: 3000,
      performedAt: "2026-04-22T15:00:00Z",
    },
  ].forEach((s) => {
    const id = `jcs-${randomUUID().slice(0, 8)}`;
    jobCardServices.set(id, { id, jobCardId: jc2Id, ...s });
  });

  [
    {
      description: "Engine oil — 15W-40, 20L",
      quantity: 1,
      unitCostKes: 9800,
      supplierId: "sup-005",
      consumedAt: "2026-04-22T15:00:00Z",
    },
    {
      description: "Oil filter — Actros",
      quantity: 1,
      unitCostKes: 1800,
      supplierId: "sup-001",
      consumedAt: "2026-04-22T15:00:00Z",
    },
    {
      description: "Air filter element",
      quantity: 1,
      unitCostKes: 2400,
      supplierId: "sup-001",
      consumedAt: "2026-04-22T15:00:00Z",
    },
  ].forEach((s) => {
    const id = `jcp-${randomUUID().slice(0, 8)}`;
    jobCardSpares.set(id, {
      id,
      jobCardId: jc2Id,
      ...s,
      totalCostKes: s.quantity * s.unitCostKes,
      posted: true,
      postedAt: s.consumedAt,
    });
  });
  recomputeTotals(jc2Id);

  // Awaiting parts
  const jc3Id = "jc-003";
  const jc3: JobCard = {
    id: jc3Id,
    number: "JC-2026-003",
    truckId: "trk-007", // KDB 612J
    status: "awaiting_parts",
    mechanicName: "Mwiki Workshop Services",
    openingOdometer: 522_110,
    mechanicAnalysis:
      "Front-axle bearing failure. Awaiting OEM bearing kit from Roadtrek.",
    openedAt: "2026-04-29T08:00:00Z",
    laborTotalKes: 0,
    sparesTotalKes: 0,
    totalKes: 0,
  };
  jobCards.set(jc3Id, jc3);
  [
    {
      description: "Front-axle inspection + diagnostic",
      hours: 4,
      costKes: 7000,
      performedAt: "2026-04-29T15:00:00Z",
    },
  ].forEach((s) => {
    const id = `jcs-${randomUUID().slice(0, 8)}`;
    jobCardServices.set(id, { id, jobCardId: jc3Id, ...s });
  });
  recomputeTotals(jc3Id);

  jobCardCounter = 4;
}
if (DEMO_DATA) seedJobCards();

export function listJobCards(filterStatus?: JobCardStatus): JobCard[] {
  const all = [...jobCards.values()].sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
  );
  return filterStatus ? all.filter((j) => j.status === filterStatus) : all;
}

export function getJobCard(id: string): JobCardDetail | undefined {
  const jc = jobCards.get(id);
  if (!jc) return undefined;
  const services = [...jobCardServices.values()]
    .filter((s) => s.jobCardId === id)
    .sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime());
  const spares = [...jobCardSpares.values()]
    .filter((s) => s.jobCardId === id)
    .sort((a, b) => new Date(a.consumedAt).getTime() - new Date(b.consumedAt).getTime());
  return { ...jc, services, spares };
}

export function jobCardsForTruck(truckId: string): JobCard[] {
  return [...jobCards.values()]
    .filter((j) => j.truckId === truckId)
    .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
}

export function createJobCard(input: {
  truckId: string;
  mechanicName: string;
  openingOdometer?: number;
  mechanicAnalysis?: string;
}): JobCard {
  const id = randomUUID();
  const jc: JobCard = {
    id,
    number: nextJobCardNumber(),
    truckId: input.truckId,
    status: "open",
    mechanicName: input.mechanicName,
    openingOdometer: input.openingOdometer,
    mechanicAnalysis: input.mechanicAnalysis ?? "",
    openedAt: new Date().toISOString(),
    laborTotalKes: 0,
    sparesTotalKes: 0,
    totalKes: 0,
  };
  jobCards.set(id, jc);
  // Move truck into workshop status
  const truck = trucks.get(input.truckId);
  if (truck) trucks.set(truck.id, { ...truck, status: "in_workshop" });
  return jc;
}

export function updateJobCardAnalysis(id: string, analysis: string): JobCard | undefined {
  const jc = jobCards.get(id);
  if (!jc) return undefined;
  const updated = { ...jc, mechanicAnalysis: analysis };
  jobCards.set(id, updated);
  return updated;
}

export function setJobCardStatus(id: string, status: JobCardStatus): JobCard | undefined {
  const jc = jobCards.get(id);
  if (!jc) return undefined;
  const updated = { ...jc, status };
  jobCards.set(id, updated);
  return updated;
}

export function addJobCardService(input: {
  jobCardId: string;
  description: string;
  hours: number;
  costKes: number;
}): JobCardService {
  const id = randomUUID();
  const svc: JobCardService = {
    id,
    jobCardId: input.jobCardId,
    description: input.description,
    hours: input.hours,
    costKes: input.costKes,
    performedAt: new Date().toISOString(),
  };
  jobCardServices.set(id, svc);
  // Auto-progress status
  const jc = jobCards.get(input.jobCardId);
  if (jc && jc.status === "open") {
    jobCards.set(jc.id, { ...jc, status: "in_progress" });
  }
  recomputeTotals(input.jobCardId);
  return svc;
}

export function removeJobCardService(serviceId: string): boolean {
  const svc = jobCardServices.get(serviceId);
  if (!svc) return false;
  jobCardServices.delete(serviceId);
  recomputeTotals(svc.jobCardId);
  return true;
}

export function addJobCardSpare(input: {
  jobCardId: string;
  description: string;
  quantity: number;
  unitCostKes: number;
  supplierId?: string;
}): JobCardSpare {
  const id = randomUUID();
  const spare: JobCardSpare = {
    id,
    jobCardId: input.jobCardId,
    description: input.description,
    quantity: input.quantity,
    unitCostKes: input.unitCostKes,
    totalCostKes: input.quantity * input.unitCostKes,
    supplierId: input.supplierId,
    consumedAt: new Date().toISOString(),
    // Phase 5: actual AP bill is created by a posting service; for now we tag posted=true
    posted: true,
    postedAt: new Date().toISOString(),
  };
  jobCardSpares.set(id, spare);
  // Auto-progress status
  const jc = jobCards.get(input.jobCardId);
  if (jc && jc.status === "open") {
    jobCards.set(jc.id, { ...jc, status: "in_progress" });
  }
  recomputeTotals(input.jobCardId);
  return spare;
}

export function removeJobCardSpare(spareId: string): boolean {
  const spare = jobCardSpares.get(spareId);
  if (!spare) return false;
  jobCardSpares.delete(spareId);
  recomputeTotals(spare.jobCardId);
  return true;
}

export function closeJobCard(input: {
  jobCardId: string;
  closingOdometer?: number;
  notes?: string;
}): JobCard | undefined {
  const jc = jobCards.get(input.jobCardId);
  if (!jc) return undefined;
  const updated: JobCard = {
    ...jc,
    status: "completed",
    closedAt: new Date().toISOString(),
    closingOdometer: input.closingOdometer,
    notes: input.notes ?? jc.notes,
  };
  jobCards.set(jc.id, updated);
  // If no other in_workshop job cards on this truck, return truck to active
  const stillInShop = [...jobCards.values()].some(
    (j) =>
      j.truckId === jc.truckId &&
      j.id !== jc.id &&
      (j.status === "open" || j.status === "in_progress" || j.status === "awaiting_parts"),
  );
  if (!stillInShop) {
    const truck = trucks.get(jc.truckId);
    if (truck && truck.status === "in_workshop") {
      trucks.set(truck.id, { ...truck, status: "active" });
    }
  }
  return updated;
}

// ============================================================
// Customers (export shippers)
// ============================================================
const customerSeed: Customer[] = [
  {
    id: "cus-001",
    name: "Saharan Trading Co.",
    contactPerson: "Yusuf Adan",
    phone: "+254 711 220 008",
    email: "ops@saharantrading.com",
    kraPin: "P051441002A",
    billingAddress: "Sameer Park, Mombasa Road, Nairobi",
    billingCurrency: "USD",
    paymentTermsDays: 30,
    notes: "Bulk shipper Mombasa → Juba; pays in USD; 30-day credit",
    createdAt: "2024-08-15T08:00:00Z",
  },
  {
    id: "cus-002",
    name: "Pearl of Africa Coffee",
    contactPerson: "Hellen Nakato",
    phone: "+256 701 884 110",
    email: "logistics@pearlcoffee.ug",
    billingAddress: "Industrial Area, Kampala",
    billingCurrency: "USD",
    paymentTermsDays: 45,
    notes: "Mombasa → Kampala return loads of coffee for export",
    createdAt: "2025-01-22T08:00:00Z",
  },
  {
    id: "cus-003",
    name: "Kivu Mining Logistics",
    contactPerson: "Patrick Mukamba",
    phone: "+243 821 552 088",
    email: "ops@kivumining.cd",
    billingCurrency: "USD",
    paymentTermsDays: 30,
    notes: "Heavy mining equipment to Goma — quarterly volumes",
    createdAt: "2025-03-10T08:00:00Z",
  },
  {
    id: "cus-004",
    name: "Karuturi Agro Exports",
    contactPerson: "Ravi Karuturi",
    phone: "+254 722 990 102",
    email: "shipping@karuturi.com",
    billingCurrency: "KES",
    paymentTermsDays: 14,
    notes: "Domestic + export Mombasa shipments; mostly per-tonne",
    createdAt: "2025-05-04T08:00:00Z",
  },
  {
    id: "cus-005",
    name: "Rwanda Beverages Ltd",
    contactPerson: "Jean-Claude Habimana",
    phone: "+250 788 442 110",
    email: "logistics@rwandabev.rw",
    billingCurrency: "USD",
    paymentTermsDays: 30,
    notes: "Mombasa → Kigali — bottled goods on container chassis",
    createdAt: "2025-09-18T08:00:00Z",
  },
];

const customers = new Map<string, Customer>(
  DEMO_DATA ? customerSeed.map((c) => [c.id, c]) : [],
);

export function listCustomers(): Customer[] {
  return [...customers.values()].sort((a, b) => a.name.localeCompare(b.name));
}
export function getCustomer(id: string): Customer | undefined {
  return customers.get(id);
}
export function createCustomer(input: Omit<Customer, "id" | "createdAt">): Customer {
  const c: Customer = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  customers.set(c.id, c);
  return c;
}
export function updateCustomer(id: string, patch: Partial<Customer>): Customer | undefined {
  const existing = customers.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, id: existing.id };
  customers.set(id, updated);
  return updated;
}

// ============================================================
// Rate table
// ============================================================
const rateSeed: Rate[] = [
  // Default routes (no customer override)
  { id: "rate-001", origin: "Mombasa", destination: "Kampala", basis: "per_m3", amount: 95,    currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-002", origin: "Mombasa", destination: "Kigali",  basis: "per_m3", amount: 145,   currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-003", origin: "Mombasa", destination: "Goma",    basis: "per_m3", amount: 195,   currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-004", origin: "Mombasa", destination: "Bujumbura", basis: "per_m3", amount: 175, currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-005", origin: "Nairobi", destination: "Juba",    basis: "per_m3", amount: 220,   currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-006", origin: "Nairobi", destination: "Dar es Salaam", basis: "per_m3", amount: 75, currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-007", origin: "Mombasa", destination: "Mwanza",  basis: "per_m3", amount: 85,    currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-008", origin: "Mombasa", destination: "Nairobi", basis: "per_m3", amount: 18,    currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  // Customer-specific override (Pearl of Africa Coffee gets a discounted Mombasa→Kampala)
  { id: "rate-009", origin: "Mombasa", destination: "Kampala", customerId: "cus-002", basis: "per_m3", amount: 88, currency: "USD", notes: "Volume agreement", createdAt: "2025-02-15T08:00:00Z" },
  // Container-class
  { id: "rate-010", origin: "Mombasa", destination: "Kigali",  cargoClass: "containerised", basis: "per_m3", amount: 3200, currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
];

const rates = new Map<string, Rate>(
  DEMO_DATA ? rateSeed.map((r) => [r.id, r]) : [],
);

export function listRates(): Rate[] {
  return [...rates.values()].sort((a, b) => {
    const ra = `${a.origin}>${a.destination}`;
    const rb = `${b.origin}>${b.destination}`;
    if (ra !== rb) return ra.localeCompare(rb);
    // Customer-specific first
    return (a.customerId ? 0 : 1) - (b.customerId ? 0 : 1);
  });
}
export function getRate(id: string): Rate | undefined {
  return rates.get(id);
}
export function createRate(input: Omit<Rate, "id" | "createdAt">): Rate {
  const r: Rate = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  rates.set(r.id, r);
  return r;
}
/**
 * Look up the best rate for a (origin, destination, customerId, cargoClass) tuple.
 * Customer-specific overrides win, then cargo-class matches, then defaults.
 */
export function lookupRate(args: {
  origin: string;
  destination: string;
  customerId?: string;
  cargoClass?: string;
}): Rate | undefined {
  const matches = listRates().filter(
    (r) => r.origin.toLowerCase() === args.origin.toLowerCase() && r.destination.toLowerCase() === args.destination.toLowerCase(),
  );
  // 1. Customer-specific match
  const cust = matches.find((r) => r.customerId === args.customerId);
  if (cust) return cust;
  // 2. Cargo-class match (default)
  if (args.cargoClass) {
    const cls = matches.find((r) => !r.customerId && r.cargoClass === args.cargoClass);
    if (cls) return cls;
  }
  // 3. Default fallback
  return matches.find((r) => !r.customerId && !r.cargoClass);
}

// ============================================================
// Bookings
// ============================================================
let bookingCounter = 1;
function nextBookingNumber(): string {
  const year = new Date().getFullYear();
  const num = String(bookingCounter++).padStart(4, "0");
  return `BK-${year}-${num}`;
}

const bookings = new Map<string, Booking>();

function seedBookings() {
  const seeds: Omit<Booking, "id" | "createdAt">[] = [
    {
      number: "BK-2026-0001",
      customerId: "cus-002",
      origin: "Mombasa",
      destination: "Kampala",
      cargoType: "Coffee beans (bagged)",
      cargoQuantity: 28,
      cargoUnit: "tonnes",
      requestedDate: "2026-05-12",
      agreedAmount: 88,
      agreedBasis: "per_m3",
      agreedCurrency: "USD",
      status: "planned",
      notes: "Load at Mombasa container freight station",
    },
    {
      number: "BK-2026-0002",
      customerId: "cus-001",
      origin: "Nairobi",
      destination: "Juba",
      cargoType: "General cargo (palletised)",
      cargoQuantity: 26,
      cargoUnit: "tonnes",
      requestedDate: "2026-05-14",
      agreedAmount: 220,
      agreedBasis: "per_m3",
      agreedCurrency: "USD",
      status: "planned",
    },
    {
      number: "BK-2026-0003",
      customerId: "cus-005",
      origin: "Mombasa",
      destination: "Kigali",
      cargoType: "Bottled beverages",
      cargoQuantity: 1,
      cargoUnit: "TEUs",
      requestedDate: "2026-05-15",
      agreedAmount: 3200,
      agreedBasis: "per_m3",
      agreedCurrency: "USD",
      status: "confirmed",
    },
    {
      number: "BK-2026-0004",
      customerId: "cus-003",
      origin: "Mombasa",
      destination: "Goma",
      cargoType: "Mining equipment (oversized)",
      cargoQuantity: 22,
      cargoUnit: "tonnes",
      requestedDate: "2026-05-22",
      agreedAmount: 240,
      agreedBasis: "per_m3",
      agreedCurrency: "USD",
      status: "draft",
      notes: "Customer to confirm dimensions before we plan",
    },
    {
      number: "BK-2026-0005",
      customerId: "cus-004",
      origin: "Mombasa",
      destination: "Nairobi",
      cargoType: "Fresh produce",
      cargoQuantity: 18,
      cargoUnit: "tonnes",
      requestedDate: "2026-05-10",
      agreedAmount: 18,
      agreedBasis: "per_m3",
      agreedCurrency: "USD",
      status: "confirmed",
    },
  ];
  seeds.forEach((s, i) => {
    const id = `bk-${String(i + 1).padStart(3, "0")}`;
    const fixedNum = s.number;
    bookings.set(id, {
      ...s,
      id,
      number: fixedNum,
      createdAt: new Date(Date.now() - (seeds.length - i) * 86400000).toISOString(),
    });
  });
  bookingCounter = seeds.length + 1;
}
if (DEMO_DATA) seedBookings();

export function listBookings(filterStatus?: BookingStatus): Booking[] {
  const all = [...bookings.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return filterStatus ? all.filter((b) => b.status === filterStatus) : all;
}
export function getBooking(id: string): Booking | undefined {
  return bookings.get(id);
}
export function bookingsForCustomer(customerId: string): Booking[] {
  return listBookings().filter((b) => b.customerId === customerId);
}
export function createBooking(input: Omit<Booking, "id" | "number" | "createdAt" | "status" | "tripId">): Booking {
  const b: Booking = {
    ...input,
    id: randomUUID(),
    number: nextBookingNumber(),
    status: "draft",
    createdAt: new Date().toISOString(),
  };
  bookings.set(b.id, b);
  return b;
}
export function updateBookingStatus(id: string, status: BookingStatus, tripId?: string): Booking | undefined {
  const existing = bookings.get(id);
  if (!existing) return undefined;
  const updated: Booking = { ...existing, status, tripId: tripId ?? existing.tripId };
  bookings.set(id, updated);
  return updated;
}

// ============================================================
// Trips
// ============================================================
let tripCounter = 1;
function nextTripNumber(): string {
  const year = new Date().getFullYear();
  const num = String(tripCounter++).padStart(4, "0");
  return `TRP-${year}-${num}`;
}

const trips = new Map<string, Trip>();

function seedTrips() {
  // Plan trips for the two 'planned' bookings
  const plannedBookings = [...bookings.values()].filter((b) => b.status === "planned");
  plannedBookings.forEach((b, i) => {
    const id = `trp-${String(i + 1).padStart(3, "0")}`;
    const truckIds = ["trk-001", "trk-002"];
    const driverIds = ["drv-001", "drv-002"];
    const trailerIds = ["trl-001", "trl-002"];
    const trip: Trip = {
      id,
      number: `TRP-2026-${String(i + 1).padStart(4, "0")}`,
      bookingId: b.id,
      truckId: truckIds[i] ?? "trk-001",
      trailerId: trailerIds[i],
      driverId: driverIds[i] ?? "drv-001",
      status: "planned",
      origin: b.origin,
      destination: b.destination,
      cargoType: b.cargoType,
      cargoQuantity: b.cargoQuantity,
      cargoUnit: b.cargoUnit,
      revenueAmount: computeFuelRevenue({
        basis: b.agreedBasis,
        amount: b.agreedAmount,
        cargoQuantityLitres: b.cargoQuantity,

      }),
      revenueCurrency: b.agreedCurrency,
      driverAdvanceKes: 35000,
      plannedDepartureDate: b.requestedDate,
      createdAt: new Date(Date.now() - (plannedBookings.length - i) * 86400000).toISOString(),
    };
    trips.set(id, trip);
    // Link booking back to trip
    const booking = bookings.get(b.id);
    if (booking) bookings.set(booking.id, { ...booking, tripId: id });
  });
  tripCounter = plannedBookings.length + 1;
}
if (DEMO_DATA) seedTrips();

/**
 * F-6 demo data — fuel loading + discharge observations on a few seeded
 * trips so the Ullage report and KES-per-loaded-litre KPI have rows to
 * render on first boot. Patches the existing planned-from-booking trips
 * in-place; the 20 °C corrections and ullage % are computed here exactly
 * as captureTripLoading/captureTripDischarge would on the live path, so
 * the data is consistent with what an operator would produce.
 */
function seedFuelObservations() {
  const cases: Array<{
    tripId: string;
    product: "PMS" | "AGO";
    loadedLitres: number;
    loadingTempC: number;
    density15C: number;
    dischargedLitres: number;
    dischargeTempC: number;
  }> = [
    // Acceptable thermal-contraction loss — within 0.5% threshold
    {
      tripId: "trp-001",
      product: "AGO",
      loadedLitres: 40_000,
      loadingTempC: 32,
      density15C: 0.840,
      dischargedLitres: 39_820,
      dischargeTempC: 25,
    },
    // Above-threshold loss — investigate
    {
      tripId: "trp-002",
      product: "PMS",
      loadedLitres: 38_500,
      loadingTempC: 30,
      density15C: 0.745,
      dischargedLitres: 38_050,
      dischargeTempC: 26,
    },
  ];

  for (const c of cases) {
    const trip = trips.get(c.tripId);
    if (!trip) continue;
    // Inline VCF: V20 = V_obs / (1 + β · (T - 20))
    const beta = c.product === "PMS" ? 0.0012 : 0.00084;
    const loaded20C = Math.round(c.loadedLitres / (1 + beta * (c.loadingTempC - 20)));
    const discharged20C = Math.round(
      c.dischargedLitres / (1 + beta * (c.dischargeTempC - 20)),
    );
    const ullagePct =
      loaded20C > 0 ? ((loaded20C - discharged20C) / loaded20C) * 100 : 0;
    trips.set(c.tripId, {
      ...trip,
      product: c.product,
      loadedLitres: c.loadedLitres,
      loadingTempC: c.loadingTempC,
      density15C: c.density15C,
      loadedLitres20C: loaded20C,
      loadingSealNumbers: "KPC 67451, 67452, 67453",
      dischargedLitres: c.dischargedLitres,
      dischargeTempC: c.dischargeTempC,
      dischargedLitres20C: discharged20C,
      dischargeSealNumbers: "KPC 67451, 67452, 67453",
      ullagePct,
    });
  }
}
if (DEMO_DATA) seedFuelObservations();

export function listTrips(filterStatus?: TripStatus): Trip[] {
  const all = [...trips.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return filterStatus ? all.filter((t) => t.status === filterStatus) : all;
}
export function getTrip(id: string): Trip | undefined {
  return trips.get(id);
}
export function tripsForTruck(truckId: string): Trip[] {
  return listTrips().filter((t) => t.truckId === truckId);
}
export function tripsForDriver(driverId: string): Trip[] {
  return listTrips().filter((t) => t.driverId === driverId);
}

/** Generic patch — used by F-4 loading/discharge capture and any future
 *  trip-edit flow that doesn't fit one of the workflow transitions. */
export function updateTrip(id: string, patch: Partial<Trip>): Trip | undefined {
  const existing = trips.get(id);
  if (!existing) return undefined;
  const updated: Trip = { ...existing, ...patch };
  trips.set(id, updated);
  return updated;
}

export function planTrip(input: {
  bookingId: string;
  truckId: string;
  trailerId?: string;
  driverId: string;
  driverAdvanceKes?: number;
  plannedDepartureDate?: string;
  plannedDeliveryDate?: string;
  notes?: string;
}): Trip | undefined {
  const booking = bookings.get(input.bookingId);
  if (!booking) return undefined;
  // Only confirmed bookings can be planned — drafts must be confirmed
  // first (the UI enforces this; this guard covers direct action calls).
  if (booking.status !== "confirmed") return undefined;

  const id = randomUUID();
  const revenue = computeFuelRevenue({
    basis: booking.agreedBasis,
    amount: booking.agreedAmount,
    cargoQuantityLitres: booking.cargoQuantity,

  });
  const trip: Trip = {
    id,
    number: nextTripNumber(),
    bookingId: input.bookingId,
    truckId: input.truckId,
    trailerId: input.trailerId,
    driverId: input.driverId,
    status: "planned",
    origin: booking.origin,
    destination: booking.destination,
    cargoType: booking.cargoType,
    cargoQuantity: booking.cargoQuantity,
    cargoUnit: booking.cargoUnit,
    revenueAmount: revenue,
    revenueCurrency: booking.agreedCurrency,
    driverAdvanceKes: input.driverAdvanceKes,
    plannedDepartureDate: input.plannedDepartureDate,
    plannedDeliveryDate: input.plannedDeliveryDate,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  trips.set(id, trip);
  // Move booking to planned with link back
  bookings.set(booking.id, { ...booking, status: "planned", tripId: id });
  // Seed initial timeline event
  const eventId = `tev-${randomUUID().slice(0, 8)}`;
  tripEvents.set(eventId, {
    id: eventId,
    tripId: id,
    fromStatus: null,
    toStatus: "planned",
    occurredAt: new Date().toISOString(),
    actorName: "Dispatcher",
    note: "Trip planned and assigned",
  });
  return trip;
}

// ============================================================
// Trip status events (timeline)
// ============================================================
const tripEvents = new Map<string, TripStatusEvent>();

// Seed initial 'planned' events for the seeded trips so timelines aren't empty
function seedTripEvents() {
  for (const t of trips.values()) {
    const id = `tev-${randomUUID().slice(0, 8)}`;
    tripEvents.set(id, {
      id,
      tripId: t.id,
      fromStatus: null,
      toStatus: "planned",
      occurredAt: t.createdAt,
      actorName: "Dispatcher",
      note: "Trip planned and assigned",
    });
  }
}
if (DEMO_DATA) seedTripEvents();

export function eventsForTrip(tripId: string): TripStatusEvent[] {
  return [...tripEvents.values()]
    .filter((e) => e.tripId === tripId)
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
}

/** State-machine validated transition. Returns updated trip or undefined if invalid. */
export function transitionTrip(input: {
  tripId: string;
  toStatus: TripStatus;
  actorName: string;
  note?: string;
  location?: string;
}): { trip: Trip; event: TripStatusEvent } | { error: string } {
  const trip = trips.get(input.tripId);
  if (!trip) return { error: "Trip not found" };
  if (isTerminal(trip.status)) {
    return { error: `Trip is ${trip.status} and cannot be changed.` };
  }
  const allowed = allowedTransitions(trip.status);
  if (!allowed.includes(input.toStatus)) {
    return {
      error: `Cannot move from ${trip.status} to ${input.toStatus}. Allowed: ${allowed.join(", ") || "(none)"}.`,
    };
  }

  const now = new Date().toISOString();

  // Compute trip patch
  const patch: Partial<Trip> = { status: input.toStatus };
  if (input.toStatus === "in_transit" && !trip.actualDepartureAt) {
    patch.actualDepartureAt = now;
  }
  if (input.toStatus === "delivered" && !trip.actualDeliveryAt) {
    patch.actualDeliveryAt = now;
  }
  if (input.toStatus === "closed" && !trip.closedAt) {
    patch.closedAt = now;
    // A trip closed via the bare status button (without going through
    // reconciliation) must still become invoiceable — otherwise the
    // invoice card stays locked forever since reconcileAndCloseTrip
    // rejects terminal trips.
    patch.readyToInvoice = true;
  }
  const updatedTrip: Trip = { ...trip, ...patch };
  trips.set(trip.id, updatedTrip);

  // Side effects on truck + driver
  applyTripStatusSideEffects(updatedTrip, input.toStatus);

  // Log the event
  const eventId = `tev-${randomUUID().slice(0, 8)}`;
  const event: TripStatusEvent = {
    id: eventId,
    tripId: trip.id,
    fromStatus: trip.status,
    toStatus: input.toStatus,
    occurredAt: now,
    actorName: input.actorName,
    note: input.note,
    location: input.location,
  };
  tripEvents.set(eventId, event);

  return { trip: updatedTrip, event };
}

/**
 * Reconcile-and-close: capture actuals, run the same close side-effects
 * as a normal status transition, mark trip ready to invoice.
 */
export function reconcileAndCloseTrip(input: {
  tripId: string;
  actualKm?: number;
  actualFuelLitres?: number;
  driverAdvanceUsedKes?: number;
  closingNotes?: string;
  actorName: string;
}): { trip: Trip; event: TripStatusEvent } | { error: string } {
  const trip = trips.get(input.tripId);
  if (!trip) return { error: "Trip not found" };
  if (isTerminal(trip.status)) {
    return { error: `Trip is ${trip.status} and cannot be reconciled.` };
  }
  if (trip.status !== "delivered") {
    return {
      error: `Reconciliation only allowed from 'delivered'. Current: ${trip.status}.`,
    };
  }
  const now = new Date().toISOString();
  const updatedTrip: Trip = {
    ...trip,
    status: "closed",
    closedAt: now,
    actualKm: input.actualKm ?? trip.actualKm,
    actualFuelLitres: input.actualFuelLitres ?? trip.actualFuelLitres,
    driverAdvanceUsedKes: input.driverAdvanceUsedKes ?? trip.driverAdvanceUsedKes,
    notes: input.closingNotes ?? trip.notes,
    readyToInvoice: true,
  };
  trips.set(trip.id, updatedTrip);
  applyTripStatusSideEffects(updatedTrip, "closed");

  const eventId = `tev-${randomUUID().slice(0, 8)}`;
  const event: TripStatusEvent = {
    id: eventId,
    tripId: trip.id,
    fromStatus: trip.status,
    toStatus: "closed",
    occurredAt: now,
    actorName: input.actorName,
    note: input.closingNotes ?? "Trip reconciled and closed",
  };
  tripEvents.set(eventId, event);
  return { trip: updatedTrip, event };
}

/** Sum cross-border charges (KES) for a trip. */
export function tripBorderCharges(tripId: string): number {
  return [...borderCrossings.values()]
    .filter((b) => b.tripId === tripId)
    .reduce((sum, b) => sum + (b.chargesKes ?? 0), 0);
}

function applyTripStatusSideEffects(trip: Trip, status: TripStatus) {
  const truck = trucks.get(trip.truckId);
  const driver = drivers.get(trip.driverId);

  if (status === "loading" || status === "in_transit" || status === "at_border" || status === "delivered") {
    // Truck busy on a trip
    if (truck && truck.status === "active") {
      trucks.set(truck.id, { ...truck, status: "in_service" });
    }
    if (driver && driver.status === "active") {
      drivers.set(driver.id, { ...driver, status: "on_trip" });
    }
  }

  if (status === "closed" || status === "cancelled") {
    // Free the truck if it was on this trip and not in workshop
    if (truck && truck.status === "in_service") {
      // Are there other open trips on this truck?
      const others = [...trips.values()].some(
        (t) =>
          t.truckId === truck.id &&
          t.id !== trip.id &&
          !isTerminal(t.status) &&
          t.status !== "planned",
      );
      if (!others) {
        trucks.set(truck.id, { ...truck, status: "active" });
      }
    }
    if (driver && driver.status === "on_trip") {
      const others = [...trips.values()].some(
        (t) =>
          t.driverId === driver.id &&
          t.id !== trip.id &&
          !isTerminal(t.status) &&
          t.status !== "planned",
      );
      if (!others) {
        drivers.set(driver.id, { ...driver, status: "active" });
      }
    }
  }
}

// ============================================================
// Trip documents (Phase 2C — Loading & Documents)
// ============================================================
const tripDocuments = new Map<string, TripDocument>();

function seedTripDocuments() {
  const docsForFirstTrip = [...trips.values()][0];
  if (!docsForFirstTrip) return;
  const tripId = docsForFirstTrip.id;
  const baseAt = new Date(docsForFirstTrip.createdAt).getTime();
  const seeds: Array<Omit<TripDocument, "id">> = [
    {
      tripId,
      kind: "manifest",
      name: "Manifest — Mombasa CFS",
      fileName: "manifest_TRP-2026-0001.pdf",
      fileSize: 142_336,
      mimeType: "application/pdf",
      status: "approved",
      uploadedBy: "Joseph Mwangi",
      uploadedAt: new Date(baseAt + 6 * 3600_000).toISOString(),
      reviewedBy: "Linet Wairimu",
      reviewedAt: new Date(baseAt + 7 * 3600_000).toISOString(),
      storageKey: "mock://demo/manifest.pdf",
    },
    {
      tripId,
      kind: "commercial_invoice",
      name: "Commercial Invoice — Pearl of Africa #INV-9920",
      fileName: "invoice_INV-9920.pdf",
      fileSize: 88_104,
      mimeType: "application/pdf",
      status: "approved",
      uploadedBy: "Joseph Mwangi",
      uploadedAt: new Date(baseAt + 6 * 3600_000).toISOString(),
      reviewedBy: "Linet Wairimu",
      reviewedAt: new Date(baseAt + 7 * 3600_000).toISOString(),
      storageKey: "mock://demo/invoice.pdf",
    },
    {
      tripId,
      kind: "weighbridge_slip",
      name: "Weighbridge — Mariakani",
      fileName: "weighbridge_mariakani.jpg",
      fileSize: 1_842_336,
      mimeType: "image/jpeg",
      status: "pending",
      uploadedBy: "Joseph Mwangi",
      uploadedAt: new Date(baseAt + 8 * 3600_000).toISOString(),
      storageKey: "mock://demo/weighbridge.jpg",
    },
    {
      tripId,
      kind: "comesa_yellow_card",
      name: "COMESA Yellow Card",
      fileName: "comesa_yellow_card.pdf",
      fileSize: 410_212,
      mimeType: "application/pdf",
      status: "approved",
      uploadedBy: "Linet Wairimu",
      uploadedAt: new Date(baseAt + 1 * 3600_000).toISOString(),
      reviewedBy: "Linet Wairimu",
      reviewedAt: new Date(baseAt + 1.5 * 3600_000).toISOString(),
      storageKey: "mock://demo/comesa.pdf",
    },
  ];
  seeds.forEach((s, i) => {
    const id = `tdoc-${String(i + 1).padStart(3, "0")}`;
    tripDocuments.set(id, { ...s, id });
  });
}
if (DEMO_DATA) seedTripDocuments();

export function listTripDocuments(tripId: string): TripDocument[] {
  return [...tripDocuments.values()]
    .filter((d) => d.tripId === tripId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export function getTripDocument(id: string): TripDocument | undefined {
  return tripDocuments.get(id);
}

export function createTripDocument(input: {
  tripId: string;
  kind: TripDocumentKind;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  notes?: string;
}): TripDocument | undefined {
  if (!trips.has(input.tripId)) return undefined;
  const id = randomUUID();
  const doc: TripDocument = {
    id,
    tripId: input.tripId,
    kind: input.kind,
    name: input.name,
    fileName: input.fileName,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    status: "pending",
    uploadedBy: input.uploadedBy,
    uploadedAt: new Date().toISOString(),
    notes: input.notes,
    storageKey: `mock://uploads/${id}/${input.fileName}`,
  };
  tripDocuments.set(id, doc);
  return doc;
}

export function reviewTripDocument(input: {
  documentId: string;
  approve: boolean;
  reason?: string;
  reviewedBy: string;
}): TripDocument | undefined {
  const doc = tripDocuments.get(input.documentId);
  if (!doc) return undefined;
  const status: TripDocumentStatus = input.approve ? "approved" : "rejected";
  const updated: TripDocument = {
    ...doc,
    status,
    reviewedBy: input.reviewedBy,
    reviewedAt: new Date().toISOString(),
    rejectionReason: input.approve ? undefined : input.reason,
  };
  tripDocuments.set(doc.id, updated);
  return updated;
}

export function deleteTripDocument(id: string): boolean {
  return tripDocuments.delete(id);
}

// ============================================================
// Border crossings (Phase 2D)
// ============================================================
const borderCrossings = new Map<string, BorderCrossing>();

function seedBorderCrossings() {
  const tripList = [...trips.values()];
  if (tripList.length === 0) return;
  // First trip: a cleared Malaba crossing (Mombasa → Kampala)
  const first = tripList[0]!;
  const baseAt = new Date(first.createdAt).getTime();
  const id1 = "bc-001";
  borderCrossings.set(id1, {
    id: id1,
    tripId: first.id,
    postName: "Malaba (KE → UG)",
    countryFrom: "KE",
    countryTo: "UG",
    status: "cleared",
    arrivedAt: new Date(baseAt + 36 * 3600_000).toISOString(),
    clearedAt: new Date(baseAt + 41 * 3600_000).toISOString(),
    axleLoadKg: 28_400,
    transitPermitNumber: "UG-TRP-2026-009912",
    chargesKes: 4_800,
    notes: "Cleared without incident; 5h queue",
    createdAt: new Date(baseAt + 36 * 3600_000).toISOString(),
  });
}
if (DEMO_DATA) seedBorderCrossings();

export function listBorderCrossings(tripId: string): BorderCrossing[] {
  return [...borderCrossings.values()]
    .filter((b) => b.tripId === tripId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function listAllActiveBorderCrossings(): BorderCrossing[] {
  return [...borderCrossings.values()].filter(
    (b) => b.status === "approaching" || b.status === "queued",
  );
}

export function getBorderCrossing(id: string): BorderCrossing | undefined {
  return borderCrossings.get(id);
}

export function createBorderCrossing(input: {
  tripId: string;
  postName: string;
  countryFrom: string;
  countryTo: string;
  status?: BorderStatus;
  arrivedAt?: string;
  axleLoadKg?: number;
  transitPermitNumber?: string;
  chargesKes?: number;
  notes?: string;
}): BorderCrossing | undefined {
  if (!trips.has(input.tripId)) return undefined;
  const id = randomUUID();
  const now = new Date().toISOString();
  const crossing: BorderCrossing = {
    id,
    tripId: input.tripId,
    postName: input.postName,
    countryFrom: input.countryFrom.toUpperCase(),
    countryTo: input.countryTo.toUpperCase(),
    status: input.status ?? "queued",
    arrivedAt: input.arrivedAt ?? now,
    axleLoadKg: input.axleLoadKg,
    transitPermitNumber: input.transitPermitNumber,
    chargesKes: input.chargesKes,
    notes: input.notes,
    createdAt: now,
  };
  borderCrossings.set(id, crossing);
  return crossing;
}

export function clearBorderCrossing(input: {
  borderId: string;
  axleLoadKg?: number;
  transitPermitNumber?: string;
  chargesKes?: number;
  notes?: string;
}): BorderCrossing | undefined {
  const existing = borderCrossings.get(input.borderId);
  if (!existing) return undefined;
  const updated: BorderCrossing = {
    ...existing,
    status: "cleared",
    clearedAt: new Date().toISOString(),
    axleLoadKg: input.axleLoadKg ?? existing.axleLoadKg,
    transitPermitNumber: input.transitPermitNumber ?? existing.transitPermitNumber,
    chargesKes: input.chargesKes ?? existing.chargesKes,
    notes: input.notes ?? existing.notes,
  };
  borderCrossings.set(existing.id, updated);
  return updated;
}

export function deleteBorderCrossing(id: string): boolean {
  return borderCrossings.delete(id);
}

// ============================================================
// Expenses (Phase 4A)
// ============================================================
const expenses = new Map<string, Expense>();
let expenseCounter = 1;
function nextExpenseNumber(): string {
  const year = new Date().getFullYear();
  const num = String(expenseCounter++).padStart(4, "0");
  return `EXP-${year}-${num}`;
}

function seedExpenses() {
  const tripList = [...trips.values()];
  if (tripList.length === 0) return;
  const t1 = tripList[0]!;
  const t2 = tripList[1];

  const seeds: Array<Omit<Expense, "id" | "number" | "createdAt">> = [
    {
      amountKes: 24_500,
      category: "fuel",
      description: "Diesel — Mariakani Total station",
      location: "Mariakani",
      countryCode: "KE",
      incurredAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      paidBy: "advance",
      tripId: t1.id,
      truckId: t1.truckId,
      driverId: t1.driverId,
      status: "approved",
      submittedBy: "Joseph Mwangi",
      submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      approvedBy: "Linet Wairimu",
      approvedAt: new Date(Date.now() - 3.5 * 86400000).toISOString(),
    },
    {
      amountKes: 4_800,
      category: "border_charges",
      description: "Malaba transit permit",
      location: "Malaba",
      countryCode: "UG",
      incurredAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      paidBy: "cash",
      tripId: t1.id,
      truckId: t1.truckId,
      driverId: t1.driverId,
      status: "approved",
      submittedBy: "Joseph Mwangi",
      submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      approvedBy: "Linet Wairimu",
      approvedAt: new Date(Date.now() - 2.5 * 86400000).toISOString(),
    },
    {
      amountKes: 2_500,
      category: "driver_overnight",
      description: "Overnight stop in Eldoret",
      location: "Eldoret",
      countryCode: "KE",
      incurredAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      paidBy: "mpesa",
      tripId: t1.id,
      truckId: t1.truckId,
      driverId: t1.driverId,
      status: "pending",
      submittedBy: "Joseph Mwangi",
      submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      amountKes: 1_200,
      category: "driver_welfare",
      description: "Lunch + water — driver",
      location: "Mai Mahiu",
      countryCode: "KE",
      incurredAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      paidBy: "mpesa",
      tripId: t1.id,
      truckId: t1.truckId,
      driverId: t1.driverId,
      status: "pending",
      submittedBy: "Joseph Mwangi",
      submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    ...(t2
      ? [
          {
            amountKes: 32_000,
            category: "fuel" as ExpenseCategory,
            description: "Diesel — Naivasha Shell",
            location: "Naivasha",
            countryCode: "KE",
            incurredAt: new Date(Date.now() - 1 * 86400000).toISOString(),
            paidBy: "fuel_card" as PaymentMethod,
            tripId: t2.id,
            truckId: t2.truckId,
            driverId: t2.driverId,
            status: "pending" as ExpenseStatus,
            submittedBy: "Ali Hassan",
            submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          },
        ]
      : []),
  ];

  seeds.forEach((s, i) => {
    const id = `exp-${String(i + 1).padStart(3, "0")}`;
    const num = `EXP-2026-${String(i + 1).padStart(4, "0")}`;
    expenses.set(id, { ...s, id, number: num, createdAt: s.submittedAt });
  });
  expenseCounter = seeds.length + 1;
}
if (DEMO_DATA) seedExpenses();

export function listExpenses(filter?: {
  status?: ExpenseStatus;
  tripId?: string;
  truckId?: string;
  driverId?: string;
}): Expense[] {
  let all = [...expenses.values()];
  if (filter?.status) all = all.filter((e) => e.status === filter.status);
  if (filter?.tripId) all = all.filter((e) => e.tripId === filter.tripId);
  if (filter?.truckId) all = all.filter((e) => e.truckId === filter.truckId);
  if (filter?.driverId) all = all.filter((e) => e.driverId === filter.driverId);
  return all.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
}

export function getExpense(id: string): Expense | undefined {
  return expenses.get(id);
}

export function expensesForTrip(tripId: string): Expense[] {
  return listExpenses({ tripId });
}

export function createExpense(input: Omit<Expense, "id" | "number" | "createdAt" | "status" | "approvedBy" | "approvedAt" | "rejectionReason" | "reimbursedAt">): Expense {
  const id = randomUUID();
  const e: Expense = {
    ...input,
    id,
    number: nextExpenseNumber(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  expenses.set(id, e);
  return e;
}

export function reviewExpense(input: {
  expenseId: string;
  approve: boolean;
  reason?: string;
  reviewedBy: string;
  notes?: string;
}): Expense | undefined {
  const exp = expenses.get(input.expenseId);
  if (!exp) return undefined;
  const updated: Expense = {
    ...exp,
    status: input.approve ? "approved" : "rejected",
    approvedBy: input.reviewedBy,
    approvedAt: new Date().toISOString(),
    rejectionReason: input.approve ? undefined : input.reason,
    notes: input.notes ?? exp.notes,
  };
  expenses.set(exp.id, updated);
  return updated;
}

export function markExpenseReimbursed(id: string): Expense | undefined {
  const exp = expenses.get(id);
  if (!exp) return undefined;
  const updated: Expense = {
    ...exp,
    status: "reimbursed",
    reimbursedAt: new Date().toISOString(),
  };
  expenses.set(exp.id, updated);
  return updated;
}

export function deleteExpense(id: string): boolean {
  return expenses.delete(id);
}

/** Sum of approved + reimbursed expenses for a trip (KES). */
export function tripExpenseTotal(tripId: string): number {
  return [...expenses.values()]
    .filter(
      (e) =>
        e.tripId === tripId &&
        (e.status === "approved" || e.status === "reimbursed"),
    )
    .reduce((sum, e) => sum + e.amountKes, 0);
}

// ============================================================
// Fuel logs (Phase 4C)
// ============================================================
const fuelLogs = new Map<string, FuelLog>();
let fuelCounter = 1;
function nextFuelNumber(): string {
  const year = new Date().getFullYear();
  const num = String(fuelCounter++).padStart(4, "0");
  return `FUEL-${year}-${num}`;
}

function seedFuelLogs() {
  const tripList = [...trips.values()];
  if (tripList.length === 0) return;
  const t1 = tripList[0]!;
  const t2 = tripList[1];

  const seeds: Array<Omit<FuelLog, "id" | "number" | "createdAt" | "pricePerLitreKes">> = [
    {
      tripId: t1.id,
      truckId: t1.truckId,
      driverId: t1.driverId,
      datetime: new Date(Date.now() - 5 * 86400000).toISOString(),
      station: "Total Mariakani",
      countryCode: "KE",
      litres: 165,
      costKes: 24_500,
      odometerKm: 412_500,
      submittedBy: "Joseph Mwangi",
    },
    {
      tripId: t1.id,
      truckId: t1.truckId,
      driverId: t1.driverId,
      datetime: new Date(Date.now() - 3 * 86400000).toISOString(),
      station: "Shell Eldoret",
      countryCode: "KE",
      litres: 220,
      costKes: 33_000,
      odometerKm: 412_980,
      submittedBy: "Joseph Mwangi",
    },
    {
      tripId: t1.id,
      truckId: t1.truckId,
      driverId: t1.driverId,
      datetime: new Date(Date.now() - 2 * 86400000).toISOString(),
      station: "Total Malaba",
      countryCode: "UG",
      litres: 120,
      costKes: 19_200,
      odometerKm: 413_360,
      submittedBy: "Joseph Mwangi",
    },
    ...(t2
      ? [
          {
            tripId: t2.id,
            truckId: t2.truckId,
            driverId: t2.driverId,
            datetime: new Date(Date.now() - 1 * 86400000).toISOString(),
            station: "Shell Naivasha",
            countryCode: "KE",
            litres: 210,
            costKes: 32_000,
            odometerKm: 281_220,
            submittedBy: "Ali Hassan",
          },
        ]
      : []),
  ];

  seeds.forEach((s, i) => {
    const id = `fuel-${String(i + 1).padStart(3, "0")}`;
    const log: FuelLog = {
      ...s,
      id,
      number: `FUEL-2026-${String(i + 1).padStart(4, "0")}`,
      pricePerLitreKes: Math.round((s.costKes / s.litres) * 100) / 100,
      createdAt: s.datetime,
    };
    fuelLogs.set(id, log);
  });
  fuelCounter = seeds.length + 1;
}
if (DEMO_DATA) seedFuelLogs();

export function listFuelLogs(filter?: { tripId?: string; truckId?: string }): FuelLog[] {
  let all = [...fuelLogs.values()];
  if (filter?.tripId) all = all.filter((f) => f.tripId === filter.tripId);
  if (filter?.truckId) all = all.filter((f) => f.truckId === filter.truckId);
  return all.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
}

export function getFuelLog(id: string): FuelLog | undefined {
  return fuelLogs.get(id);
}

export function fuelLogsForTrip(tripId: string): FuelLog[] {
  return listFuelLogs({ tripId });
}

export function fuelLogsForTruck(truckId: string): FuelLog[] {
  return listFuelLogs({ truckId });
}

export function createFuelLog(input: Omit<FuelLog, "id" | "number" | "createdAt" | "pricePerLitreKes">): FuelLog {
  const id = randomUUID();
  const log: FuelLog = {
    ...input,
    id,
    number: nextFuelNumber(),
    pricePerLitreKes: input.litres > 0 ? Math.round((input.costKes / input.litres) * 100) / 100 : 0,
    createdAt: new Date().toISOString(),
  };
  fuelLogs.set(id, log);
  return log;
}

export function deleteFuelLog(id: string): boolean {
  return fuelLogs.delete(id);
}

/** Sum litres + cost for a trip. */
export function tripFuelTotals(tripId: string): {
  litres: number;
  costKes: number;
  count: number;
} {
  const logs = fuelLogsForTrip(tripId);
  return {
    litres: logs.reduce((s, l) => s + l.litres, 0),
    costKes: logs.reduce((s, l) => s + l.costKes, 0),
    count: logs.length,
  };
}

/**
 * Compute km/L over the period for a truck. Uses the spread between
 * the lowest and highest odometer reading divided by total litres
 * pumped between them.
 */
export function truckFuelEfficiency(truckId: string): {
  kmPerLitre: number | null;
  litresTotal: number;
  costKesTotal: number;
  kmCovered: number;
  count: number;
} {
  const logs = fuelLogsForTruck(truckId);
  if (logs.length < 2) {
    return {
      kmPerLitre: null,
      litresTotal: logs.reduce((s, l) => s + l.litres, 0),
      costKesTotal: logs.reduce((s, l) => s + l.costKes, 0),
      kmCovered: 0,
      count: logs.length,
    };
  }
  const sorted = [...logs].sort((a, b) => a.odometerKm - b.odometerKm);
  const minOdo = sorted[0]!.odometerKm;
  const maxOdo = sorted[sorted.length - 1]!.odometerKm;
  const kmCovered = maxOdo - minOdo;
  // The first fuelling fills the tank — km covered uses litres from
  // subsequent fills.
  const subsequentLitres = sorted.slice(1).reduce((s, l) => s + l.litres, 0);
  const kmPerLitre =
    subsequentLitres > 0 && kmCovered > 0
      ? Math.round((kmCovered / subsequentLitres) * 100) / 100
      : null;
  return {
    kmPerLitre,
    litresTotal: logs.reduce((s, l) => s + l.litres, 0),
    costKesTotal: logs.reduce((s, l) => s + l.costKes, 0),
    kmCovered,
    count: logs.length,
  };
}

/** Fleet-wide fuel snapshot for the dashboard. */
export function fleetFuelSnapshot(): {
  totalLitres: number;
  totalCostKes: number;
  fleetKmPerLitre: number | null;
  byCountry: Array<{ code: string; litres: number; pct: number }>;
} {
  const all = [...fuelLogs.values()];
  const totalLitres = all.reduce((s, l) => s + l.litres, 0);
  const totalCostKes = all.reduce((s, l) => s + l.costKes, 0);

  // Per-truck efficiency, weighted average
  const truckIds = new Set(all.map((l) => l.truckId));
  let weightedKm = 0;
  let weightedLitres = 0;
  for (const truckId of truckIds) {
    const eff = truckFuelEfficiency(truckId);
    if (eff.kmPerLitre !== null) {
      weightedKm += eff.kmCovered;
      // Use litres after the first fill
      const truckLogs = fuelLogsForTruck(truckId).sort((a, b) => a.odometerKm - b.odometerKm);
      const lit = truckLogs.slice(1).reduce((s, l) => s + l.litres, 0);
      weightedLitres += lit;
    }
  }
  const fleetKmPerLitre =
    weightedLitres > 0 ? Math.round((weightedKm / weightedLitres) * 100) / 100 : null;

  // Country split
  const countryMap = new Map<string, number>();
  for (const l of all) {
    countryMap.set(l.countryCode, (countryMap.get(l.countryCode) ?? 0) + l.litres);
  }
  const byCountry = [...countryMap.entries()].map(([code, litres]) => ({
    code,
    litres,
    pct: totalLitres > 0 ? litres / totalLitres : 0,
  }));
  byCountry.sort((a, b) => b.litres - a.litres);

  return { totalLitres, totalCostKes, fleetKmPerLitre, byCountry };
}


// ============================================================
// Chart of Accounts (Phase 5A)
// ============================================================
const accounts = new Map<string, Account>();

/** Minimal CSV parser tolerant of unquoted commas in the Notes column. */
function parseCoaCsv(raw: string): Account[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const out: Account[] = [];
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const cols = splitCsvRow(line);
    if (cols.length < 8) continue;
    const [code, name, cls, group, type, normalBalance, currency, status, notes] = cols;
    if (!code || !name) continue;
    out.push({
      id: `acc-${code}`,
      code,
      name,
      class: cls as AccountClass,
      group: group ?? "",
      type: type ?? "",
      normalBalance: (normalBalance as NormalBalance) ?? "Debit",
      currency: currency || "KES",
      status: ((status as AccountStatus) ?? "Active") as AccountStatus,
      notes: notes || undefined,
    });
  }
  return out;
}

/** Splits a CSV row into fields; supports double-quoted strings. */
function splitCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  out.push(cur);
  return out.map((f) => f.trim());
}

function loadAccounts() {
  try {
    const path = join(process.cwd(), "docs", "finance", "coa-proposed.csv");
    const raw = readFileSync(path, "utf8");
    for (const a of parseCoaCsv(raw)) {
      accounts.set(a.id, a);
    }
  } catch {
    // CSV not present in some environments; CoA will be empty until seeded.
  }
}
loadAccounts();

export function listAccounts(filter?: {
  class?: AccountClass;
  status?: AccountStatus;
  search?: string;
}): Account[] {
  let all = [...accounts.values()];
  if (filter?.class) all = all.filter((a) => a.class === filter.class);
  if (filter?.status) all = all.filter((a) => a.status === filter.status);
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    all = all.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q),
    );
  }
  return all.sort((a, b) => a.code.localeCompare(b.code));
}

export function getAccount(id: string): Account | undefined {
  return accounts.get(id);
}

export function getAccountByCode(code: string): Account | undefined {
  for (const a of accounts.values()) {
    if (a.code === code) return a;
  }
  return undefined;
}

export function accountClassCounts(): Array<{ class: AccountClass; count: number }> {
  const map = new Map<AccountClass, number>();
  for (const a of accounts.values()) {
    map.set(a.class, (map.get(a.class) ?? 0) + 1);
  }
  return [...map.entries()].map(([c, count]) => ({ class: c, count }));
}

// ============================================================
// General Ledger (Phase 5B)
// ============================================================
const journalEntries = new Map<string, JournalEntry>();
const journalLines = new Map<string, JournalLine>();
let journalCounter = 1;

function nextJournalNumber(): string {
  const year = new Date().getFullYear();
  const num = String(journalCounter++).padStart(5, "0");
  return `JE-${year}-${num}`;
}

interface PostInput {
  date: string;
  memo: string;
  referenceType: JournalReferenceType;
  referenceId?: string;
  postedBy: string;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    currency: LedgerCurrency;
    fxRate: number;
    description?: string;
  }>;
}

export function postJournalEntry(input: PostInput): JournalEntry | { error: string } {
  // Validate balance in KES
  const dr = input.lines.reduce((s, l) => s + l.debit * l.fxRate, 0);
  const cr = input.lines.reduce((s, l) => s + l.credit * l.fxRate, 0);
  if (Math.abs(dr - cr) > 0.01) {
    return { error: `Out of balance: Dr KSh ${dr.toFixed(2)} vs Cr KSh ${cr.toFixed(2)}` };
  }
  if (input.lines.length < 2) {
    return { error: "At least two lines required" };
  }

  // Resolve accounts (denormalise code + name)
  const resolvedLines = input.lines.map((l) => {
    const acc = accounts.get(l.accountId);
    if (!acc) throw new Error(`Account ${l.accountId} not found`);
    if (l.debit > 0 && l.credit > 0) {
      throw new Error("Line cannot have both debit and credit");
    }
    return {
      acc,
      originalDebit: l.debit,
      originalCredit: l.credit,
      currency: l.currency,
      fxRate: l.fxRate,
      debitKes: Math.round(l.debit * l.fxRate * 100) / 100,
      creditKes: Math.round(l.credit * l.fxRate * 100) / 100,
      description: l.description,
    };
  });

  const id = randomUUID();
  const totalDebitKes = resolvedLines.reduce((s, l) => s + l.debitKes, 0);
  const totalCreditKes = resolvedLines.reduce((s, l) => s + l.creditKes, 0);
  const entry: JournalEntry = {
    id,
    number: nextJournalNumber(),
    date: input.date,
    memo: input.memo,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    status: "posted",
    postedBy: input.postedBy,
    postedAt: new Date().toISOString(),
    totalDebitKes,
    totalCreditKes,
  };
  journalEntries.set(id, entry);

  for (const r of resolvedLines) {
    const lineId = randomUUID();
    const line: JournalLine = {
      id: lineId,
      journalEntryId: id,
      accountId: r.acc.id,
      accountCode: r.acc.code,
      accountName: r.acc.name,
      originalDebit: r.originalDebit,
      originalCredit: r.originalCredit,
      currency: r.currency,
      fxRate: r.fxRate,
      debitKes: r.debitKes,
      creditKes: r.creditKes,
      description: r.description,
    };
    journalLines.set(lineId, line);
  }
  return entry;
}

export function reverseJournalEntry(input: {
  entryId: string;
  postedBy: string;
}): JournalEntry | { error: string } {
  const original = journalEntries.get(input.entryId);
  if (!original) return { error: "Entry not found" };
  if (original.status !== "posted") return { error: "Only posted entries can be reversed" };

  const origLines = [...journalLines.values()].filter(
    (l) => l.journalEntryId === input.entryId,
  );

  const swappedLines = origLines.map((l) => ({
    accountId: l.accountId,
    debit: l.originalCredit,
    credit: l.originalDebit,
    currency: l.currency,
    fxRate: l.fxRate,
    description: `Reversal of ${original.number}`,
  }));

  const reversal = postJournalEntry({
    date: new Date().toISOString().slice(0, 10),
    memo: `Reversal of ${original.number}: ${original.memo}`,
    referenceType: "reversal",
    referenceId: original.id,
    postedBy: input.postedBy,
    lines: swappedLines,
  });

  if ("error" in reversal) return reversal;

  // Mark relationships
  journalEntries.set(original.id, { ...original, status: "reversed", reversedById: reversal.id });
  journalEntries.set(reversal.id, { ...reversal, reversalOf: original.id });
  return reversal;
}

function seedOpeningBalances() {
  const ob = (code: string, debit: number, credit: number, memo: string) => {
    const acc = getAccountByCode(code);
    if (!acc) return null;
    return {
      accountId: acc.id,
      debit,
      credit,
      currency: "KES" as const,
      fxRate: 1,
      description: memo,
    };
  };

  // Demo opening balances at start of year (KES). Entries are illustrative.
  const openings: Array<{
    date: string;
    memo: string;
    lines: Array<ReturnType<typeof ob>>;
  }> = [
    {
      date: "2026-01-01",
      memo: "Opening balances 2026 — equity & cash",
      lines: [
        ob("121100", 4_500_000, 0, "Cash at Bank — Operations (KES)"),
        ob("122100", 1_200_000, 0, "Cash at Bank — USD account (KES equivalent)"),
        ob("120200", 50_000, 0, "Petty Cash"),
        ob("300100", 0, 5_750_000, "Share Capital"),
      ],
    },
    {
      date: "2026-01-01",
      memo: "Opening balances 2026 — fleet PPE",
      lines: [
        ob("100300", 38_000_000, 0, "Motor Vehicles at cost"),
        ob("101300", 0, 9_500_000, "Acc. Dep. — Motor Vehicles"),
        ob("300400", 0, 28_500_000, "Retained Earnings"),
      ],
    },
  ];

  for (const op of openings) {
    const validLines = op.lines.filter((x): x is NonNullable<typeof x> => x !== null);
    if (validLines.length < 2) continue;
    postJournalEntry({
      date: op.date,
      memo: op.memo,
      referenceType: "opening_balance",
      postedBy: "Finance",
      lines: validLines,
    });
  }
}
if (DEMO_DATA) seedOpeningBalances();

export function listJournalEntries(filter?: {
  status?: JournalStatus;
  referenceType?: JournalReferenceType;
  fromDate?: string;
  toDate?: string;
}): JournalEntry[] {
  let all = [...journalEntries.values()];
  if (filter?.status) all = all.filter((e) => e.status === filter.status);
  if (filter?.referenceType) all = all.filter((e) => e.referenceType === filter.referenceType);
  if (filter?.fromDate) all = all.filter((e) => e.date >= filter.fromDate!);
  if (filter?.toDate) all = all.filter((e) => e.date <= filter.toDate!);
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export function getJournalEntry(id: string): JournalEntryDetail | undefined {
  const entry = journalEntries.get(id);
  if (!entry) return undefined;
  const lines = [...journalLines.values()]
    .filter((l) => l.journalEntryId === id)
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  return { ...entry, lines };
}

/** All lines on a given account, optionally limited by date range. */
export function ledgerLinesForAccount(
  accountId: string,
  range?: { fromDate?: string; toDate?: string },
): Array<JournalLine & { entry: JournalEntry }> {
  const lines = [...journalLines.values()].filter((l) => l.accountId === accountId);
  return lines
    .map((l) => {
      const entry = journalEntries.get(l.journalEntryId);
      return entry && entry.status === "posted" ? { ...l, entry } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter((l) => {
      if (range?.fromDate && l.entry.date < range.fromDate) return false;
      if (range?.toDate && l.entry.date > range.toDate) return false;
      return true;
    })
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date));
}

/** Compute the running balance and totals for a single account. */
export function accountBalance(
  accountId: string,
  range?: { fromDate?: string; toDate?: string },
): {
  debitKes: number;
  creditKes: number;
  balanceKes: number;
  balanceSide: "Debit" | "Credit";
  count: number;
} {
  const acc = accounts.get(accountId);
  const lines = ledgerLinesForAccount(accountId, range);
  const debitKes = lines.reduce((s, l) => s + l.debitKes, 0);
  const creditKes = lines.reduce((s, l) => s + l.creditKes, 0);
  const debitNormal = acc ? increasesByDebit(acc.class) : true;
  const balanceKes = debitNormal ? debitKes - creditKes : creditKes - debitKes;
  return {
    debitKes,
    creditKes,
    balanceKes,
    balanceSide: debitNormal ? "Debit" : "Credit",
    count: lines.length,
  };
}

/** Compute a Trial Balance across all accounts (optionally for a period). */
export function trialBalance(range?: {
  fromDate?: string;
  toDate?: string;
}): TrialBalanceRow[] {
  const rows: TrialBalanceRow[] = [];
  for (const acc of accounts.values()) {
    const lines = ledgerLinesForAccount(acc.id, range);
    if (lines.length === 0) continue;
    const debitKes = lines.reduce((s, l) => s + l.debitKes, 0);
    const creditKes = lines.reduce((s, l) => s + l.creditKes, 0);
    if (debitKes === 0 && creditKes === 0) continue;
    const debitNormal = increasesByDebit(acc.class);
    const balanceKes = debitNormal ? debitKes - creditKes : creditKes - debitKes;
    rows.push({
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      class: acc.class,
      debitKes,
      creditKes,
      balanceKes,
      balanceSide: debitNormal ? "Debit" : "Credit",
    });
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code));
}

// ============================================================
// Accounts Receivable (Phase 5C)
// ============================================================
const invoices = new Map<string, CustomerInvoice>();
const invoiceLines = new Map<string, InvoiceLineItem>();
const customerPayments = new Map<string, CustomerPayment>();
let invoiceCounter = 1;
let receiptCounter = 1;

function nextInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const num = String(invoiceCounter++).padStart(5, "0");
  return `INV-${year}-${num}`;
}
function nextReceiptNumber(): string {
  const year = new Date().getFullYear();
  const num = String(receiptCounter++).padStart(5, "0");
  return `RCT-${year}-${num}`;
}

export function listInvoices(filter?: {
  status?: InvoiceStatus;
  customerId?: string;
}): CustomerInvoice[] {
  let all = [...invoices.values()];
  if (filter?.status) all = all.filter((i) => i.status === filter.status);
  if (filter?.customerId) all = all.filter((i) => i.customerId === filter.customerId);
  return all.sort((a, b) => b.issueDate.localeCompare(a.issueDate));
}

export function getInvoice(id: string): InvoiceWithLines | undefined {
  const inv = invoices.get(id);
  if (!inv) return undefined;
  const lines = [...invoiceLines.values()].filter((l) => l.invoiceId === id);
  const payments = [...customerPayments.values()]
    .filter((p) => p.invoiceId === id)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { ...inv, lines, payments };
}

export function invoicesForTrip(tripId: string): CustomerInvoice[] {
  return [...invoices.values()].filter((i) => i.tripId === tripId);
}

function recomputeInvoiceStatus(invoiceId: string): void {
  const inv = invoices.get(invoiceId);
  if (!inv) return;
  const paid = [...customerPayments.values()]
    .filter((p) => p.invoiceId === invoiceId)
    .reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, inv.total - paid);
  let status: InvoiceStatus = inv.status;
  if (status === "cancelled" || status === "draft") {
    // Don't auto-flip from draft / cancelled.
  } else if (balance < 0.01) {
    status = "paid";
  } else if (paid > 0) {
    status = "partially_paid";
  } else {
    // sent or overdue: check due date
    const dueOverdue = new Date(inv.dueDate).getTime() < Date.now();
    status = dueOverdue ? "overdue" : "sent";
  }
  invoices.set(invoiceId, { ...inv, paidAmount: paid, balance, status });
}

export function createInvoice(input: {
  customerId: string;
  tripId?: string;
  issueDate: string;
  dueDate: string;
  currency: LedgerCurrency;
  fxRate: number;
  taxRate: number;
  notes?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    revenueAccountCode?: string;
  }>;
}): CustomerInvoice | { error: string } {
  if (!customers.has(input.customerId)) return { error: "Customer not found" };
  if (input.lines.length === 0) return { error: "At least one line item required" };

  const id = randomUUID();
  const subtotal = input.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxAmount = subtotal * input.taxRate;
  const total = subtotal + taxAmount;

  const inv: CustomerInvoice = {
    id,
    number: nextInvoiceNumber(),
    customerId: input.customerId,
    tripId: input.tripId,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    currency: input.currency,
    fxRate: input.fxRate,
    subtotal,
    taxRate: input.taxRate,
    taxAmount,
    total,
    paidAmount: 0,
    balance: total,
    status: "draft",
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  invoices.set(id, inv);

  for (const line of input.lines) {
    const lineId = randomUUID();
    const lineTotal = line.quantity * line.unitPrice;
    const item: InvoiceLineItem = {
      id: lineId,
      invoiceId: id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPrice: line.unitPrice,
      lineTotal,
      revenueAccountCode: line.revenueAccountCode,
    };
    invoiceLines.set(lineId, item);
  }
  return inv;
}

export function sendInvoice(invoiceId: string): CustomerInvoice | { error: string } {
  const inv = invoices.get(invoiceId);
  if (!inv) return { error: "Invoice not found" };
  if (inv.status !== "draft") return { error: `Already ${inv.status}` };
  invoices.set(inv.id, { ...inv, status: "sent" });

  // Auto-post to GL: Dr AR / Cr Revenue (and Output VAT if applicable)
  const customer = customers.get(inv.customerId);
  // AR account: 111200 USD or 111100 KES
  const arCode =
    inv.currency === "USD" || customer?.billingCurrency === "USD"
      ? "111200"
      : "111100";
  const arAcc = getAccountByCode(arCode);
  // Revenue: prefer line.revenueAccountCode; fallback to 400200 (export) or 400100 (domestic)
  const lines = [...invoiceLines.values()].filter((l) => l.invoiceId === inv.id);
  const isExport = inv.currency !== "KES";
  const revenueCode = lines[0]?.revenueAccountCode ?? (isExport ? "400200" : "400100");
  const revenueAcc = getAccountByCode(revenueCode);
  if (!arAcc || !revenueAcc) {
    return { error: "Required accounts (AR / Revenue) not found in CoA" };
  }

  const journalLinesIn: Array<{
    accountId: string;
    debit: number;
    credit: number;
    currency: LedgerCurrency;
    fxRate: number;
    description?: string;
  }> = [
    {
      accountId: arAcc.id,
      debit: inv.total,
      credit: 0,
      currency: inv.currency,
      fxRate: inv.fxRate,
      description: `${inv.number} — ${customer?.name ?? "Customer"}`,
    },
    {
      accountId: revenueAcc.id,
      debit: 0,
      credit: inv.subtotal,
      currency: inv.currency,
      fxRate: inv.fxRate,
      description: `${inv.number} — freight revenue`,
    },
  ];
  if (inv.taxAmount > 0) {
    const vatAcc = getAccountByCode("220700");
    if (vatAcc) {
      journalLinesIn.push({
        accountId: vatAcc.id,
        debit: 0,
        credit: inv.taxAmount,
        currency: inv.currency,
        fxRate: inv.fxRate,
        description: `${inv.number} — output VAT`,
      });
    }
  }

  const result = postJournalEntry({
    date: inv.issueDate,
    memo: `Invoice ${inv.number} — ${customer?.name ?? "Customer"}`,
    referenceType: "invoice",
    referenceId: inv.id,
    postedBy: "Finance",
    lines: journalLinesIn,
  });
  if ("error" in result) {
    // Roll back status
    invoices.set(inv.id, inv);
    return result;
  }

  invoices.set(inv.id, { ...inv, status: "sent", journalEntryId: result.id });
  return invoices.get(inv.id)!;
}

export function cancelInvoice(invoiceId: string): CustomerInvoice | { error: string } {
  const inv = invoices.get(invoiceId);
  if (!inv) return { error: "Invoice not found" };
  if (inv.status === "paid") return { error: "Cannot cancel a paid invoice" };
  // If posted, reverse the JE
  if (inv.journalEntryId) {
    reverseJournalEntry({ entryId: inv.journalEntryId, postedBy: "Finance" });
  }
  const updated: CustomerInvoice = { ...inv, status: "cancelled" };
  invoices.set(inv.id, updated);
  return updated;
}

export function recordCustomerPayment(input: {
  invoiceId: string;
  date: string;
  amount: number;
  currency: LedgerCurrency;
  fxRate: number;
  paymentMethod: ARPaymentMethod;
  reference?: string;
  notes?: string;
}): CustomerPayment | { error: string } {
  const inv = invoices.get(input.invoiceId);
  if (!inv) return { error: "Invoice not found" };
  if (inv.status === "draft") return { error: "Send the invoice first" };
  if (inv.status === "cancelled") return { error: "Invoice is cancelled" };

  const id = randomUUID();
  const payment: CustomerPayment = {
    id,
    number: nextReceiptNumber(),
    invoiceId: inv.id,
    customerId: inv.customerId,
    date: input.date,
    amount: input.amount,
    currency: input.currency,
    fxRate: input.fxRate,
    paymentMethod: input.paymentMethod,
    reference: input.reference,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  customerPayments.set(id, payment);

  // Auto-post: Dr Bank / Cr AR
  const customer = customers.get(inv.customerId);
  const arCode =
    inv.currency === "USD" || customer?.billingCurrency === "USD"
      ? "111200"
      : "111100";
  const arAcc = getAccountByCode(arCode);

  // Bank account: pick by payment method + currency
  let bankCode: string;
  if (input.paymentMethod === "mpesa") bankCode = "129100"; // M-Pesa Paybill
  else if (input.paymentMethod === "cash") bankCode = "120100"; // Cash in Hand
  else if (input.currency === "USD") bankCode = "122100";
  else bankCode = "121100";
  const bankAcc = getAccountByCode(bankCode);

  if (!arAcc || !bankAcc) {
    customerPayments.delete(id);
    return { error: "Required accounts (AR / Bank) not found" };
  }

  const result = postJournalEntry({
    date: input.date,
    memo: `Receipt ${payment.number} — ${customer?.name ?? "Customer"} for ${inv.number}`,
    referenceType: "payment",
    referenceId: payment.id,
    postedBy: "Finance",
    lines: [
      {
        accountId: bankAcc.id,
        debit: input.amount,
        credit: 0,
        currency: input.currency,
        fxRate: input.fxRate,
        description: `${payment.number} — receipt`,
      },
      {
        accountId: arAcc.id,
        debit: 0,
        credit: input.amount,
        currency: input.currency,
        fxRate: input.fxRate,
        description: `${payment.number} — applies to ${inv.number}`,
      },
    ],
  });
  if ("error" in result) {
    customerPayments.delete(id);
    return result;
  }
  customerPayments.set(id, { ...payment, journalEntryId: result.id });
  recomputeInvoiceStatus(inv.id);
  return customerPayments.get(id)!;
}

/** Force a refresh of overdue/paid statuses across all invoices. */
export function refreshInvoiceStatuses(): void {
  for (const inv of invoices.values()) recomputeInvoiceStatus(inv.id);
}

// ============================================================
// Accounts Payable (Phase 5D)
// ============================================================
const bills = new Map<string, SupplierBill>();
const billLines = new Map<string, BillLineItem>();
const supplierPayments = new Map<string, SupplierPayment>();
let billCounter = 1;
let billPaymentCounter = 1;

function nextBillNumber(): string {
  const year = new Date().getFullYear();
  const num = String(billCounter++).padStart(5, "0");
  return `BIL-${year}-${num}`;
}
function nextBillPaymentNumber(): string {
  const year = new Date().getFullYear();
  const num = String(billPaymentCounter++).padStart(5, "0");
  return `PAY-${year}-${num}`;
}

export function listBills(filter?: {
  status?: BillStatus;
  supplierId?: string;
}): SupplierBill[] {
  let all = [...bills.values()];
  if (filter?.status) all = all.filter((b) => b.status === filter.status);
  if (filter?.supplierId) all = all.filter((b) => b.supplierId === filter.supplierId);
  return all.sort((a, b) => b.issueDate.localeCompare(a.issueDate));
}

export function getBill(id: string): BillWithLines | undefined {
  const b = bills.get(id);
  if (!b) return undefined;
  const lines = [...billLines.values()].filter((l) => l.billId === id);
  const payments = [...supplierPayments.values()]
    .filter((p) => p.billId === id)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { ...b, lines, payments };
}

function recomputeBillStatus(billId: string): void {
  const b = bills.get(billId);
  if (!b) return;
  const paid = [...supplierPayments.values()]
    .filter((p) => p.billId === billId)
    .reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, b.total - paid);
  let status: BillStatus = b.status;
  if (status === "cancelled" || status === "draft") {
    // Don't auto-flip from draft / cancelled.
  } else if (balance < 0.01) {
    status = "paid";
  } else if (paid > 0) {
    status = "partially_paid";
  } else {
    const overdue = new Date(b.dueDate).getTime() < Date.now();
    status = overdue ? "overdue" : "sent";
  }
  bills.set(billId, { ...b, paidAmount: paid, balance, status });
}

export function createBill(input: {
  supplierId: string;
  supplierRef?: string;
  issueDate: string;
  dueDate: string;
  currency: LedgerCurrency;
  fxRate: number;
  taxRate: number;
  notes?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    expenseAccountCode: string;
  }>;
}): SupplierBill | { error: string } {
  if (!suppliers.has(input.supplierId)) return { error: "Supplier not found" };
  if (input.lines.length === 0) return { error: "At least one line required" };

  const id = randomUUID();
  const subtotal = input.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxAmount = subtotal * input.taxRate;
  const total = subtotal + taxAmount;

  const bill: SupplierBill = {
    id,
    number: nextBillNumber(),
    supplierId: input.supplierId,
    supplierRef: input.supplierRef,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    currency: input.currency,
    fxRate: input.fxRate,
    subtotal,
    taxRate: input.taxRate,
    taxAmount,
    total,
    paidAmount: 0,
    balance: total,
    status: "draft",
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  bills.set(id, bill);

  for (const line of input.lines) {
    const lineId = randomUUID();
    const lineTotal = line.quantity * line.unitPrice;
    billLines.set(lineId, {
      id: lineId,
      billId: id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPrice: line.unitPrice,
      lineTotal,
      expenseAccountCode: line.expenseAccountCode,
    });
  }
  return bill;
}

export function postBill(billId: string): SupplierBill | { error: string } {
  const bill = bills.get(billId);
  if (!bill) return { error: "Bill not found" };
  if (bill.status !== "draft") return { error: `Already ${bill.status}` };

  const supplier = suppliers.get(bill.supplierId);
  const apCode = bill.currency === "USD" ? "210200" : "210100";
  const apAcc = getAccountByCode(apCode);
  if (!apAcc) return { error: "AP account not found in CoA" };

  const lines = [...billLines.values()].filter((l) => l.billId === bill.id);
  const journalLinesIn: Array<{
    accountId: string;
    debit: number;
    credit: number;
    currency: LedgerCurrency;
    fxRate: number;
    description?: string;
  }> = [];

  // Dr each expense line
  for (const line of lines) {
    const acc = getAccountByCode(line.expenseAccountCode);
    if (!acc) return { error: `Expense account ${line.expenseAccountCode} not found` };
    journalLinesIn.push({
      accountId: acc.id,
      debit: line.lineTotal,
      credit: 0,
      currency: bill.currency,
      fxRate: bill.fxRate,
      description: `${bill.number} — ${line.description}`,
    });
  }

  // Dr Input VAT (if any)
  if (bill.taxAmount > 0) {
    const vatAcc = getAccountByCode("113100"); // VAT Recoverable / Input
    if (vatAcc) {
      journalLinesIn.push({
        accountId: vatAcc.id,
        debit: bill.taxAmount,
        credit: 0,
        currency: bill.currency,
        fxRate: bill.fxRate,
        description: `${bill.number} — input VAT`,
      });
    }
  }

  // Cr AP
  journalLinesIn.push({
    accountId: apAcc.id,
    debit: 0,
    credit: bill.total,
    currency: bill.currency,
    fxRate: bill.fxRate,
    description: `${bill.number} — ${supplier?.name ?? "Supplier"}`,
  });

  const result = postJournalEntry({
    date: bill.issueDate,
    memo: `Bill ${bill.number} — ${supplier?.name ?? "Supplier"}`,
    referenceType: "bill",
    referenceId: bill.id,
    postedBy: "Finance",
    lines: journalLinesIn,
  });
  if ("error" in result) return result;

  bills.set(bill.id, { ...bill, status: "sent", journalEntryId: result.id });
  return bills.get(bill.id)!;
}

export function cancelBill(billId: string): SupplierBill | { error: string } {
  const b = bills.get(billId);
  if (!b) return { error: "Bill not found" };
  if (b.status === "paid") return { error: "Cannot cancel a paid bill" };
  if (b.journalEntryId) {
    reverseJournalEntry({ entryId: b.journalEntryId, postedBy: "Finance" });
  }
  const updated: SupplierBill = { ...b, status: "cancelled" };
  bills.set(b.id, updated);
  return updated;
}

export function paySupplierBill(input: {
  billId: string;
  date: string;
  amount: number;
  currency: LedgerCurrency;
  fxRate: number;
  paymentMethod: APPaymentMethod;
  reference?: string;
  notes?: string;
}): SupplierPayment | { error: string } {
  const bill = bills.get(input.billId);
  if (!bill) return { error: "Bill not found" };
  if (bill.status === "draft") return { error: "Post the bill first" };
  if (bill.status === "cancelled") return { error: "Bill is cancelled" };
  if (bill.status === "paid") return { error: "Bill already fully paid" };

  const id = randomUUID();
  const payment: SupplierPayment = {
    id,
    number: nextBillPaymentNumber(),
    billId: bill.id,
    supplierId: bill.supplierId,
    date: input.date,
    amount: input.amount,
    currency: input.currency,
    fxRate: input.fxRate,
    paymentMethod: input.paymentMethod,
    reference: input.reference,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  supplierPayments.set(id, payment);

  const supplier = suppliers.get(bill.supplierId);
  const apCode = bill.currency === "USD" ? "210200" : "210100";
  const apAcc = getAccountByCode(apCode);
  let bankCode: string;
  if (input.paymentMethod === "mpesa") bankCode = "129100";
  else if (input.paymentMethod === "cash") bankCode = "120100";
  else if (input.currency === "USD") bankCode = "122100";
  else bankCode = "121100";
  const bankAcc = getAccountByCode(bankCode);

  if (!apAcc || !bankAcc) {
    supplierPayments.delete(id);
    return { error: "Required accounts (AP / Bank) not found" };
  }

  const result = postJournalEntry({
    date: input.date,
    memo: `Payment ${payment.number} — ${supplier?.name ?? "Supplier"} for ${bill.number}`,
    referenceType: "payment",
    referenceId: payment.id,
    postedBy: "Finance",
    lines: [
      {
        accountId: apAcc.id,
        debit: input.amount,
        credit: 0,
        currency: input.currency,
        fxRate: input.fxRate,
        description: `${payment.number} — applies to ${bill.number}`,
      },
      {
        accountId: bankAcc.id,
        debit: 0,
        credit: input.amount,
        currency: input.currency,
        fxRate: input.fxRate,
        description: `${payment.number} — supplier paid`,
      },
    ],
  });
  if ("error" in result) {
    supplierPayments.delete(id);
    return result;
  }
  supplierPayments.set(id, { ...payment, journalEntryId: result.id });
  recomputeBillStatus(bill.id);
  return supplierPayments.get(id)!;
}

export function refreshBillStatuses(): void {
  for (const b of bills.values()) recomputeBillStatus(b.id);
}

// ============================================================
// Bank reconciliation (Phase 5E)
// ============================================================
const bankStatementTxs = new Map<string, BankStatementTransaction>();

/** Returns all CoA accounts that are bank/cash. */
export function listBankAccounts(): Account[] {
  return [...accounts.values()]
    .filter((a) => a.type === "Bank" || a.type === "Cash" || a.type === "Mobile Money")
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function listBankStatementTxs(accountCode: string): BankStatementTransaction[] {
  return [...bankStatementTxs.values()]
    .filter((t) => t.accountCode === accountCode)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getBankStatementTx(id: string): BankStatementTransaction | undefined {
  return bankStatementTxs.get(id);
}

export function createBankStatementTx(input: {
  accountCode: string;
  date: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  currency: LedgerCurrency;
  notes?: string;
}): BankStatementTransaction | { error: string } {
  if (!getAccountByCode(input.accountCode)) {
    return { error: "Account not in CoA" };
  }
  const id = randomUUID();
  const tx: BankStatementTransaction = {
    id,
    ...input,
    status: "unmatched",
    createdAt: new Date().toISOString(),
  };
  bankStatementTxs.set(id, tx);
  return tx;
}

export function deleteBankStatementTx(id: string): boolean {
  return bankStatementTxs.delete(id);
}

export function matchBankStatementTx(
  bankTxId: string,
  journalLineId: string,
): BankStatementTransaction | { error: string } {
  const tx = bankStatementTxs.get(bankTxId);
  if (!tx) return { error: "Bank tx not found" };
  if (tx.status === "matched") return { error: "Already matched" };
  const line = journalLines.get(journalLineId);
  if (!line) return { error: "Journal line not found" };
  // Sanity check: line belongs to same account
  const acc = accounts.get(line.accountId);
  if (!acc || acc.code !== tx.accountCode) {
    return { error: "Journal line is not on this bank account" };
  }
  // Sanity check: amount matches (within 0.01)
  const txNet = tx.debit - tx.credit;
  const lineNet = line.originalDebit - line.originalCredit;
  if (Math.abs(txNet - lineNet) > 0.01) {
    return { error: `Amounts don't match: bank ${txNet} vs GL ${lineNet}` };
  }
  // Make sure that journal line isn't already matched to another bank tx
  for (const other of bankStatementTxs.values()) {
    if (other.matchedJournalLineId === journalLineId && other.id !== tx.id) {
      return { error: "Journal line already matched to another bank tx" };
    }
  }
  bankStatementTxs.set(tx.id, {
    ...tx,
    status: "matched",
    matchedJournalLineId: journalLineId,
  });
  return bankStatementTxs.get(tx.id)!;
}

export function unmatchBankStatementTx(
  bankTxId: string,
): BankStatementTransaction | { error: string } {
  const tx = bankStatementTxs.get(bankTxId);
  if (!tx) return { error: "Bank tx not found" };
  bankStatementTxs.set(tx.id, {
    ...tx,
    status: "unmatched",
    matchedJournalLineId: undefined,
  });
  return bankStatementTxs.get(tx.id)!;
}

/** GL lines on a bank account that are not yet matched. */
export function unmatchedGlLinesForAccount(accountCode: string): JournalLine[] {
  const acc = getAccountByCode(accountCode);
  if (!acc) return [];
  const allLines = [...journalLines.values()].filter((l) => l.accountId === acc.id);
  const matchedSet = new Set(
    [...bankStatementTxs.values()]
      .filter((t) => t.matchedJournalLineId)
      .map((t) => t.matchedJournalLineId!),
  );
  // Only include lines whose entry is posted (not draft / reversed)
  return allLines
    .filter((l) => !matchedSet.has(l.id))
    .filter((l) => {
      const e = journalEntries.get(l.journalEntryId);
      return e?.status === "posted";
    })
    .sort((a, b) => {
      const ea = journalEntries.get(a.journalEntryId)?.date ?? "";
      const eb = journalEntries.get(b.journalEntryId)?.date ?? "";
      return eb.localeCompare(ea);
    });
}

// ============================================================
// Reports (Phase 5F): aggregations for P&L, SFP, profit-per-trip
// ============================================================

export interface PnlSection {
  label: string;
  classFilter: AccountClass[];
  rows: Array<{ accountId: string; code: string; name: string; balanceKes: number }>;
  total: number;
}

/** Build the P&L sections for a date range. */
export function profitAndLoss(range?: { fromDate?: string; toDate?: string }) {
  const tb = trialBalance(range);
  const incomeRows = tb
    .filter((r) => r.class === "Income")
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balanceKes: r.balanceKes }));
  const otherIncomeRows = tb
    .filter((r) => r.class === "Other Income")
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balanceKes: r.balanceKes }));
  const directCostRows = tb
    .filter((r) => r.class === "Direct Cost")
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balanceKes: r.balanceKes }));
  const expenseRows = tb
    .filter((r) => r.class === "Expense")
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balanceKes: r.balanceKes }));
  const otherExpenseRows = tb
    .filter((r) => r.class === "Other Expense")
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balanceKes: r.balanceKes }));
  const taxRows = tb
    .filter((r) => r.class === "Tax")
    .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, balanceKes: r.balanceKes }));

  const incomeTotal = incomeRows.reduce((s, r) => s + r.balanceKes, 0);
  const otherIncomeTotal = otherIncomeRows.reduce((s, r) => s + r.balanceKes, 0);
  const directCostTotal = directCostRows.reduce((s, r) => s + r.balanceKes, 0);
  const expenseTotal = expenseRows.reduce((s, r) => s + r.balanceKes, 0);
  const otherExpenseTotal = otherExpenseRows.reduce((s, r) => s + r.balanceKes, 0);
  const taxTotal = taxRows.reduce((s, r) => s + r.balanceKes, 0);

  const grossProfit = incomeTotal - directCostTotal;
  const operatingProfit = grossProfit - expenseTotal;
  const profitBeforeTax = operatingProfit + otherIncomeTotal - otherExpenseTotal;
  const netProfit = profitBeforeTax - taxTotal;

  return {
    range,
    income: { rows: incomeRows, total: incomeTotal },
    directCost: { rows: directCostRows, total: directCostTotal },
    grossProfit,
    expenses: { rows: expenseRows, total: expenseTotal },
    operatingProfit,
    otherIncome: { rows: otherIncomeRows, total: otherIncomeTotal },
    otherExpense: { rows: otherExpenseRows, total: otherExpenseTotal },
    profitBeforeTax,
    tax: { rows: taxRows, total: taxTotal },
    netProfit,
  };
}

/** Build the Statement of Financial Position at a given date. */
export function statementOfFinancialPosition(asOfDate?: string) {
  const tb = trialBalance(asOfDate ? { toDate: asOfDate } : undefined);
  const assets = tb
    .filter((r) => r.class === "Asset")
    .map((r) => ({ ...r }))
    .sort((a, b) => a.code.localeCompare(b.code));
  const liabilities = tb
    .filter((r) => r.class === "Liability")
    .map((r) => ({ ...r }))
    .sort((a, b) => a.code.localeCompare(b.code));
  const equity = tb
    .filter((r) => r.class === "Equity")
    .map((r) => ({ ...r }))
    .sort((a, b) => a.code.localeCompare(b.code));

  // Compute net profit for retained earnings adjustment
  const pnl = profitAndLoss(asOfDate ? { toDate: asOfDate } : undefined);

  // Group assets by 'Non-current' vs 'Current'
  const splitByGroup = (rows: typeof assets) => {
    const acctById = new Map(accounts.values().toString.length ? [...accounts.values()].map((a) => [a.id, a]) : []);
    const buckets = new Map<string, typeof rows>();
    for (const row of rows) {
      const acc = acctById.get(row.accountId);
      const group = acc?.group ?? "Other";
      if (!buckets.has(group)) buckets.set(group, []);
      buckets.get(group)!.push(row);
    }
    return [...buckets.entries()].map(([group, rs]) => ({
      group,
      rows: rs,
      total: rs.reduce((s, r) => s + r.balanceKes, 0),
    }));
  };

  const assetGroups = splitByGroup(assets);
  const liabilityGroups = splitByGroup(liabilities);

  const totalAssets = assets.reduce((s, r) => s + r.balanceKes, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.balanceKes, 0);
  const totalEquity = equity.reduce((s, r) => s + r.balanceKes, 0);
  const totalEquityAndLiabilities = totalEquity + totalLiabilities + pnl.netProfit;
  const balancingDifference = totalAssets - totalEquityAndLiabilities;

  return {
    asOfDate,
    assets: { groups: assetGroups, total: totalAssets },
    liabilities: { groups: liabilityGroups, total: totalLiabilities },
    equity: { rows: equity, total: totalEquity },
    netProfit: pnl.netProfit,
    totalEquityAndLiabilities,
    balancingDifference,
  };
}

/** Profit per trip — revenue (from invoices) minus direct trip costs. */
export interface TripProfitRow {
  tripId: string;
  number: string;
  origin: string;
  destination: string;
  status: string;
  revenueKes: number;
  borderChargesKes: number;
  driverAdvanceUsedKes: number;
  expensesKes: number;
  fuelKes: number;
  totalCostsKes: number;
  grossProfitKes: number;
  marginPct: number | null;
}

export function tripProfitability(): TripProfitRow[] {
  const rows: TripProfitRow[] = [];
  for (const trip of trips.values()) {
    // Revenue: sum of trip's posted invoices in KES base
    const revenueKes = [...invoices.values()]
      .filter((inv) => inv.tripId === trip.id && inv.status !== "draft" && inv.status !== "cancelled")
      .reduce((s, inv) => s + inv.total * inv.fxRate, 0);

    // Border charges
    const borderChargesKes = [...borderCrossings.values()]
      .filter((b) => b.tripId === trip.id)
      .reduce((s, b) => s + (b.chargesKes ?? 0), 0);

    const driverAdvanceUsedKes = trip.driverAdvanceUsedKes ?? 0;

    // Approved + reimbursed expenses (those NOT paid from advance, to avoid
    // double-counting the advance)
    const expensesKes = [...expenses.values()]
      .filter(
        (e) =>
          e.tripId === trip.id &&
          (e.status === "approved" || e.status === "reimbursed") &&
          e.paidBy !== "advance",
      )
      .reduce((s, e) => s + e.amountKes, 0);

    // Fuel logs
    const fuelKes = [...fuelLogs.values()]
      .filter((f) => f.tripId === trip.id)
      .reduce((s, f) => s + f.costKes, 0);

    const totalCostsKes =
      borderChargesKes + driverAdvanceUsedKes + expensesKes + fuelKes;
    const grossProfitKes = revenueKes - totalCostsKes;
    const marginPct = revenueKes > 0 ? grossProfitKes / revenueKes : null;

    rows.push({
      tripId: trip.id,
      number: trip.number,
      origin: trip.origin,
      destination: trip.destination,
      status: trip.status,
      revenueKes,
      borderChargesKes,
      driverAdvanceUsedKes,
      expensesKes,
      fuelKes,
      totalCostsKes,
      grossProfitKes,
      marginPct,
    });
  }
  return rows.sort((a, b) => b.grossProfitKes - a.grossProfitKes);
}

/** Reconciliation summary for a bank account. */
export function bankReconSummary(accountCode: string) {
  const acc = getAccountByCode(accountCode);
  if (!acc) {
    return null;
  }
  const txs = listBankStatementTxs(accountCode);
  const statementBalance = txs.reduce((s, t) => s + (t.debit - t.credit), 0);
  // GL balance in native currency: sum of original debits/credits where currency matches
  const glLines = [...journalLines.values()].filter((l) => l.accountId === acc.id);
  const glPosted = glLines.filter((l) => {
    const e = journalEntries.get(l.journalEntryId);
    return e?.status === "posted";
  });
  const glBalance = glPosted.reduce(
    (s, l) => s + (l.originalDebit - l.originalCredit),
    0,
  );
  const unmatchedStatementCount = txs.filter((t) => t.status === "unmatched").length;
  const unmatchedGlCount = unmatchedGlLinesForAccount(accountCode).length;
  return {
    accountCode,
    accountName: acc.name,
    currency: acc.currency as LedgerCurrency,
    statementBalance,
    glBalance,
    difference: statementBalance - glBalance,
    unmatchedStatementCount,
    unmatchedGlCount,
  };
}

// ============================================================
// Phase 8A — Reports library aggregations
// AR/AP aging, fleet utilisation, fuel efficiency, expense breakdown
// ============================================================

export interface ArAgingRow {
  customerId: string;
  customerName: string;
  current: number;
  d1to30: number;
  d31to60: number;
  d61to90: number;
  d90plus: number;
  total: number;
  /** Number of open invoices. */
  invoiceCount: number;
}

/** Aged AR per customer, in KES (using each invoice's captured FX rate). */
export function arAgingByCustomer(asOf = new Date()): ArAgingRow[] {
  const byCustomer = new Map<string, ArAgingRow>();
  for (const inv of invoices.values()) {
    if (inv.status === "draft" || inv.status === "cancelled" || inv.status === "paid") continue;
    const balanceKes = inv.balance * inv.fxRate;
    if (balanceKes <= 0) continue;
    const bucket = computeAgeBucket(inv.dueDate, asOf);

    if (!byCustomer.has(inv.customerId)) {
      const cust = customers.get(inv.customerId);
      byCustomer.set(inv.customerId, {
        customerId: inv.customerId,
        customerName: cust?.name ?? "Unknown",
        current: 0,
        d1to30: 0,
        d31to60: 0,
        d61to90: 0,
        d90plus: 0,
        total: 0,
        invoiceCount: 0,
      });
    }
    const row = byCustomer.get(inv.customerId)!;
    if (bucket === "current") row.current += balanceKes;
    else if (bucket === "1-30") row.d1to30 += balanceKes;
    else if (bucket === "31-60") row.d31to60 += balanceKes;
    else if (bucket === "61-90") row.d61to90 += balanceKes;
    else row.d90plus += balanceKes;
    row.total += balanceKes;
    row.invoiceCount++;
  }
  return [...byCustomer.values()].sort((a, b) => b.total - a.total);
}

export interface ApAgingRow {
  supplierId: string;
  supplierName: string;
  current: number;
  d1to30: number;
  d31to60: number;
  d61to90: number;
  d90plus: number;
  total: number;
  billCount: number;
}

/** Aged AP per supplier, in KES. Mirror of arAgingByCustomer. */
export function apAgingBySupplier(asOf = new Date()): ApAgingRow[] {
  const bySupplier = new Map<string, ApAgingRow>();
  for (const bill of bills.values()) {
    if (bill.status === "draft" || bill.status === "cancelled" || bill.status === "paid") continue;
    const balanceKes = bill.balance * bill.fxRate;
    if (balanceKes <= 0) continue;
    const bucket = computeAgeBucket(bill.dueDate, asOf);

    if (!bySupplier.has(bill.supplierId)) {
      const sup = suppliers.get(bill.supplierId);
      bySupplier.set(bill.supplierId, {
        supplierId: bill.supplierId,
        supplierName: sup?.name ?? "Unknown",
        current: 0,
        d1to30: 0,
        d31to60: 0,
        d61to90: 0,
        d90plus: 0,
        total: 0,
        billCount: 0,
      });
    }
    const row = bySupplier.get(bill.supplierId)!;
    if (bucket === "current") row.current += balanceKes;
    else if (bucket === "1-30") row.d1to30 += balanceKes;
    else if (bucket === "31-60") row.d31to60 += balanceKes;
    else if (bucket === "61-90") row.d61to90 += balanceKes;
    else row.d90plus += balanceKes;
    row.total += balanceKes;
    row.billCount++;
  }
  return [...bySupplier.values()].sort((a, b) => b.total - a.total);
}

export interface FleetUtilisationRow {
  truckId: string;
  registration: string;
  status: string;
  /** Distinct trips this truck appeared on in the range. */
  tripCount: number;
  /** Total km driven (last odometer - first odometer per truck/range, or sum from fuel logs). */
  kmDriven: number;
  /** Total revenue from invoices on this truck's trips (KES). */
  revenueKes: number;
  /** Total fuel cost (KES). */
  fuelKes: number;
  /** Total expenses (KES). */
  expensesKes: number;
  /** Gross profit. */
  grossProfitKes: number;
  /** Margin %. */
  marginPct: number | null;
}

export function fleetUtilisation(range?: {
  fromDate?: string;
  toDate?: string;
}): FleetUtilisationRow[] {
  const from = range?.fromDate ? new Date(range.fromDate) : new Date(0);
  const to = range?.toDate ? new Date(range.toDate) : new Date(8640000000000000);

  const inRange = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= from && d <= to;
  };

  const rows: FleetUtilisationRow[] = [];
  for (const truck of trucks.values()) {
    const tripIds = new Set<string>();
    for (const t of trips.values()) {
      const ref = t.actualDepartureAt ?? t.plannedDepartureDate ?? t.createdAt;
      if (t.truckId === truck.id && inRange(ref)) {
        tripIds.add(t.id);
      }
    }

    const revenueKes = [...invoices.values()]
      .filter(
        (inv) =>
          inv.tripId &&
          tripIds.has(inv.tripId) &&
          inv.status !== "draft" &&
          inv.status !== "cancelled",
      )
      .reduce((s, inv) => s + inv.total * inv.fxRate, 0);

    const fuelLogsForTruck = [...fuelLogs.values()].filter(
      (f) => f.truckId === truck.id && inRange(f.datetime),
    );
    const fuelKes = fuelLogsForTruck.reduce((s, f) => s + f.costKes, 0);
    const odometers = fuelLogsForTruck.map((f) => f.odometerKm).sort((a, b) => a - b);
    const kmDriven = odometers.length >= 2 ? odometers[odometers.length - 1]! - odometers[0]! : 0;

    const expensesKes = [...expenses.values()]
      .filter(
        (e) =>
          e.tripId &&
          tripIds.has(e.tripId) &&
          (e.status === "approved" || e.status === "reimbursed") &&
          e.paidBy !== "advance",
      )
      .reduce((s, e) => s + e.amountKes, 0);

    const grossProfitKes = revenueKes - fuelKes - expensesKes;
    const marginPct = revenueKes > 0 ? grossProfitKes / revenueKes : null;

    rows.push({
      truckId: truck.id,
      registration: truck.registration,
      status: truck.status,
      tripCount: tripIds.size,
      kmDriven,
      revenueKes,
      fuelKes,
      expensesKes,
      grossProfitKes,
      marginPct,
    });
  }
  return rows.sort((a, b) => b.grossProfitKes - a.grossProfitKes);
}

export interface FuelEfficiencyRow {
  truckId: string;
  registration: string;
  fills: number;
  totalLitres: number;
  totalKes: number;
  /** First-to-last odometer span. */
  kmCovered: number;
  /** L/100km. */
  litresPer100km: number | null;
  /** KES per km. */
  kesPerKm: number | null;
  /** Average price per litre across this period. */
  avgPricePerLitre: number | null;
}

export function fuelEfficiencyByTruck(range?: {
  fromDate?: string;
  toDate?: string;
}): FuelEfficiencyRow[] {
  const from = range?.fromDate ? new Date(range.fromDate) : new Date(0);
  const to = range?.toDate ? new Date(range.toDate) : new Date(8640000000000000);

  const rows: FuelEfficiencyRow[] = [];
  for (const truck of trucks.values()) {
    const fills = [...fuelLogs.values()]
      .filter((f) => f.truckId === truck.id)
      .filter((f) => {
        const d = new Date(f.datetime);
        return d >= from && d <= to;
      })
      .sort((a, b) => a.odometerKm - b.odometerKm);

    if (fills.length === 0) {
      rows.push({
        truckId: truck.id,
        registration: truck.registration,
        fills: 0,
        totalLitres: 0,
        totalKes: 0,
        kmCovered: 0,
        litresPer100km: null,
        kesPerKm: null,
        avgPricePerLitre: null,
      });
      continue;
    }

    const totalLitres = fills.reduce((s, f) => s + f.litres, 0);
    const totalKes = fills.reduce((s, f) => s + f.costKes, 0);
    const kmCovered =
      fills.length >= 2 ? fills[fills.length - 1]!.odometerKm - fills[0]!.odometerKm : 0;
    // L/100km uses all-but-first fill's litres against the km covered between
    // first and last odometers (tank-to-tank method)
    const litresAfterFirst = fills.slice(1).reduce((s, f) => s + f.litres, 0);
    const litresPer100km = kmCovered > 0 ? (litresAfterFirst / kmCovered) * 100 : null;
    const kesPerKm = kmCovered > 0 ? totalKes / kmCovered : null;
    const avgPricePerLitre = totalLitres > 0 ? totalKes / totalLitres : null;

    rows.push({
      truckId: truck.id,
      registration: truck.registration,
      fills: fills.length,
      totalLitres,
      totalKes,
      kmCovered,
      litresPer100km,
      kesPerKm,
      avgPricePerLitre,
    });
  }
  return rows.sort((a, b) => {
    if (a.litresPer100km === null) return 1;
    if (b.litresPer100km === null) return -1;
    return a.litresPer100km - b.litresPer100km;
  });
}

export interface ExpenseBreakdownRow {
  key: string;
  label: string;
  amountKes: number;
  count: number;
}

/** Expense breakdown by category or truck within an optional date range. */
export function expenseBreakdown(opts: {
  dimension: "category" | "truck" | "currency";
  fromDate?: string;
  toDate?: string;
}): ExpenseBreakdownRow[] {
  const from = opts.fromDate ? new Date(opts.fromDate) : new Date(0);
  const to = opts.toDate ? new Date(opts.toDate) : new Date(8640000000000000);

  const bucket = new Map<string, ExpenseBreakdownRow>();
  for (const e of expenses.values()) {
    if (e.status !== "approved" && e.status !== "reimbursed") continue;
    const created = new Date(e.createdAt);
    if (created < from || created > to) continue;

    let key: string;
    let label: string;
    if (opts.dimension === "category") {
      key = e.category;
      label = e.category;
    } else if (opts.dimension === "truck") {
      const trip = e.tripId ? trips.get(e.tripId) : undefined;
      const truck = trip?.truckId ? trucks.get(trip.truckId) : undefined;
      key = truck?.id ?? "__unallocated__";
      label = truck?.registration ?? "Unallocated";
    } else {
      const c = e.originalCurrency ?? "KES";
      key = c;
      label = c;
    }

    if (!bucket.has(key)) {
      bucket.set(key, { key, label, amountKes: 0, count: 0 });
    }
    const row = bucket.get(key)!;
    row.amountKes += e.amountKes;
    row.count++;
  }

  return [...bucket.values()].sort((a, b) => b.amountKes - a.amountKes);
}

// ============================================================
// Phase 8b — Truck Performance Tracker
// Per-truck scorecards, leaderboard, idle list, customer x route matrix
// ============================================================
export interface TruckScorecard {
  truckId: string;
  registration: string;
  status: string;
  tripCount: number;
  /** Total km driven (from fuel odometers in range). */
  kmDriven: number;
  revenueKes: number;
  fuelKes: number;
  expensesKes: number;
  workshopKes: number;
  tyreKes: number;
  totalCostsKes: number;
  grossProfitKes: number;
  marginPct: number | null;
  /** L/100km (tank-to-tank). */
  litresPer100km: number | null;
  kesPerKm: number | null;
  /** Days in the range the truck was on a job card (computed from open/close). */
  downtimeDays: number;
  downtimePct: number;
  /** Compliance documents valid / total. */
  complianceTotal: number;
  complianceValid: number;
  complianceExpiring: number;
  complianceExpired: number;
  /** Days since last trip end (or planned departure if no trips). null = no trips on record. */
  daysSinceLastTrip: number | null;
  /** Composite 0-100 score. */
  score: number;
  /**
   * Fuel-haul KPIs (F-6). Sourced from the captured loading observations
   * on the truck's trips in range. `loadedLitres` is the sum of 20 °C-
   * corrected litres (falling back to observed litres for trips that
   * weren't captured), so per-trip thermal contraction doesn't muddy the
   * KES-per-loaded-litre figure. `avgUllagePct` averages the persisted
   * `ullagePct` across trips that have a discharge captured (others are
   * excluded; partial trips don't drag the figure to zero).
   */
  loadedLitres: number;
  kesPerLoadedLitre: number | null;
  avgUllagePct: number | null;
  tripsWithUllage: number;
}

function rangeBounds(range?: { fromDate?: string; toDate?: string }) {
  const from = range?.fromDate ? new Date(range.fromDate) : new Date(0);
  const to = range?.toDate ? new Date(range.toDate) : new Date(8640000000000000);
  return { from, to };
}

function truckScorecardInternal(
  truckId: string,
  range?: { fromDate?: string; toDate?: string },
  today = new Date(),
): TruckScorecard | undefined {
  const truck = trucks.get(truckId);
  if (!truck) return undefined;
  const { from, to } = rangeBounds(range);
  const inRange = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= from && d <= to;
  };

  // Trips for this truck in range
  const truckTrips = [...trips.values()].filter((t) => {
    const ref = t.actualDepartureAt ?? t.plannedDepartureDate ?? t.createdAt;
    return t.truckId === truck.id && inRange(ref);
  });
  const tripIds = new Set(truckTrips.map((t) => t.id));

  const revenueKes = [...invoices.values()]
    .filter(
      (inv) =>
        inv.tripId &&
        tripIds.has(inv.tripId) &&
        inv.status !== "draft" &&
        inv.status !== "cancelled",
    )
    .reduce((s, inv) => s + inv.total * inv.fxRate, 0);

  const fuelLogsForTruck = [...fuelLogs.values()].filter(
    (f) => f.truckId === truck.id && inRange(f.datetime),
  );
  const fuelKes = fuelLogsForTruck.reduce((s, f) => s + f.costKes, 0);

  // KM driven (first vs last odometer)
  const odoSorted = [...fuelLogsForTruck].sort((a, b) => a.odometerKm - b.odometerKm);
  const kmDriven =
    odoSorted.length >= 2
      ? odoSorted[odoSorted.length - 1]!.odometerKm - odoSorted[0]!.odometerKm
      : 0;
  // L/100km using tank-to-tank (litres after first fill / km between first & last)
  const litresAfterFirst = odoSorted.slice(1).reduce((s, f) => s + f.litres, 0);
  const litresPer100km = kmDriven > 0 ? (litresAfterFirst / kmDriven) * 100 : null;
  const kesPerKm = kmDriven > 0 ? fuelKes / kmDriven : null;

  // Trip expenses
  const expensesKes = [...expenses.values()]
    .filter(
      (e) =>
        e.tripId &&
        tripIds.has(e.tripId) &&
        (e.status === "approved" || e.status === "reimbursed") &&
        e.paidBy !== "advance",
    )
    .reduce((s, e) => s + e.amountKes, 0);

  // Workshop cost: closed job cards for this truck in range, with tyre split
  let workshopKes = 0;
  let tyreKes = 0;
  let downtimeDays = 0;
  for (const jc of jobCards.values()) {
    if (jc.truckId !== truck.id) continue;
    if (!inRange(jc.openedAt) && !inRange(jc.closedAt ?? jc.openedAt)) continue;
    workshopKes += jc.totalKes ?? 0;

    // Tyre spend by description match
    const spares = [...jobCardSpares.values()].filter((s) => s.jobCardId === jc.id);
    for (const s of spares) {
      if (/tyre|tire|tread/i.test(s.description)) tyreKes += s.totalCostKes;
    }

    // Downtime: days between openedAt and closedAt (clamped to range)
    const opened = new Date(jc.openedAt);
    const closed = jc.closedAt ? new Date(jc.closedAt) : today;
    const start = opened < from ? from : opened;
    const end = closed > to ? to : closed;
    if (end > start) {
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
      downtimeDays += diffDays;
    }
  }
  const totalRangeDays = Math.max(
    1,
    Math.ceil(
      (Math.min(to.getTime(), today.getTime()) - from.getTime()) / 86_400_000,
    ),
  );
  const downtimePct = Math.min(100, (downtimeDays / totalRangeDays) * 100);

  const totalCostsKes = fuelKes + expensesKes + workshopKes;
  const grossProfitKes = revenueKes - totalCostsKes;
  const marginPct = revenueKes > 0 ? grossProfitKes / revenueKes : null;

  // Fuel-haul KPIs (F-6): sum loaded litres (prefer 20 °C corrected),
  // average ullage % across trips that have a discharge captured.
  let loadedLitres = 0;
  let ullageSum = 0;
  let tripsWithUllage = 0;
  for (const t of truckTrips) {
    const l = t.loadedLitres20C ?? t.loadedLitres;
    if (l !== undefined) loadedLitres += l;
    if (t.ullagePct !== undefined && t.dischargedLitres !== undefined) {
      ullageSum += t.ullagePct;
      tripsWithUllage++;
    }
  }
  const kesPerLoadedLitre = loadedLitres > 0 ? revenueKes / loadedLitres : null;
  const avgUllagePct = tripsWithUllage > 0 ? ullageSum / tripsWithUllage : null;

  // Compliance per linked driver (truck's default driver) is the closest proxy
  // for "operational compliance attached to the truck".
  let complianceTotal = 0;
  let complianceValid = 0;
  let complianceExpiring = 0;
  let complianceExpired = 0;
  for (const e of employees.values()) {
    if (e.driverId !== truck.currentDriverId) continue;
    for (const r of complianceRecords.values()) {
      if (r.employeeId !== e.id) continue;
      complianceTotal++;
      const days = r.expiryDate
        ? Math.floor((new Date(r.expiryDate).getTime() - today.getTime()) / 86_400_000)
        : null;
      if (days === null) complianceExpired++;
      else if (days < 0) complianceExpired++;
      else if (days <= 30) complianceExpiring++;
      else complianceValid++;
    }
  }

  // Days since last trip
  const lastTripRef = truckTrips
    .map((t) => t.actualDeliveryAt ?? t.actualDepartureAt ?? t.plannedDepartureDate ?? t.createdAt)
    .filter((x): x is string => Boolean(x))
    .sort()
    .pop();
  const daysSinceLastTrip = lastTripRef
    ? Math.floor((today.getTime() - new Date(lastTripRef).getTime()) / 86_400_000)
    : null;

  // Composite score (0-100). Weights:
  //  40 margin (mapped 0% -> 0, 30%+ -> 40)
  //  25 fuel  (35 L/100km -> 25, 50 -> 0)
  //  15 downtime (0% -> 15, 30%+ -> 0)
  //  10 compliance (valid/total)
  //  10 utilisation (3+ trips in range -> 10)
  const marginScore = marginPct === null
    ? 0
    : Math.max(0, Math.min(40, (marginPct / 0.3) * 40));
  const fuelScore = litresPer100km === null
    ? 12   // partial credit when no fuel data
    : Math.max(0, Math.min(25, 25 - ((litresPer100km - 35) / 15) * 25));
  const downtimeScore = Math.max(0, 15 - (downtimePct / 30) * 15);
  const complianceScore =
    complianceTotal === 0 ? 6 : (complianceValid / complianceTotal) * 10;
  const utilScore = Math.min(10, (truckTrips.length / 3) * 10);
  const score = Math.round(marginScore + fuelScore + downtimeScore + complianceScore + utilScore);

  return {
    truckId: truck.id,
    registration: truck.registration,
    status: truck.status,
    tripCount: truckTrips.length,
    kmDriven,
    revenueKes,
    fuelKes,
    expensesKes,
    workshopKes,
    tyreKes,
    totalCostsKes,
    grossProfitKes,
    marginPct,
    litresPer100km,
    kesPerKm,
    downtimeDays,
    downtimePct,
    complianceTotal,
    complianceValid,
    complianceExpiring,
    complianceExpired,
    daysSinceLastTrip,
    score,
    loadedLitres,
    kesPerLoadedLitre,
    avgUllagePct,
    tripsWithUllage,
  };
}

export function truckScorecard(
  truckId: string,
  range?: { fromDate?: string; toDate?: string },
): TruckScorecard | undefined {
  return truckScorecardInternal(truckId, range);
}

export function truckLeaderboard(range?: {
  fromDate?: string;
  toDate?: string;
}): TruckScorecard[] {
  const today = new Date();
  const rows: TruckScorecard[] = [];
  for (const t of trucks.values()) {
    const card = truckScorecardInternal(t.id, range, today);
    if (card) rows.push(card);
  }
  return rows.sort((a, b) => b.score - a.score);
}

export interface IdleTruckRow {
  truckId: string;
  registration: string;
  status: string;
  daysIdle: number | null;
  lastTripNumber: string | null;
  lastTripDate: string | null;
  defaultDriverName: string | null;
}

/** Trucks with no trip activity in the last `withinDays` (or never seen). */
export function idleTrucks(withinDays = 14): IdleTruckRow[] {
  const today = new Date();
  const out: IdleTruckRow[] = [];
  for (const t of trucks.values()) {
    const truckTrips = [...trips.values()].filter((trip) => trip.truckId === t.id);
    let lastDate: string | null = null;
    let lastNumber: string | null = null;
    for (const trip of truckTrips) {
      const ref = trip.actualDeliveryAt ?? trip.actualDepartureAt ?? trip.plannedDepartureDate ?? trip.createdAt;
      if (!lastDate || ref > lastDate) {
        lastDate = ref;
        lastNumber = trip.number;
      }
    }
    const daysIdle = lastDate
      ? Math.floor((today.getTime() - new Date(lastDate).getTime()) / 86_400_000)
      : null;
    if (daysIdle === null || daysIdle >= withinDays) {
      const driver = t.currentDriverId ? drivers.get(t.currentDriverId) : undefined;
      out.push({
        truckId: t.id,
        registration: t.registration,
        status: t.status,
        daysIdle,
        lastTripNumber: lastNumber,
        lastTripDate: lastDate ? lastDate.slice(0, 10) : null,
        defaultDriverName: driver?.fullName ?? null,
      });
    }
  }
  return out.sort((a, b) => {
    if (a.daysIdle === null) return -1;
    if (b.daysIdle === null) return 1;
    return b.daysIdle - a.daysIdle;
  });
}

export interface CustomerRouteCell {
  customerId: string;
  customerName: string;
  route: string;        // "Mombasa → Kampala"
  origin: string;
  destination: string;
  tripCount: number;
  revenueKes: number;
}

/** Customer x route pivot for the given range. */
export function customerRouteMatrix(range?: {
  fromDate?: string;
  toDate?: string;
}): CustomerRouteCell[] {
  const { from, to } = rangeBounds(range);
  const inRange = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= from && d <= to;
  };
  const cells = new Map<string, CustomerRouteCell>();
  for (const trip of trips.values()) {
    const ref = trip.actualDeliveryAt ?? trip.actualDepartureAt ?? trip.plannedDepartureDate ?? trip.createdAt;
    if (!inRange(ref)) continue;
    const booking = bookings.get(trip.bookingId);
    if (!booking) continue;
    const cust = customers.get(booking.customerId);
    if (!cust) continue;
    const route = `${trip.origin} → ${trip.destination}`;
    const key = `${cust.id}|${route}`;
    if (!cells.has(key)) {
      cells.set(key, {
        customerId: cust.id,
        customerName: cust.name,
        route,
        origin: trip.origin,
        destination: trip.destination,
        tripCount: 0,
        revenueKes: 0,
      });
    }
    const cell = cells.get(key)!;
    cell.tripCount++;
    const tripRevenue = [...invoices.values()]
      .filter(
        (inv) =>
          inv.tripId === trip.id &&
          inv.status !== "draft" &&
          inv.status !== "cancelled",
      )
      .reduce((s, inv) => s + inv.total * inv.fxRate, 0);
    cell.revenueKes += tripRevenue;
  }
  return [...cells.values()].sort((a, b) => b.revenueKes - a.revenueKes);
}

// ============================================================
// P&L per truck — proper income-statement structure (Phase 8b+)
//   Revenue
//   – Direct costs (fuel, border, advance used, trip expenses)
//   = Gross profit
//   – Indirect costs (workshop incl. tyres)
//   = Operating profit
// All amounts in KES. Tyres are split out of workshop for visibility but
// included in the indirect-cost total.
// ============================================================
export interface TruckPnL {
  truckId: string;
  registration: string;
  status: string;
  // Activity
  tripCount: number;
  kmDriven: number;
  // Revenue
  revenueKes: number;
  invoiceCount: number;
  // Direct costs
  fuelKes: number;
  borderChargesKes: number;
  driverAdvanceUsedKes: number;
  tripExpensesKes: number;
  directCostTotal: number;
  // Gross
  grossProfit: number;
  grossMarginPct: number | null;
  // Indirect
  workshopKes: number;
  tyreKes: number;
  indirectCostTotal: number;
  // Operating
  operatingProfit: number;
  operatingMarginPct: number | null;
  // Unit economics
  revenuePerKm: number | null;
  costPerKm: number | null;
  profitPerKm: number | null;
}

export function truckProfitAndLoss(
  truckId: string,
  range?: { fromDate?: string; toDate?: string },
): TruckPnL | undefined {
  const truck = trucks.get(truckId);
  if (!truck) return undefined;
  const { from, to } = rangeBounds(range);
  const inRange = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= from && d <= to;
  };

  // Trips for this truck in range
  const truckTrips = [...trips.values()].filter((t) => {
    const ref = t.actualDepartureAt ?? t.plannedDepartureDate ?? t.createdAt;
    return t.truckId === truck.id && inRange(ref);
  });
  const tripIds = new Set(truckTrips.map((t) => t.id));

  // Revenue
  const revenueInvoices = [...invoices.values()].filter(
    (inv) =>
      inv.tripId &&
      tripIds.has(inv.tripId) &&
      inv.status !== "draft" &&
      inv.status !== "cancelled",
  );
  const revenueKes = revenueInvoices.reduce((s, inv) => s + inv.total * inv.fxRate, 0);

  // Direct: fuel
  const fuelLogsForTruck = [...fuelLogs.values()].filter(
    (f) => f.truckId === truck.id && inRange(f.datetime),
  );
  const fuelKes = fuelLogsForTruck.reduce((s, f) => s + f.costKes, 0);
  const odoSorted = [...fuelLogsForTruck].sort((a, b) => a.odometerKm - b.odometerKm);
  const kmDriven =
    odoSorted.length >= 2
      ? odoSorted[odoSorted.length - 1]!.odometerKm - odoSorted[0]!.odometerKm
      : 0;

  // Direct: border charges
  const borderChargesKes = [...borderCrossings.values()]
    .filter((b) => b.tripId && tripIds.has(b.tripId))
    .reduce((s, b) => s + (b.chargesKes ?? 0), 0);

  // Direct: driver advance used (sum across trips)
  const driverAdvanceUsedKes = truckTrips.reduce(
    (s, t) => s + (t.driverAdvanceUsedKes ?? 0),
    0,
  );

  // Direct: approved/reimbursed expenses (excluding advance-paid to avoid double-count)
  const tripExpensesKes = [...expenses.values()]
    .filter(
      (e) =>
        e.tripId &&
        tripIds.has(e.tripId) &&
        (e.status === "approved" || e.status === "reimbursed") &&
        e.paidBy !== "advance",
    )
    .reduce((s, e) => s + e.amountKes, 0);

  const directCostTotal = fuelKes + borderChargesKes + driverAdvanceUsedKes + tripExpensesKes;
  const grossProfit = revenueKes - directCostTotal;
  const grossMarginPct = revenueKes > 0 ? grossProfit / revenueKes : null;

  // Indirect: workshop (closed or completed job cards in range; tyres split out)
  let workshopKes = 0;
  let tyreKes = 0;
  for (const jc of jobCards.values()) {
    if (jc.truckId !== truck.id) continue;
    if (!inRange(jc.openedAt) && !inRange(jc.closedAt ?? jc.openedAt)) continue;
    workshopKes += jc.totalKes ?? 0;
    const spares = [...jobCardSpares.values()].filter((s) => s.jobCardId === jc.id);
    for (const s of spares) {
      if (/tyre|tire|tread/i.test(s.description)) tyreKes += s.totalCostKes;
    }
  }

  const indirectCostTotal = workshopKes;
  const operatingProfit = grossProfit - indirectCostTotal;
  const operatingMarginPct = revenueKes > 0 ? operatingProfit / revenueKes : null;

  const revenuePerKm = kmDriven > 0 ? revenueKes / kmDriven : null;
  const costPerKm = kmDriven > 0 ? (directCostTotal + indirectCostTotal) / kmDriven : null;
  const profitPerKm = kmDriven > 0 ? operatingProfit / kmDriven : null;

  return {
    truckId: truck.id,
    registration: truck.registration,
    status: truck.status,
    tripCount: truckTrips.length,
    kmDriven,
    revenueKes,
    invoiceCount: revenueInvoices.length,
    fuelKes,
    borderChargesKes,
    driverAdvanceUsedKes,
    tripExpensesKes,
    directCostTotal,
    grossProfit,
    grossMarginPct,
    workshopKes,
    tyreKes,
    indirectCostTotal,
    operatingProfit,
    operatingMarginPct,
    revenuePerKm,
    costPerKm,
    profitPerKm,
  };
}

export function fleetProfitAndLoss(range?: {
  fromDate?: string;
  toDate?: string;
}): TruckPnL[] {
  const out: TruckPnL[] = [];
  for (const t of trucks.values()) {
    const pl = truckProfitAndLoss(t.id, range);
    if (pl) out.push(pl);
  }
  return out.sort((a, b) => b.operatingProfit - a.operatingProfit);
}

// ============================================================
// HR (Phase 6A): Departments, Employees, Contracts
// ============================================================
const departmentSeed: Department[] = [
  { id: "dept-ops", name: "Operations", code: "OPS", costCentre: "CC-100", description: "Trip planning, dispatch, drivers, cross-border ops." },
  { id: "dept-wsp", name: "Workshop", code: "WSP", costCentre: "CC-200", description: "Truck maintenance, repair and tyre management." },
  { id: "dept-fin", name: "Finance", code: "FIN", costCentre: "CC-300", description: "Accounting, AR / AP, payroll, treasury." },
  { id: "dept-hr",  name: "Human Resources", code: "HR", costCentre: "CC-400", description: "People, payroll inputs, contracts, leave, appraisals." },
  { id: "dept-it",  name: "IT & Systems", code: "IT", costCentre: "CC-500", description: "TX System, telematics, integrations." },
  { id: "dept-mgmt", name: "Management", code: "MGMT", costCentre: "CC-900", description: "Executive leadership." },
];
const departments = new Map<string, Department>(
  DEMO_DATA ? departmentSeed.map((d) => [d.id, d]) : [],
);

const employeeSeed: Employee[] = [
  // Management
  {
    id: "emp-001",
    employeeNumber: "NVL-001",
    fullName: "Daniel Achieng",
    preferredName: "Daniel",
    gender: "male",
    dob: "1978-03-12",
    nationalId: "12345678",
    kraPin: "A001234567Z",
    nssfNo: "NSSF-100001",
    shaNo: "SHA-100001",
    mpesaPhone: "+254 722 000 001",
    email: "daniel@nilevalley.co.ke",
    physicalAddress: "Westlands, Nairobi",
    bankName: "Equity Bank",
    bankBranch: "Westlands",
    bankAccountNo: "0100200300401",
    bankAccountName: "Daniel Achieng",
    hireDate: "2020-01-15",
    status: "active",
    departmentId: "dept-mgmt",
    jobTitle: "Managing Director",
    createdAt: "2020-01-15T08:00:00Z",
  },
  {
    id: "emp-002",
    employeeNumber: "NVL-002",
    fullName: "Esther Wanjiru",
    preferredName: "Esther",
    gender: "female",
    dob: "1985-07-22",
    nationalId: "23456789",
    kraPin: "A002345678Y",
    nssfNo: "NSSF-100002",
    shaNo: "SHA-100002",
    mpesaPhone: "+254 722 000 002",
    email: "esther@nilevalley.co.ke",
    physicalAddress: "Kileleshwa, Nairobi",
    bankName: "KCB",
    bankBranch: "Sarit Centre",
    bankAccountNo: "1101200300402",
    bankAccountName: "Esther Wanjiru",
    hireDate: "2020-04-01",
    status: "active",
    departmentId: "dept-fin",
    jobTitle: "Finance Manager",
    lineManagerId: "emp-001",
    createdAt: "2020-04-01T08:00:00Z",
  },
  {
    id: "emp-003",
    employeeNumber: "NVL-003",
    fullName: "Brian Otieno",
    gender: "male",
    dob: "1989-11-04",
    nationalId: "34567890",
    kraPin: "A003456789X",
    nssfNo: "NSSF-100003",
    shaNo: "SHA-100003",
    mpesaPhone: "+254 722 000 003",
    email: "brian@nilevalley.co.ke",
    physicalAddress: "Kasarani, Nairobi",
    bankName: "Co-op Bank",
    bankAccountNo: "0102200300403",
    hireDate: "2021-02-15",
    status: "active",
    departmentId: "dept-ops",
    jobTitle: "Operations Manager",
    lineManagerId: "emp-001",
    createdAt: "2021-02-15T08:00:00Z",
  },
  {
    id: "emp-004",
    employeeNumber: "NVL-004",
    fullName: "Faith Njeri",
    gender: "female",
    dob: "1992-05-18",
    nationalId: "45678901",
    kraPin: "A004567890W",
    nssfNo: "NSSF-100004",
    shaNo: "SHA-100004",
    mpesaPhone: "+254 722 000 004",
    email: "faith@nilevalley.co.ke",
    physicalAddress: "Kahawa West, Nairobi",
    bankName: "Equity Bank",
    bankAccountNo: "0100200300404",
    hireDate: "2022-06-01",
    status: "active",
    departmentId: "dept-hr",
    jobTitle: "HR Manager",
    lineManagerId: "emp-001",
    createdAt: "2022-06-01T08:00:00Z",
  },
  {
    id: "emp-005",
    employeeNumber: "NVL-005",
    fullName: "Peter Kamau",
    gender: "male",
    dob: "1980-09-30",
    nationalId: "56789012",
    kraPin: "A005678901V",
    nssfNo: "NSSF-100005",
    shaNo: "SHA-100005",
    mpesaPhone: "+254 722 000 005",
    physicalAddress: "Embakasi, Nairobi",
    bankName: "KCB",
    bankAccountNo: "1101200300405",
    hireDate: "2019-11-01",
    status: "active",
    departmentId: "dept-wsp",
    jobTitle: "Workshop Foreman",
    lineManagerId: "emp-003",
    createdAt: "2019-11-01T08:00:00Z",
  },
  {
    id: "emp-006",
    employeeNumber: "NVL-006",
    fullName: "Grace Akinyi",
    gender: "female",
    dob: "1995-01-12",
    nationalId: "67890123",
    mpesaPhone: "+254 722 000 006",
    email: "grace@nilevalley.co.ke",
    hireDate: "2024-01-15",
    status: "probation",
    departmentId: "dept-ops",
    jobTitle: "Dispatcher",
    lineManagerId: "emp-003",
    createdAt: "2024-01-15T08:00:00Z",
  },
  {
    id: "emp-007",
    employeeNumber: "NVL-007",
    fullName: "Samuel Kiprotich",
    gender: "male",
    dob: "1990-08-25",
    nationalId: "78901234",
    kraPin: "A006789012U",
    mpesaPhone: "+254 722 000 007",
    physicalAddress: "Ruiru",
    bankName: "Equity Bank",
    bankAccountNo: "0100200300407",
    hireDate: "2022-03-01",
    status: "active",
    departmentId: "dept-wsp",
    jobTitle: "Mechanic",
    lineManagerId: "emp-005",
    createdAt: "2022-03-01T08:00:00Z",
  },
  // Drivers — link via driverId
  {
    id: "emp-100",
    employeeNumber: "NVL-100",
    fullName: "Joseph Mwangi",
    gender: "male",
    dob: "1982-04-10",
    nationalId: "10000001",
    kraPin: "A010000001Z",
    nssfNo: "NSSF-200001",
    shaNo: "SHA-200001",
    mpesaPhone: "+254 722 410 220",
    physicalAddress: "Athi River",
    bankName: "Equity Bank",
    bankAccountNo: "0100200400001",
    hireDate: "2021-05-01",
    status: "active",
    departmentId: "dept-ops",
    jobTitle: "Long-haul Driver (CE)",
    lineManagerId: "emp-003",
    driverId: "drv-001",
    createdAt: "2021-05-01T08:00:00Z",
  },
  {
    id: "emp-101",
    employeeNumber: "NVL-101",
    fullName: "Ali Hassan",
    gender: "male",
    nationalId: "10000002",
    mpesaPhone: "+254 722 410 221",
    hireDate: "2021-06-15",
    status: "active",
    departmentId: "dept-ops",
    jobTitle: "Long-haul Driver (CE)",
    lineManagerId: "emp-003",
    driverId: "drv-002",
    createdAt: "2021-06-15T08:00:00Z",
  },
  {
    id: "emp-102",
    employeeNumber: "NVL-102",
    fullName: "Daniel Otieno",
    gender: "male",
    nationalId: "10000003",
    mpesaPhone: "+254 722 410 222",
    hireDate: "2022-01-10",
    status: "active",
    departmentId: "dept-ops",
    jobTitle: "Long-haul Driver (CE)",
    lineManagerId: "emp-003",
    driverId: "drv-003",
    createdAt: "2022-01-10T08:00:00Z",
  },
  {
    id: "emp-103",
    employeeNumber: "NVL-103",
    fullName: "Mwangi Kariuki",
    gender: "male",
    nationalId: "10000004",
    mpesaPhone: "+254 722 410 223",
    hireDate: "2022-04-20",
    status: "active",
    departmentId: "dept-ops",
    jobTitle: "Long-haul Driver (CE)",
    lineManagerId: "emp-003",
    driverId: "drv-004",
    createdAt: "2022-04-20T08:00:00Z",
  },
  {
    id: "emp-104",
    employeeNumber: "NVL-104",
    fullName: "Patrick Wafula",
    gender: "male",
    nationalId: "10000005",
    mpesaPhone: "+254 722 410 224",
    hireDate: "2023-02-01",
    status: "active",
    departmentId: "dept-ops",
    jobTitle: "Long-haul Driver (CE)",
    lineManagerId: "emp-003",
    driverId: "drv-005",
    createdAt: "2023-02-01T08:00:00Z",
  },
  {
    id: "emp-105",
    employeeNumber: "NVL-105",
    fullName: "Stephen Njoroge",
    gender: "male",
    nationalId: "10000006",
    mpesaPhone: "+254 722 410 225",
    hireDate: "2023-08-15",
    status: "active",
    departmentId: "dept-ops",
    jobTitle: "Driver (BCE)",
    lineManagerId: "emp-003",
    driverId: "drv-006",
    createdAt: "2023-08-15T08:00:00Z",
  },
  {
    id: "emp-106",
    employeeNumber: "NVL-106",
    fullName: "Hassan Omar",
    gender: "male",
    nationalId: "10000007",
    mpesaPhone: "+254 722 410 226",
    hireDate: "2024-01-08",
    status: "probation",
    departmentId: "dept-ops",
    jobTitle: "Driver (BCE)",
    lineManagerId: "emp-003",
    driverId: "drv-007",
    createdAt: "2024-01-08T08:00:00Z",
  },
];
const employees = new Map<string, Employee>(
  DEMO_DATA ? employeeSeed.map((e) => [e.id, e]) : [],
);

// Set department heads now that employees exist
departments.set("dept-mgmt", { ...departments.get("dept-mgmt")!, headEmployeeId: "emp-001" });
departments.set("dept-fin",  { ...departments.get("dept-fin")!,  headEmployeeId: "emp-002" });
departments.set("dept-ops",  { ...departments.get("dept-ops")!,  headEmployeeId: "emp-003" });
departments.set("dept-hr",   { ...departments.get("dept-hr")!,   headEmployeeId: "emp-004" });
departments.set("dept-wsp",  { ...departments.get("dept-wsp")!,  headEmployeeId: "emp-005" });

const contractSeed: Contract[] = [
  {
    id: "ctr-001",
    employeeId: "emp-001",
    type: "permanent",
    startDate: "2020-01-15",
    noticePeriodDays: 90,
    basicSalary: 600_000,
    currency: "KES",
    payFrequency: "monthly",
    allowances: [
      { name: "House", amount: 200_000, taxable: true },
      { name: "Transport", amount: 50_000, taxable: false },
    ],
    status: "active",
    createdAt: "2020-01-15T08:00:00Z",
  },
  {
    id: "ctr-002",
    employeeId: "emp-002",
    type: "permanent",
    startDate: "2020-04-01",
    noticePeriodDays: 60,
    basicSalary: 350_000,
    currency: "KES",
    payFrequency: "monthly",
    allowances: [
      { name: "House", amount: 100_000, taxable: true },
      { name: "Transport", amount: 30_000, taxable: false },
    ],
    status: "active",
    createdAt: "2020-04-01T08:00:00Z",
  },
  {
    id: "ctr-003",
    employeeId: "emp-003",
    type: "permanent",
    startDate: "2021-02-15",
    noticePeriodDays: 60,
    basicSalary: 280_000,
    currency: "KES",
    payFrequency: "monthly",
    allowances: [
      { name: "House", amount: 80_000, taxable: true },
      { name: "Transport", amount: 25_000, taxable: false },
    ],
    status: "active",
    createdAt: "2021-02-15T08:00:00Z",
  },
  {
    id: "ctr-004",
    employeeId: "emp-004",
    type: "permanent",
    startDate: "2022-06-01",
    noticePeriodDays: 60,
    basicSalary: 220_000,
    currency: "KES",
    payFrequency: "monthly",
    allowances: [
      { name: "House", amount: 60_000, taxable: true },
      { name: "Transport", amount: 20_000, taxable: false },
    ],
    status: "active",
    createdAt: "2022-06-01T08:00:00Z",
  },
  {
    id: "ctr-005",
    employeeId: "emp-005",
    type: "permanent",
    startDate: "2019-11-01",
    noticePeriodDays: 60,
    basicSalary: 180_000,
    currency: "KES",
    payFrequency: "monthly",
    allowances: [
      { name: "House", amount: 40_000, taxable: true },
      { name: "Transport", amount: 15_000, taxable: false },
    ],
    status: "active",
    createdAt: "2019-11-01T08:00:00Z",
  },
  {
    id: "ctr-006",
    employeeId: "emp-006",
    type: "fixed_term",
    startDate: "2024-01-15",
    endDate: "2026-01-14",
    probationEndDate: "2024-07-14",
    noticePeriodDays: 30,
    basicSalary: 75_000,
    currency: "KES",
    payFrequency: "monthly",
    allowances: [{ name: "Transport", amount: 10_000, taxable: false }],
    status: "active",
    createdAt: "2024-01-15T08:00:00Z",
  },
  {
    id: "ctr-007",
    employeeId: "emp-007",
    type: "permanent",
    startDate: "2022-03-01",
    noticePeriodDays: 30,
    basicSalary: 80_000,
    currency: "KES",
    payFrequency: "monthly",
    allowances: [{ name: "Transport", amount: 12_000, taxable: false }],
    status: "active",
    createdAt: "2022-03-01T08:00:00Z",
  },
  // Driver contracts — uniform basic + per-day road allowance via payroll
  ...["emp-100", "emp-101", "emp-102", "emp-103", "emp-104"].map((eid, i) => ({
    id: `ctr-1${String(i).padStart(2, "0")}`,
    employeeId: eid,
    type: "permanent" as const,
    startDate: "2022-01-01",
    noticePeriodDays: 30,
    basicSalary: 65_000,
    currency: "KES" as const,
    payFrequency: "monthly" as const,
    allowances: [
      { name: "Transport", amount: 8_000, taxable: false },
      { name: "Cross-border per diem", amount: 12_000, taxable: false },
    ],
    status: "active" as const,
    createdAt: "2022-01-01T08:00:00Z",
  })),
  {
    id: "ctr-105",
    employeeId: "emp-105",
    type: "permanent",
    startDate: "2023-08-15",
    noticePeriodDays: 30,
    basicSalary: 55_000,
    currency: "KES",
    payFrequency: "monthly",
    allowances: [{ name: "Transport", amount: 6_000, taxable: false }],
    status: "active",
    createdAt: "2023-08-15T08:00:00Z",
  },
  {
    id: "ctr-106",
    employeeId: "emp-106",
    type: "fixed_term",
    startDate: "2024-01-08",
    endDate: "2025-01-07",
    probationEndDate: "2024-07-07",
    noticePeriodDays: 14,
    basicSalary: 45_000,
    currency: "KES",
    payFrequency: "monthly",
    allowances: [{ name: "Transport", amount: 5_000, taxable: false }],
    status: "active",
    createdAt: "2024-01-08T08:00:00Z",
  },
];
const contracts = new Map<string, Contract>(
  DEMO_DATA ? contractSeed.map((c) => [c.id, c]) : [],
);

// ----- Departments -----
export function listDepartments(): Department[] {
  return [...departments.values()].sort((a, b) => a.name.localeCompare(b.name));
}
export function getDepartment(id: string): Department | undefined {
  return departments.get(id);
}
export function createDepartment(input: Omit<Department, "id">): Department {
  const id = `dept-${randomUUID().slice(0, 8)}`;
  const d: Department = { ...input, id };
  departments.set(id, d);
  return d;
}

// ----- Employees -----
export function listEmployees(filter?: {
  departmentId?: string;
  status?: EmployeeStatus;
  search?: string;
}): Employee[] {
  let all = [...employees.values()];
  if (filter?.departmentId) all = all.filter((e) => e.departmentId === filter.departmentId);
  if (filter?.status) all = all.filter((e) => e.status === filter.status);
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    all = all.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeNumber.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q) ||
        e.nationalId.includes(q),
    );
  }
  return all.sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber));
}
export function getEmployee(id: string): Employee | undefined {
  return employees.get(id);
}
export function getEmployeeByDriverId(driverId: string): Employee | undefined {
  for (const e of employees.values()) if (e.driverId === driverId) return e;
  return undefined;
}
export function nextEmployeeNumber(): string {
  let max = 0;
  for (const e of employees.values()) {
    const m = e.employeeNumber.match(/^NVL-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1]!, 10));
  }
  return `NVL-${String(max + 1).padStart(3, "0")}`;
}
export function createEmployee(input: Omit<Employee, "id" | "createdAt">): Employee {
  const id = `emp-${randomUUID().slice(0, 8)}`;
  const e: Employee = { ...input, id, createdAt: new Date().toISOString() };
  employees.set(id, e);
  return e;
}
export function updateEmployee(id: string, patch: Partial<Employee>): Employee | undefined {
  const e = employees.get(id);
  if (!e) return undefined;
  const updated: Employee = { ...e, ...patch, id: e.id, createdAt: e.createdAt };
  employees.set(id, updated);
  return updated;
}

// ----- Contracts -----
export function listContracts(filter?: {
  employeeId?: string;
  status?: ContractStatus;
}): Contract[] {
  let all = [...contracts.values()];
  if (filter?.employeeId) all = all.filter((c) => c.employeeId === filter.employeeId);
  if (filter?.status) all = all.filter((c) => c.status === filter.status);
  return all.sort((a, b) => b.startDate.localeCompare(a.startDate));
}
export function getContract(id: string): Contract | undefined {
  return contracts.get(id);
}
export function activeContractFor(employeeId: string): Contract | undefined {
  return [...contracts.values()].find(
    (c) => c.employeeId === employeeId && c.status === "active",
  );
}
export function createContract(input: Omit<Contract, "id" | "createdAt">): Contract {
  const id = `ctr-${randomUUID().slice(0, 8)}`;
  const c: Contract = { ...input, id, createdAt: new Date().toISOString() };
  contracts.set(id, c);
  return c;
}
export function terminateContract(id: string): Contract | undefined {
  const c = contracts.get(id);
  if (!c) return undefined;
  const updated: Contract = { ...c, status: "terminated" };
  contracts.set(id, updated);
  return updated;
}

/** Total monthly cost (basic + allowances) for an employee in their contract currency. */
export function monthlyCostForEmployee(employeeId: string): {
  basic: number;
  allowances: number;
  total: number;
  currency: string;
} | null {
  const c = activeContractFor(employeeId);
  if (!c) return null;
  const allow = c.allowances.reduce((s, a) => s + a.amount, 0);
  return {
    basic: c.basicSalary,
    allowances: allow,
    total: c.basicSalary + allow,
    currency: c.currency,
  };
}

// ============================================================
// HR Compliance (Phase 6B): driving licences, medicals, passports
// ============================================================
const complianceRecords = new Map<string, ComplianceRecord>();

function seedComplianceFromDrivers() {
  // Each driver-linked employee gets compliance records derived from
  // the existing Driver entity (licence/medical/passport/COMESA).
  for (const e of employees.values()) {
    if (!e.driverId) continue;
    const d = drivers.get(e.driverId);
    if (!d) continue;
    if (d.licenceNumber) {
      const id = `cmp-${e.id}-licence`;
      complianceRecords.set(id, {
        id,
        employeeId: e.id,
        kind: "driving_licence",
        label: `Class ${d.licenceClass}`,
        number: d.licenceNumber,
        expiryDate: d.licenceExpiry,
        issuingAuthority: "NTSA",
        createdAt: e.createdAt,
      });
    }
    if (d.medicalExpiry) {
      const id = `cmp-${e.id}-medical`;
      complianceRecords.set(id, {
        id,
        employeeId: e.id,
        kind: "medical_certificate",
        expiryDate: d.medicalExpiry,
        issuingAuthority: "NTSA-approved clinic",
        createdAt: e.createdAt,
      });
    }
    if (d.passportNumber || d.passportExpiry) {
      const id = `cmp-${e.id}-passport`;
      complianceRecords.set(id, {
        id,
        employeeId: e.id,
        kind: "passport",
        number: d.passportNumber,
        expiryDate: d.passportExpiry,
        issuingAuthority: "Department of Immigration",
        createdAt: e.createdAt,
      });
    }
    if (d.comesaDriverPermitExpiry) {
      const id = `cmp-${e.id}-comesa`;
      complianceRecords.set(id, {
        id,
        employeeId: e.id,
        kind: "comesa_permit",
        expiryDate: d.comesaDriverPermitExpiry,
        issuingAuthority: "COMESA Secretariat",
        createdAt: e.createdAt,
      });
    }
  }

  // A few extra records on office staff (KRA PINs already on Employee, but
  // we want explicit compliance records for passports of management).
  const today = new Date();
  const inDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const extras: Array<Partial<ComplianceRecord> & { employeeId: string; kind: ComplianceKind }> = [
    {
      employeeId: "emp-001",
      kind: "passport",
      number: "AK0102345",
      expiryDate: inDays(740),
      issuingAuthority: "Department of Immigration",
    },
    {
      employeeId: "emp-002",
      kind: "passport",
      number: "AK0202345",
      expiryDate: inDays(120),
      issuingAuthority: "Department of Immigration",
    },
    {
      employeeId: "emp-003",
      kind: "passport",
      number: "AK0302345",
      expiryDate: inDays(20),         // expiring soon — for the dashboard
      issuingAuthority: "Department of Immigration",
    },
    {
      employeeId: "emp-005",
      kind: "training_certificate",
      label: "Hydraulics Level 3",
      number: "KIE-2023-MX-882",
      issueDate: "2023-09-12",
      expiryDate: inDays(450),
      issuingAuthority: "KIE Industrial Training",
    },
    {
      employeeId: "emp-007",
      kind: "training_certificate",
      label: "Diesel Mechanic Cert",
      number: "NITA-2022-MX-441",
      issueDate: "2022-04-18",
      expiryDate: inDays(-15),        // expired — for the dashboard
      issuingAuthority: "NITA",
    },
    // Fuel-only TMS (F-3): petroleum-carrier paperwork. Sprinkled across a
    // few driver-linked employees so the dashboard 'Fuel compliance' line
    // has real entries to surface. emp-006 and emp-007 are both drivers.
    {
      employeeId: "emp-006",
      kind: "hazmat_endorsement",
      number: "NTSA-HAZ-2024-0331",
      issueDate: "2024-08-01",
      expiryDate: inDays(22),         // warning band
      issuingAuthority: "NTSA",
    },
    {
      employeeId: "emp-006",
      kind: "epra_dangerous_goods",
      number: "EPRA-DG-2024-118",
      issueDate: "2024-09-15",
      expiryDate: inDays(10),         // critical
      issuingAuthority: "EPRA",
    },
    {
      employeeId: "emp-007",
      kind: "puc_certificate",
      number: "PUC-2025-0992",
      issueDate: "2025-11-01",
      expiryDate: inDays(-3),         // freshly expired
      issuingAuthority: "NEMA",
    },
  ];

  for (const ex of extras) {
    const id = `cmp-${randomUUID().slice(0, 8)}`;
    complianceRecords.set(id, {
      id,
      employeeId: ex.employeeId,
      kind: ex.kind,
      label: ex.label,
      number: ex.number,
      issueDate: ex.issueDate,
      expiryDate: ex.expiryDate,
      issuingAuthority: ex.issuingAuthority,
      createdAt: new Date().toISOString(),
    });
  }
}
if (DEMO_DATA) seedComplianceFromDrivers();

export function listComplianceRecords(filter?: {
  employeeId?: string;
  kind?: ComplianceKind;
}): ComplianceRecord[] {
  let all = [...complianceRecords.values()];
  if (filter?.employeeId) all = all.filter((r) => r.employeeId === filter.employeeId);
  if (filter?.kind) all = all.filter((r) => r.kind === filter.kind);
  return all.sort((a, b) =>
    (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999"),
  );
}

export function getComplianceRecord(id: string): ComplianceRecord | undefined {
  return complianceRecords.get(id);
}

export function createComplianceRecord(
  input: Omit<ComplianceRecord, "id" | "createdAt">,
): ComplianceRecord {
  const id = `cmp-${randomUUID().slice(0, 8)}`;
  const r: ComplianceRecord = { ...input, id, createdAt: new Date().toISOString() };
  complianceRecords.set(id, r);
  return r;
}

export function deleteComplianceRecord(id: string): boolean {
  return complianceRecords.delete(id);
}

// ============================================================
// Leave & Attendance (Phase 6C)
// ============================================================
const leaveRequests = new Map<string, LeaveRequest>();
const attendanceRecords = new Map<string, AttendanceRecord>();
let leaveCounter = 1;

function nextLeaveNumber(): string {
  const year = new Date().getFullYear();
  const num = String(leaveCounter++).padStart(5, "0");
  return `REQ-${year}-${num}`;
}

const dayMs = 24 * 60 * 60 * 1000;
const today = new Date();
const isoDay = (offsetDays: number) => {
  const d = new Date(today.getTime() + offsetDays * dayMs);
  return d.toISOString().slice(0, 10);
};

function seedLeaveRequests() {
  // Mix of pending / approved / past requests for several employees.
  const seeds: Array<{
    employeeId: string;
    leaveType: LeaveType;
    startOff: number;
    endOff: number;
    reason: string;
    status: LeaveStatus;
    approvedById?: string;
  }> = [
    {
      employeeId: "emp-006",
      leaveType: "annual",
      startOff: 14,
      endOff: 20,
      reason: "Family holiday — Diani.",
      status: "pending",
    },
    {
      employeeId: "emp-007",
      leaveType: "sick",
      startOff: -3,
      endOff: -1,
      reason: "Flu — clinic note attached.",
      status: "approved",
      approvedById: "emp-005",
    },
    {
      employeeId: "emp-100",
      leaveType: "annual",
      startOff: -30,
      endOff: -22,
      reason: "Annual leave between long-haul rotations.",
      status: "taken",
      approvedById: "emp-003",
    },
    {
      employeeId: "emp-101",
      leaveType: "compassionate",
      startOff: 7,
      endOff: 11,
      reason: "Family bereavement.",
      status: "pending",
    },
    {
      employeeId: "emp-103",
      leaveType: "annual",
      startOff: 35,
      endOff: 49,
      reason: "Two-week break — wedding preparations.",
      status: "approved",
      approvedById: "emp-003",
    },
    {
      employeeId: "emp-105",
      leaveType: "paternity",
      startOff: -14,
      endOff: -1,
      reason: "Paternity leave (statutory 14 days).",
      status: "taken",
      approvedById: "emp-003",
    },
    {
      employeeId: "emp-002",
      leaveType: "annual",
      startOff: 60,
      endOff: 74,
      reason: "Annual leave — December break.",
      status: "approved",
      approvedById: "emp-001",
    },
  ];
  for (const s of seeds) {
    const id = `lr-${randomUUID().slice(0, 8)}`;
    const startDate = isoDay(s.startOff);
    const endDate = isoDay(s.endOff);
    leaveRequests.set(id, {
      id,
      number: nextLeaveNumber(),
      employeeId: s.employeeId,
      leaveType: s.leaveType,
      startDate,
      endDate,
      days: workingDaysBetween(startDate, endDate),
      reason: s.reason,
      status: s.status,
      approvedById: s.approvedById,
      approvedAt:
        s.status === "approved" || s.status === "taken"
          ? new Date(today.getTime() - 86400_000).toISOString()
          : undefined,
      createdAt: new Date(today.getTime() - 7 * 86400_000).toISOString(),
    });
  }
}
if (DEMO_DATA) seedLeaveRequests();

function seedAttendance() {
  // Last 7 working days for office staff (emp-001..007). Drivers are tracked
  // through trip status, not daily attendance.
  const officeIds = ["emp-001", "emp-002", "emp-003", "emp-004", "emp-005", "emp-006", "emp-007"];
  for (let i = -7; i <= 0; i++) {
    const d = new Date(today.getTime() + i * dayMs);
    const dow = d.getDay();
    const date = d.toISOString().slice(0, 10);
    for (const eid of officeIds) {
      const id = `att-${eid}-${date}`;
      let status: AttendanceStatus = "present";
      let clockIn: string | undefined = "08:05";
      let clockOut: string | undefined = "17:35";
      let hours: number | undefined = 9.5;
      if (dow === 0 || dow === 6) {
        status = "weekend";
        clockIn = clockOut = undefined;
        hours = undefined;
      } else if (eid === "emp-006" && i === -2) {
        // Half day for the dispatcher
        status = "half_day";
        clockOut = "12:30";
        hours = 4.5;
      } else if (eid === "emp-007" && i >= -3 && i <= -1) {
        // Sick days for the mechanic
        status = "sick";
        clockIn = clockOut = undefined;
        hours = 0;
      }
      attendanceRecords.set(id, {
        id,
        employeeId: eid,
        date,
        status,
        clockInTime: clockIn,
        clockOutTime: clockOut,
        hours,
        createdAt: new Date().toISOString(),
      });
    }
  }
}
if (DEMO_DATA) seedAttendance();

// ----- Leave -----
export function listLeaveRequests(filter?: {
  employeeId?: string;
  status?: LeaveStatus;
  leaveType?: LeaveType;
}): LeaveRequest[] {
  let all = [...leaveRequests.values()];
  if (filter?.employeeId) all = all.filter((r) => r.employeeId === filter.employeeId);
  if (filter?.status) all = all.filter((r) => r.status === filter.status);
  if (filter?.leaveType) all = all.filter((r) => r.leaveType === filter.leaveType);
  return all.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function getLeaveRequest(id: string): LeaveRequest | undefined {
  return leaveRequests.get(id);
}

export function createLeaveRequest(input: {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}): LeaveRequest | { error: string } {
  if (!employees.has(input.employeeId)) return { error: "Employee not found" };
  const days = workingDaysBetween(input.startDate, input.endDate);
  if (days <= 0) return { error: "Date range must include at least 1 working day" };

  const id = `lr-${randomUUID().slice(0, 8)}`;
  const r: LeaveRequest = {
    id,
    number: nextLeaveNumber(),
    employeeId: input.employeeId,
    leaveType: input.leaveType,
    startDate: input.startDate,
    endDate: input.endDate,
    days,
    reason: input.reason,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  leaveRequests.set(id, r);
  return r;
}

export function approveLeaveRequest(
  id: string,
  approvedById: string,
): LeaveRequest | { error: string } {
  const r = leaveRequests.get(id);
  if (!r) return { error: "Not found" };
  if (r.status !== "pending") return { error: `Already ${r.status}` };
  const updated: LeaveRequest = {
    ...r,
    status: "approved",
    approvedById,
    approvedAt: new Date().toISOString(),
  };
  leaveRequests.set(id, updated);
  return updated;
}

export function rejectLeaveRequest(
  id: string,
  reason: string,
  approvedById: string,
): LeaveRequest | { error: string } {
  const r = leaveRequests.get(id);
  if (!r) return { error: "Not found" };
  if (r.status !== "pending") return { error: `Already ${r.status}` };
  const updated: LeaveRequest = {
    ...r,
    status: "rejected",
    rejectedReason: reason,
    approvedById,
    approvedAt: new Date().toISOString(),
  };
  leaveRequests.set(id, updated);
  return updated;
}

export function cancelLeaveRequest(id: string): LeaveRequest | { error: string } {
  const r = leaveRequests.get(id);
  if (!r) return { error: "Not found" };
  if (r.status === "taken") return { error: "Already taken — cannot cancel" };
  const updated: LeaveRequest = { ...r, status: "cancelled" };
  leaveRequests.set(id, updated);
  return updated;
}

/** Compute live leave balance per type for an employee. */
export function leaveBalances(employeeId: string): LeaveBalance[] {
  const types: LeaveType[] = [
    "annual",
    "sick",
    "compassionate",
    "maternity",
    "paternity",
    "study",
  ];
  const out: LeaveBalance[] = [];
  for (const t of types) {
    const entitled =
      (KENYA_STATUTORY_LEAVE[t as keyof typeof KENYA_STATUTORY_LEAVE] as number | undefined) ?? 0;
    const used = [...leaveRequests.values()]
      .filter(
        (r) => r.employeeId === employeeId && r.leaveType === t && (r.status === "approved" || r.status === "taken"),
      )
      .reduce((s, r) => s + r.days, 0);
    const pending = [...leaveRequests.values()]
      .filter((r) => r.employeeId === employeeId && r.leaveType === t && r.status === "pending")
      .reduce((s, r) => s + r.days, 0);
    out.push({
      employeeId,
      leaveType: t,
      entitled,
      used,
      pending,
      remaining: Math.max(0, entitled - used - pending),
    });
  }
  return out;
}

// ----- Attendance -----
export function listAttendance(filter?: {
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
}): AttendanceRecord[] {
  let all = [...attendanceRecords.values()];
  if (filter?.employeeId) all = all.filter((r) => r.employeeId === filter.employeeId);
  if (filter?.fromDate) all = all.filter((r) => r.date >= filter.fromDate!);
  if (filter?.toDate) all = all.filter((r) => r.date <= filter.toDate!);
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export function logAttendance(input: {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  clockInTime?: string;
  clockOutTime?: string;
  hours?: number;
  notes?: string;
}): AttendanceRecord {
  // One record per employee per day — replace if exists.
  const id = `att-${input.employeeId}-${input.date}`;
  const r: AttendanceRecord = { ...input, id, createdAt: new Date().toISOString() };
  attendanceRecords.set(id, r);
  return r;
}

// ============================================================
// Payroll & Loans (Phase 6D)
// ============================================================
const payrollPeriods = new Map<string, PayrollPeriod>();
const payrollInputs = new Map<string, PayrollInput>();
const loans = new Map<string, Loan>();
let loanCounter = 1;

function nextLoanNumber(): string {
  const year = new Date().getFullYear();
  const num = String(loanCounter++).padStart(5, "0");
  return `LN-${year}-${num}`;
}

function ymToDates(yearMonth: string): { startDate: string; endDate: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const startDate = `${yearMonth}-01`;
  const lastDay = new Date(y!, m!, 0).getDate(); // m! is 1-indexed
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function recomputePayrollLine(input: PayrollInput): PayrollInput {
  const allowancesTaxable = input.allowances
    .filter((a) => a.taxable)
    .reduce((s, a) => s + a.amount, 0);
  const allowancesNonTaxable = input.allowances
    .filter((a) => !a.taxable)
    .reduce((s, a) => s + a.amount, 0);
  const overtime = input.overtimeHours * input.overtimeRate;
  const grossPay = input.basicSalary + allowancesTaxable + allowancesNonTaxable + overtime + input.bonus;
  // Taxable gross excludes non-taxable allowances
  const taxable = input.basicSalary + allowancesTaxable + overtime + input.bonus;

  // Statutory deductions (computed in KES — for non-KES contracts these are
  // illustrative only; payroll provider does the final calc).
  const nssfEmployee = computeNssfEmployee(grossPay);
  const nssfEmployer = nssfEmployee;
  const shaEmployee = computeSha(grossPay);
  const ahlEmployee = computeAhl(grossPay);
  const ahlEmployer = ahlEmployee;
  const paye = computePaye(taxable - nssfEmployee - shaEmployee - ahlEmployee);

  const totalDeductions =
    paye + nssfEmployee + shaEmployee + ahlEmployee + input.otherDeductions + input.loanRecovery;
  const netPay = grossPay - totalDeductions;
  const employerCost = grossPay + nssfEmployer + ahlEmployer + NITA_EMPLOYER;

  return {
    ...input,
    paye: Math.round(paye),
    nssfEmployee,
    nssfEmployer,
    shaEmployee,
    nitaEmployer: NITA_EMPLOYER,
    ahlEmployee,
    ahlEmployer,
    grossPay: Math.round(grossPay),
    totalDeductions: Math.round(totalDeductions),
    netPay: Math.round(netPay),
    employerCost: Math.round(employerCost),
  };
}

function buildPayrollInputForEmployee(periodId: string, employeeId: string): PayrollInput | null {
  const contract = activeContractFor(employeeId);
  if (!contract) return null;
  const id = `pi-${periodId}-${employeeId}`;
  const allowances: PayrollAllowance[] = contract.allowances.map((a) => ({ ...a }));

  // Carry across any active loan recovery
  const empLoans = [...loans.values()].filter(
    (l) => l.employeeId === employeeId && l.status === "active",
  );
  const loanRecovery = empLoans.reduce(
    (s, l) => s + Math.min(l.monthlyRecovery, l.balance),
    0,
  );

  const base: PayrollInput = {
    id,
    periodId,
    employeeId,
    basicSalary: contract.basicSalary,
    currency: contract.currency,
    allowances,
    overtimeHours: 0,
    overtimeRate: 0,
    bonus: 0,
    otherDeductions: 0,
    loanRecovery,
    paye: 0,
    nssfEmployee: 0,
    nssfEmployer: 0,
    shaEmployee: 0,
    nitaEmployer: 0,
    ahlEmployee: 0,
    ahlEmployer: 0,
    grossPay: 0,
    totalDeductions: 0,
    netPay: 0,
    employerCost: 0,
    createdAt: new Date().toISOString(),
  };
  return recomputePayrollLine(base);
}

function seedPayroll() {
  // Current month period in 'processing' state with all active employees
  // pre-populated from their contracts.
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { startDate, endDate } = ymToDates(ym);
  const periodId = `pp-${ym}`;
  const period: PayrollPeriod = {
    id: periodId,
    yearMonth: ym,
    startDate,
    endDate,
    status: "processing",
    createdAt: new Date().toISOString(),
  };
  payrollPeriods.set(periodId, period);

  for (const e of employees.values()) {
    if (e.status === "terminated") continue;
    const line = buildPayrollInputForEmployee(periodId, e.id);
    if (line) payrollInputs.set(line.id, line);
  }

  // A previous month, marked paid, for history
  const prev = new Date(now);
  prev.setMonth(prev.getMonth() - 1);
  const prevYm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const { startDate: pStart, endDate: pEnd } = ymToDates(prevYm);
  const prevId = `pp-${prevYm}`;
  payrollPeriods.set(prevId, {
    id: prevId,
    yearMonth: prevYm,
    startDate: pStart,
    endDate: pEnd,
    status: "paid",
    processedAt: new Date(prev.getTime() - 86400_000 * 3).toISOString(),
    paidAt: new Date(prev.getTime() - 86400_000).toISOString(),
    createdAt: new Date(prev.getTime() - 86400_000 * 5).toISOString(),
  });
  for (const e of employees.values()) {
    if (e.status === "terminated") continue;
    const line = buildPayrollInputForEmployee(prevId, e.id);
    if (line) payrollInputs.set(line.id, line);
  }
}

function seedLoans() {
  const seed: Array<{
    employeeId: string;
    principal: number;
    monthly: number;
    term: number;
    reason: string;
    months_in: number;
  }> = [
    { employeeId: "emp-005", principal: 250_000, monthly: 22_000, term: 12, reason: "Personal — school fees Q1", months_in: 4 },
    { employeeId: "emp-100", principal: 80_000, monthly: 8_500, term: 10, reason: "Vehicle deposit", months_in: 3 },
    { employeeId: "emp-006", principal: 30_000, monthly: 5_500, term: 6, reason: "Salary advance", months_in: 1 },
  ];
  for (const s of seed) {
    const id = `ln-${randomUUID().slice(0, 8)}`;
    const recovered = s.monthly * s.months_in;
    const balance = Math.max(0, s.principal - recovered);
    loans.set(id, {
      id,
      number: nextLoanNumber(),
      employeeId: s.employeeId,
      principal: s.principal,
      currency: "KES",
      disbursedDate: new Date(Date.now() - s.months_in * 30 * 86400_000).toISOString().slice(0, 10),
      monthlyRecovery: s.monthly,
      termMonths: s.term,
      interestRate: 0,
      recovered,
      balance,
      status: balance > 0 ? "active" : "paid_off",
      reason: s.reason,
      createdAt: new Date(Date.now() - s.months_in * 30 * 86400_000).toISOString(),
    });
  }
}
if (DEMO_DATA) seedLoans();
if (DEMO_DATA) seedPayroll();

// ----- Periods & inputs -----
export function listPayrollPeriods(): PayrollPeriod[] {
  return [...payrollPeriods.values()].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
}
export function getPayrollPeriod(id: string): PayrollPeriod | undefined {
  return payrollPeriods.get(id);
}
export function createPayrollPeriod(input: { yearMonth: string; notes?: string }):
  | PayrollPeriod
  | { error: string } {
  if (!/^\d{4}-\d{2}$/.test(input.yearMonth)) return { error: "yearMonth must be YYYY-MM" };
  const id = `pp-${input.yearMonth}`;
  if (payrollPeriods.has(id)) return { error: "Period already exists" };
  const { startDate, endDate } = ymToDates(input.yearMonth);
  const period: PayrollPeriod = {
    id,
    yearMonth: input.yearMonth,
    startDate,
    endDate,
    status: "draft",
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  payrollPeriods.set(id, period);
  for (const e of employees.values()) {
    if (e.status === "terminated") continue;
    const line = buildPayrollInputForEmployee(id, e.id);
    if (line) payrollInputs.set(line.id, line);
  }
  return period;
}

export function setPayrollPeriodStatus(
  id: string,
  status: PayrollPeriodStatus,
): PayrollPeriod | undefined {
  const p = payrollPeriods.get(id);
  if (!p) return undefined;
  const updated: PayrollPeriod = {
    ...p,
    status,
    processedAt: status === "processing" || status === "paid" ? new Date().toISOString() : p.processedAt,
    paidAt: status === "paid" ? new Date().toISOString() : p.paidAt,
  };
  payrollPeriods.set(id, updated);

  // When marking paid, also recover loan balances
  if (status === "paid") {
    const inputs = listPayrollInputs(id);
    for (const inp of inputs) {
      if (inp.loanRecovery <= 0) continue;
      // Apply the recovered amount across the employee's active loans
      let remaining = inp.loanRecovery;
      const empLoans = [...loans.values()].filter(
        (l) => l.employeeId === inp.employeeId && l.status === "active",
      );
      for (const l of empLoans) {
        if (remaining <= 0) break;
        const apply = Math.min(remaining, l.balance);
        const updatedLoan: Loan = {
          ...l,
          recovered: l.recovered + apply,
          balance: l.balance - apply,
          status: l.balance - apply <= 0 ? "paid_off" : "active",
        };
        loans.set(l.id, updatedLoan);
        remaining -= apply;
      }
    }
  }
  return updated;
}

export function listPayrollInputs(periodId: string): PayrollInput[] {
  return [...payrollInputs.values()]
    .filter((p) => p.periodId === periodId)
    .sort((a, b) => {
      const ea = employees.get(a.employeeId);
      const eb = employees.get(b.employeeId);
      return (ea?.employeeNumber ?? "").localeCompare(eb?.employeeNumber ?? "");
    });
}
export function getPayrollInput(periodId: string, employeeId: string): PayrollInput | undefined {
  return payrollInputs.get(`pi-${periodId}-${employeeId}`);
}

export function updatePayrollInput(input: {
  periodId: string;
  employeeId: string;
  basicSalary: number;
  overtimeHours: number;
  overtimeRate: number;
  bonus: number;
  otherDeductions: number;
  loanRecovery: number;
  notes?: string;
}): PayrollInput | { error: string } {
  const id = `pi-${input.periodId}-${input.employeeId}`;
  const existing = payrollInputs.get(id);
  if (!existing) return { error: "Payroll input not found" };
  const period = payrollPeriods.get(input.periodId);
  if (period?.status === "paid" || period?.status === "closed") {
    return { error: `Period is ${period.status} — locked` };
  }
  const updated = recomputePayrollLine({
    ...existing,
    basicSalary: input.basicSalary,
    overtimeHours: input.overtimeHours,
    overtimeRate: input.overtimeRate,
    bonus: input.bonus,
    otherDeductions: input.otherDeductions,
    loanRecovery: input.loanRecovery,
    notes: input.notes,
  });
  payrollInputs.set(id, updated);
  return updated;
}

/** Aggregate totals for a period across all inputs (in KES — non-KES lines
 *  are summed naively as illustrative). */
export function payrollTotals(periodId: string): {
  count: number;
  grossPay: number;
  paye: number;
  nssfEmployee: number;
  shaEmployee: number;
  ahlEmployee: number;
  loanRecovery: number;
  totalDeductions: number;
  netPay: number;
  employerCost: number;
} {
  const lines = listPayrollInputs(periodId);
  return lines.reduce(
    (acc, l) => {
      acc.count++;
      acc.grossPay += l.grossPay;
      acc.paye += l.paye;
      acc.nssfEmployee += l.nssfEmployee;
      acc.shaEmployee += l.shaEmployee;
      acc.ahlEmployee += l.ahlEmployee;
      acc.loanRecovery += l.loanRecovery;
      acc.totalDeductions += l.totalDeductions;
      acc.netPay += l.netPay;
      acc.employerCost += l.employerCost;
      return acc;
    },
    {
      count: 0, grossPay: 0, paye: 0, nssfEmployee: 0, shaEmployee: 0,
      ahlEmployee: 0, loanRecovery: 0, totalDeductions: 0, netPay: 0, employerCost: 0,
    },
  );
}

// ----- Loans -----
export function listLoans(filter?: { employeeId?: string; status?: LoanStatus }): Loan[] {
  let all = [...loans.values()];
  if (filter?.employeeId) all = all.filter((l) => l.employeeId === filter.employeeId);
  if (filter?.status) all = all.filter((l) => l.status === filter.status);
  return all.sort((a, b) => b.disbursedDate.localeCompare(a.disbursedDate));
}
export function getLoan(id: string): Loan | undefined {
  return loans.get(id);
}
export function createLoan(input: {
  employeeId: string;
  principal: number;
  currency: LedgerCurrency;
  disbursedDate: string;
  termMonths: number;
  monthlyRecovery: number;
  interestRate: number;
  reason?: string;
  notes?: string;
}): Loan | { error: string } {
  if (!employees.has(input.employeeId)) return { error: "Employee not found" };
  const id = `ln-${randomUUID().slice(0, 8)}`;
  const loan: Loan = {
    id,
    number: nextLoanNumber(),
    employeeId: input.employeeId,
    principal: input.principal,
    currency: input.currency,
    disbursedDate: input.disbursedDate,
    termMonths: input.termMonths,
    monthlyRecovery: input.monthlyRecovery,
    interestRate: input.interestRate,
    recovered: 0,
    balance: input.principal,
    status: "active",
    reason: input.reason,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  loans.set(id, loan);
  return loan;
}
export function cancelLoan(id: string): Loan | { error: string } {
  const l = loans.get(id);
  if (!l) return { error: "Not found" };
  if (l.status === "paid_off") return { error: "Already paid off" };
  const updated: Loan = { ...l, status: "cancelled" };
  loans.set(id, updated);
  return updated;
}

// ============================================================
// Performance / Appraisal (Phase 6E)
// ============================================================
const appraisalCycles = new Map<string, AppraisalCycle>();
const appraisalReviews = new Map<string, AppraisalReview>();

function reviewKey(cycleId: string, employeeId: string): string {
  return `apr-${cycleId}-${employeeId}`;
}

function buildEmptyReview(cycleId: string, employeeId: string): AppraisalReview {
  const employee = employees.get(employeeId);
  return {
    id: reviewKey(cycleId, employeeId),
    cycleId,
    employeeId,
    managerId: employee?.lineManagerId,
    goals: [],
    competencies: STANDARD_COMPETENCIES.map((c) => ({ competency: c })),
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

function seedAppraisals() {
  const currentYear = new Date().getFullYear();
  const cycle: AppraisalCycle = {
    id: `apc-${currentYear}`,
    label: String(currentYear),
    year: currentYear,
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  appraisalCycles.set(cycle.id, cycle);

  // Seed reviews for active office staff with varying levels of completion
  const seedReviews: Array<{
    employeeId: string;
    status: AppraisalReviewStatus;
    rating?: 1 | 2 | 3 | 4 | 5;
    goals: Array<{ description: string; target?: string; self?: number; mgr?: number }>;
    selfComp?: number;
    mgrComp?: number;
    employeeComment?: string;
    managerComment?: string;
    hrComment?: string;
    recommendation?: "promote" | "increment" | "training" | "pip" | "none";
    incrementPct?: number;
  }> = [
    {
      employeeId: "emp-002",
      status: "hr_finalised",
      rating: 4,
      goals: [
        { description: "Close monthly books by 5th working day", target: "5th of every month", self: 90, mgr: 85 },
        { description: "Reduce DSO from 65 to 50 days", target: "DSO ≤ 50", self: 70, mgr: 75 },
        { description: "Implement TX System Phase 5", target: "Go-live Q3", self: 100, mgr: 100 },
      ],
      selfComp: 4, mgrComp: 4,
      employeeComment: "Solid year with TX go-live as the standout achievement.",
      managerComment: "Esther led the finance transformation. Recommend a 7% increment.",
      hrComment: "Approved. Increment to take effect 1 Jan.",
      recommendation: "increment",
      incrementPct: 7,
    },
    {
      employeeId: "emp-003",
      status: "manager_reviewed",
      rating: 4,
      goals: [
        { description: "Improve fleet utilisation to 85%", target: "≥85% days on trip", self: 80, mgr: 78 },
        { description: "Reduce avg border crossing time", target: "≤6 hrs Malaba", self: 75, mgr: 70 },
      ],
      selfComp: 4, mgrComp: 4,
      employeeComment: "Tough Q2 with the engine overhauls but recovered well in Q3-Q4.",
      managerComment: "Strong year. Awaiting HR sign-off on the 5% increment.",
      recommendation: "increment",
      incrementPct: 5,
    },
    {
      employeeId: "emp-004",
      status: "employee_submitted",
      goals: [
        { description: "Roll out HR Module of TX System", target: "Phase 6 live by Q4", self: 75 },
        { description: "Reduce voluntary attrition to <8%", target: "≤8%", self: 80 },
      ],
      selfComp: 4,
      employeeComment: "Phase 6 on track. Attrition trending down.",
    },
    {
      employeeId: "emp-005",
      status: "draft",
      goals: [
        { description: "Reduce unscheduled downtime by 20%", target: "Maintain >85% truck availability" },
      ],
    },
    {
      employeeId: "emp-006",
      status: "draft",
      goals: [],
    },
    {
      employeeId: "emp-007",
      status: "draft",
      goals: [
        { description: "Complete diesel refresher training", target: "NITA Cert 2026" },
      ],
    },
  ];

  for (const s of seedReviews) {
    const review = buildEmptyReview(cycle.id, s.employeeId);
    review.goals = s.goals.map((g, i) => ({
      id: `goal-${cycle.id}-${s.employeeId}-${i}`,
      description: g.description,
      target: g.target,
      selfRating: g.self,
      managerRating: g.mgr,
    }));
    if (s.selfComp || s.mgrComp) {
      review.competencies = STANDARD_COMPETENCIES.map((c) => ({
        competency: c,
        selfRating: s.selfComp as 1 | 2 | 3 | 4 | 5 | undefined,
        managerRating: s.mgrComp as 1 | 2 | 3 | 4 | 5 | undefined,
      }));
    }
    review.status = s.status;
    review.overallRating = s.rating;
    review.employeeComment = s.employeeComment;
    review.managerComment = s.managerComment;
    review.hrComment = s.hrComment;
    review.recommendation = s.recommendation;
    review.proposedIncrementPct = s.incrementPct;
    if (s.status === "employee_submitted" || s.status === "manager_reviewed" || s.status === "hr_finalised") {
      review.submittedAt = new Date(Date.now() - 14 * 86400_000).toISOString();
    }
    if (s.status === "manager_reviewed" || s.status === "hr_finalised") {
      review.managerReviewedAt = new Date(Date.now() - 7 * 86400_000).toISOString();
    }
    if (s.status === "hr_finalised") {
      review.hrFinalisedAt = new Date(Date.now() - 1 * 86400_000).toISOString();
    }
    appraisalReviews.set(review.id, review);
  }
}
if (DEMO_DATA) seedAppraisals();

export function listAppraisalCycles(): AppraisalCycle[] {
  return [...appraisalCycles.values()].sort((a, b) => b.year - a.year);
}
export function getAppraisalCycle(id: string): AppraisalCycle | undefined {
  return appraisalCycles.get(id);
}
export function createAppraisalCycle(input: {
  label: string;
  year: number;
  startDate: string;
  endDate: string;
  notes?: string;
}): AppraisalCycle | { error: string } {
  const id = `apc-${input.year}`;
  if (appraisalCycles.has(id)) return { error: "Cycle for that year already exists" };
  const cycle: AppraisalCycle = {
    ...input,
    id,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  appraisalCycles.set(id, cycle);
  return cycle;
}

export function setAppraisalCycleStatus(
  id: string,
  status: AppraisalCycleStatus,
): AppraisalCycle | undefined {
  const c = appraisalCycles.get(id);
  if (!c) return undefined;
  appraisalCycles.set(id, { ...c, status });
  return appraisalCycles.get(id);
}

/** All reviews for a cycle. Auto-creates draft reviews for any active
 *  employee that doesn't have one yet. */
export function listReviewsForCycle(cycleId: string): AppraisalReview[] {
  for (const e of employees.values()) {
    if (e.status === "terminated") continue;
    const k = reviewKey(cycleId, e.id);
    if (!appraisalReviews.has(k)) {
      appraisalReviews.set(k, buildEmptyReview(cycleId, e.id));
    }
  }
  return [...appraisalReviews.values()]
    .filter((r) => r.cycleId === cycleId)
    .sort((a, b) => {
      const ea = employees.get(a.employeeId);
      const eb = employees.get(b.employeeId);
      return (ea?.employeeNumber ?? "").localeCompare(eb?.employeeNumber ?? "");
    });
}

export function getAppraisalReview(
  cycleId: string,
  employeeId: string,
): AppraisalReview | undefined {
  const k = reviewKey(cycleId, employeeId);
  if (!appraisalReviews.has(k) && employees.has(employeeId) && appraisalCycles.has(cycleId)) {
    appraisalReviews.set(k, buildEmptyReview(cycleId, employeeId));
  }
  return appraisalReviews.get(k);
}

export function updateAppraisalReview(input: {
  cycleId: string;
  employeeId: string;
  goals: Array<Omit<AppraisalGoal, "id"> & { id?: string }>;
  competencies: CompetencyRating[];
  overallRating?: number;
  employeeComment?: string;
  managerComment?: string;
  hrComment?: string;
  recommendation?: "promote" | "increment" | "training" | "pip" | "none";
  proposedIncrementPct?: number;
}): AppraisalReview | { error: string } {
  const k = reviewKey(input.cycleId, input.employeeId);
  const existing = appraisalReviews.get(k);
  if (!existing) return { error: "Review not found" };
  if (existing.status === "hr_finalised") return { error: "Review is HR-finalised — locked" };
  const updated: AppraisalReview = {
    ...existing,
    goals: input.goals.map((g, i) => ({
      ...g,
      id: g.id ?? `goal-${input.cycleId}-${input.employeeId}-${i}`,
    })),
    competencies: input.competencies,
    overallRating: input.overallRating as 1 | 2 | 3 | 4 | 5 | undefined,
    employeeComment: input.employeeComment,
    managerComment: input.managerComment,
    hrComment: input.hrComment,
    recommendation: input.recommendation,
    proposedIncrementPct: input.proposedIncrementPct,
  };
  appraisalReviews.set(k, updated);
  return updated;
}

export function advanceAppraisalReview(
  cycleId: string,
  employeeId: string,
  to: AppraisalReviewStatus,
): AppraisalReview | { error: string } {
  const k = reviewKey(cycleId, employeeId);
  const existing = appraisalReviews.get(k);
  if (!existing) return { error: "Review not found" };

  const order: AppraisalReviewStatus[] = ["draft", "employee_submitted", "manager_reviewed", "hr_finalised"];
  if (order.indexOf(to) <= order.indexOf(existing.status)) {
    return { error: `Cannot move backwards from ${existing.status} to ${to}` };
  }
  const now = new Date().toISOString();
  const updated: AppraisalReview = {
    ...existing,
    status: to,
    submittedAt: to === "employee_submitted" ? now : existing.submittedAt,
    managerReviewedAt: to === "manager_reviewed" ? now : existing.managerReviewedAt,
    hrFinalisedAt: to === "hr_finalised" ? now : existing.hrFinalisedAt,
  };
  appraisalReviews.set(k, updated);
  return updated;
}

export function reviewsForEmployee(employeeId: string): AppraisalReview[] {
  return [...appraisalReviews.values()]
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => b.cycleId.localeCompare(a.cycleId));
}

// ============================================================
// Job-Description-driven RBAC (Phase 6F)
// ============================================================
const jobDescriptions = new Map<string, JobDescription>();
/** employeeId → jdId */
const jdAssignments = new Map<string, string>();

const ALL_VIEW_ACTIONS: RbacAction[] = ["view"];
const FULL_ACTIONS: RbacAction[] = ["view", "create", "edit", "approve", "export", "delete"];
const FINANCE_ACTIONS: RbacAction[] = ["view", "create", "edit", "approve", "export"];

function p(resource: RbacResource, actions: RbacAction[]): RbacPermission {
  return { resource, actions };
}

const jdSeed: JobDescription[] = [
  {
    id: "jd-md",
    code: "MD",
    title: "Managing Director",
    level: "executive",
    summary: "Sets company strategy, signs off on key contracts, owns P&L. Full visibility, signoff on appraisals, payroll, and major transactions.",
    responsibilities: [
      "Set company strategy and annual budget.",
      "Approve customer contracts, supplier agreements, and bank facilities.",
      "Final signoff on payroll runs, appraisals, and capital expenditure.",
      "Represent the company to banks, regulators, and major customers.",
    ],
    permissions: [
      // Sees everything; can approve everything; only HR-finalises appraisals.
      ...(["dashboard", "bookings", "trips", "trucks", "trailers", "drivers", "workshop",
        "compliance", "rates", "customers", "suppliers", "subcontractors",
        "expenses", "fuel", "mpesa", "accounts", "ledger", "invoices", "bills",
        "bank", "reports", "hr_employees", "hr_leave", "hr_payroll", "hr_loans",
        "hr_appraisals", "hr_compliance", "hr_permissions",
        "admin_settings", "admin_users", "audit_log"] as RbacResource[]
      ).map((r) => p(r, FULL_ACTIONS)),
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "jd-fm",
    code: "FM",
    title: "Finance Manager",
    level: "manager",
    summary: "Owns the books, AR/AP, treasury, and statutory filings. Approves journals, posts invoices, runs payroll inputs.",
    responsibilities: [
      "Maintain Chart of Accounts, post and approve GL journals.",
      "Manage AR (invoices, collections, aging) and AP (bills, payments).",
      "Reconcile bank accounts and treasury balances.",
      "Prepare monthly management pack and statutory returns (VAT, PAYE).",
      "Review and approve payroll inputs prior to MD signoff.",
    ],
    permissions: [
      p("dashboard", ALL_VIEW_ACTIONS),
      p("trips", ["view"]),
      p("expenses", FINANCE_ACTIONS),
      p("fuel", ["view"]),
      p("mpesa", FINANCE_ACTIONS),
      p("accounts", FULL_ACTIONS),
      p("ledger", FINANCE_ACTIONS),
      p("invoices", FINANCE_ACTIONS),
      p("bills", FINANCE_ACTIONS),
      p("bank", FINANCE_ACTIONS),
      p("reports", ["view", "export"]),
      p("customers", ["view", "edit"]),
      p("suppliers", ["view", "edit"]),
      p("hr_payroll", ["view", "edit", "approve", "export"]),
      p("hr_loans", FINANCE_ACTIONS),
      p("hr_employees", ["view"]),
      p("compliance", ["view"]),
      p("audit_log", ["view"]),
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "jd-om",
    code: "OM",
    title: "Operations Manager",
    level: "manager",
    summary: "Plans trips, dispatches drivers, owns fleet utilisation and on-time performance. Approves expenses and reconciles trips.",
    responsibilities: [
      "Plan trips and assign trucks/drivers.",
      "Monitor border crossings and ETAs end-to-end.",
      "Approve trip expense claims and driver advances.",
      "Reconcile closed trips before invoicing.",
      "Manage subcontractor relationships and rate negotiations.",
    ],
    permissions: [
      p("dashboard", ALL_VIEW_ACTIONS),
      p("bookings", FULL_ACTIONS),
      p("trips", FULL_ACTIONS),
      p("trucks", ["view", "edit"]),
      p("trailers", ["view", "edit"]),
      p("drivers", ["view", "edit"]),
      p("workshop", ["view"]),
      p("compliance", ["view"]),
      p("rates", ["view", "edit"]),
      p("customers", ["view", "create", "edit"]),
      p("subcontractors", ["view", "create", "edit"]),
      p("suppliers", ["view"]),
      p("expenses", ["view", "approve", "export"]),
      p("fuel", ["view", "create", "edit"]),
      p("mpesa", ["view"]),
      p("invoices", ["view", "create"]),
      p("reports", ["view", "export"]),
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "jd-hrm",
    code: "HRM",
    title: "HR Manager",
    level: "manager",
    summary: "Owns the employee lifecycle: recruitment, contracts, leave, payroll inputs, appraisals, compliance.",
    responsibilities: [
      "Maintain the employee register and contracts.",
      "Approve leave requests; resolve conflicts with operations.",
      "Prepare monthly payroll inputs; approve loan disbursements.",
      "Run the annual appraisal cycle from open to HR-finalised.",
      "Ensure all licences/medicals/passports stay valid.",
    ],
    permissions: [
      p("dashboard", ALL_VIEW_ACTIONS),
      p("hr_employees", FULL_ACTIONS),
      p("hr_leave", FULL_ACTIONS),
      p("hr_payroll", ["view", "create", "edit", "export"]),
      p("hr_loans", ["view", "create", "edit"]),
      p("hr_appraisals", FULL_ACTIONS),
      p("hr_compliance", FULL_ACTIONS),
      p("hr_permissions", ["view", "edit"]),
      p("compliance", ["view"]),
      p("drivers", ["view", "edit"]),
      p("audit_log", ["view"]),
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "jd-frm",
    code: "FRM",
    title: "Workshop Foreman",
    level: "supervisor",
    summary: "Runs the workshop. Owns job cards, spares, mechanic schedules, and truck availability.",
    responsibilities: [
      "Open and close job cards; review mechanic analysis.",
      "Source and approve spares from suppliers.",
      "Schedule preventive maintenance to keep trucks available.",
      "Track tyre and parts inventory expensed to each truck.",
    ],
    permissions: [
      p("dashboard", ALL_VIEW_ACTIONS),
      p("workshop", FULL_ACTIONS),
      p("trucks", ["view", "edit"]),
      p("trailers", ["view"]),
      p("suppliers", ["view", "edit"]),
      p("compliance", ["view"]),
      p("expenses", ["view", "create"]),
      p("bills", ["view", "create"]),
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "jd-mec",
    code: "MEC",
    title: "Mechanic",
    level: "operator",
    summary: "Performs servicing and repairs under the foreman's direction. Updates job cards as work progresses.",
    responsibilities: [
      "Diagnose vehicle faults; record findings on the job card.",
      "Carry out repairs and servicing per work order.",
      "Request spares from stores; record consumption per truck.",
      "Hand over completed work to the foreman for closeout.",
    ],
    permissions: [
      p("dashboard", ALL_VIEW_ACTIONS),
      p("workshop", ["view", "edit"]),
      p("trucks", ["view"]),
      p("compliance", ["view"]),
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "jd-dsp",
    code: "DSP",
    title: "Dispatcher",
    level: "officer",
    summary: "Day-to-day trip execution. Updates trip status, captures border crossings, processes driver requests.",
    responsibilities: [
      "Confirm bookings; activate planned trips.",
      "Update trip status timestamps as drivers report in.",
      "Capture border crossing events and POD uploads.",
      "Triage driver questions and route changes.",
    ],
    permissions: [
      p("dashboard", ALL_VIEW_ACTIONS),
      p("bookings", ["view", "create", "edit"]),
      p("trips", ["view", "create", "edit"]),
      p("trucks", ["view"]),
      p("drivers", ["view"]),
      p("expenses", ["view"]),
      p("fuel", ["view", "create"]),
      p("compliance", ["view"]),
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "jd-drv",
    code: "DRV",
    title: "Driver",
    level: "operator",
    summary: "Drives the truck. Submits POD, expense receipts, and trip updates from the driver PWA. Doesn't access the office app.",
    responsibilities: [
      "Operate the truck safely and complete the trip on time.",
      "Capture odometer at start/end and at each fuel stop.",
      "Photograph and submit expense receipts and POD documents.",
      "Update trip status (loaded / departed / at border / arrived).",
    ],
    permissions: [
      // Driver PWA is a separate app; here we simply restrict their
      // visibility on the office side to the trips they're on.
      p("trips", ["view"]),
      p("expenses", ["view", "create"]),
      p("fuel", ["view", "create"]),
    ],
    createdAt: new Date().toISOString(),
  },
];
for (const jd of jdSeed) jobDescriptions.set(jd.id, jd);

// Default assignments: map office staff + drivers to their JD
const defaultAssignments: Array<[string, string]> = [
  ["emp-001", "jd-md"],
  ["emp-002", "jd-fm"],
  ["emp-003", "jd-om"],
  ["emp-004", "jd-hrm"],
  ["emp-005", "jd-frm"],
  ["emp-006", "jd-dsp"],
  ["emp-007", "jd-mec"],
];
for (const [eid, jid] of defaultAssignments) {
  if (employees.has(eid) && jobDescriptions.has(jid)) {
    jdAssignments.set(eid, jid);
  }
}
for (const e of employees.values()) {
  if (e.driverId && !jdAssignments.has(e.id)) {
    jdAssignments.set(e.id, "jd-drv");
  }
}

export function listJobDescriptions(): JobDescription[] {
  const list = [...jobDescriptions.values()].map((jd) => {
    let count = 0;
    for (const v of jdAssignments.values()) if (v === jd.id) count++;
    return { ...jd, assignedCount: count };
  });
  return list.sort((a, b) => a.code.localeCompare(b.code));
}

export function getJobDescription(id: string): JobDescription | undefined {
  const jd = jobDescriptions.get(id);
  if (!jd) return undefined;
  let count = 0;
  for (const v of jdAssignments.values()) if (v === id) count++;
  return { ...jd, assignedCount: count };
}

export function jobDescriptionForEmployee(employeeId: string): JobDescription | undefined {
  const jdId = jdAssignments.get(employeeId);
  return jdId ? getJobDescription(jdId) : undefined;
}

export function employeesAssignedToJd(jdId: string): Employee[] {
  const out: Employee[] = [];
  for (const [eid, j] of jdAssignments.entries()) {
    if (j !== jdId) continue;
    const e = employees.get(eid);
    if (e) out.push(e);
  }
  return out;
}

export function assignJobDescription(
  employeeId: string,
  jdId: string,
): { ok: true } | { ok: false; error: string } {
  if (!employees.has(employeeId)) return { ok: false, error: "Employee not found" };
  if (!jobDescriptions.has(jdId)) return { ok: false, error: "Job description not found" };
  jdAssignments.set(employeeId, jdId);
  return { ok: true };
}

export function clearJobDescription(employeeId: string): boolean {
  return jdAssignments.delete(employeeId);
}


// ============================================================
// Phase 9 — Monthly Management Pack
// ============================================================
const managementPacks = new Map<string, ManagementPack>();

function ymBounds(yearMonth: string): { startDate: string; endDate: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const startDate = `${yearMonth}-01`;
  const lastDay = new Date(y!, m!, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function seedManagementPacks() {
  const now = new Date();
  // Prior month — signed-off
  const prior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const priorYm = `${prior.getFullYear()}-${String(prior.getMonth() + 1).padStart(2, "0")}`;
  const priorBounds = ymBounds(priorYm);
  managementPacks.set(`mpk-${priorYm}`, {
    id: `mpk-${priorYm}`,
    yearMonth: priorYm,
    startDate: priorBounds.startDate,
    endDate: priorBounds.endDate,
    status: "signed_off",
    narrative:
      "Operationally solid month. Revenue ahead of plan driven by Northern Corridor volume; gross margin held within target band. Workshop spend dipped after the engine overhaul programme wrapped in mid-March.",
    highlights:
      "• Mombasa→Kampala lane revenue up vs prior month\n• Two new long-haul contracts signed with Bidco and Unilever\n• Zero RTA incidents and 100% POD compliance",
    risks:
      "• Two driver licences expire within the next 60 days — renewal scheduled\n• Ageing AR concentrated in one customer (90+ bucket needs escalation)\n• Diesel pump price up 4% — to be passed through to Q3 contracts",
    preparedById: "emp-002",
    preparedAt: new Date(prior.getTime() + 25 * 86400_000).toISOString(),
    reviewedById: "emp-003",
    reviewedAt: new Date(prior.getTime() + 27 * 86400_000).toISOString(),
    signedOffById: "emp-001",
    signedOffAt: new Date(prior.getTime() + 29 * 86400_000).toISOString(),
    createdAt: new Date(prior.getTime() + 24 * 86400_000).toISOString(),
  });

  // Current month — draft
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentBounds = ymBounds(currentYm);
  managementPacks.set(`mpk-${currentYm}`, {
    id: `mpk-${currentYm}`,
    yearMonth: currentYm,
    startDate: currentBounds.startDate,
    endDate: currentBounds.endDate,
    status: "draft",
    narrative: "",
    highlights: "",
    risks: "",
    createdAt: new Date().toISOString(),
  });
}
if (DEMO_DATA) seedManagementPacks();

export function listManagementPacks(): ManagementPack[] {
  return [...managementPacks.values()].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
}
export function getManagementPack(id: string): ManagementPack | undefined {
  return managementPacks.get(id);
}
export function createManagementPack(yearMonth: string): ManagementPack | { error: string } {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return { error: "yearMonth must be YYYY-MM" };
  const id = `mpk-${yearMonth}`;
  if (managementPacks.has(id)) return { error: "Pack for that month already exists" };
  const { startDate, endDate } = ymBounds(yearMonth);
  const pack: ManagementPack = {
    id,
    yearMonth,
    startDate,
    endDate,
    status: "draft",
    narrative: "",
    highlights: "",
    risks: "",
    createdAt: new Date().toISOString(),
  };
  managementPacks.set(id, pack);
  return pack;
}
export function updateManagementPackNarrative(input: {
  id: string;
  narrative: string;
  highlights: string;
  risks: string;
}): ManagementPack | { error: string } {
  const pack = managementPacks.get(input.id);
  if (!pack) return { error: "Pack not found" };
  if (pack.status === "signed_off" || pack.status === "published") {
    return { error: `Pack is ${pack.status} — locked` };
  }
  const updated: ManagementPack = {
    ...pack,
    narrative: input.narrative,
    highlights: input.highlights,
    risks: input.risks,
  };
  managementPacks.set(input.id, updated);
  return updated;
}
export function advanceManagementPack(
  id: string,
  to: ManagementPackStatus,
  actorId: string,
): ManagementPack | { error: string } {
  const pack = managementPacks.get(id);
  if (!pack) return { error: "Pack not found" };
  if (PACK_STATUS_ORDER.indexOf(to) <= PACK_STATUS_ORDER.indexOf(pack.status)) {
    return { error: `Cannot move from ${pack.status} back to ${to}` };
  }
  const now = new Date().toISOString();
  const updated: ManagementPack = {
    ...pack,
    status: to,
    preparedById:
      to === "in_review" && !pack.preparedById ? actorId : pack.preparedById,
    preparedAt:
      to === "in_review" && !pack.preparedAt ? now : pack.preparedAt,
    reviewedById:
      to === "signed_off" || (to === "in_review" && pack.preparedById)
        ? to === "signed_off" ? actorId : pack.reviewedById
        : pack.reviewedById,
    reviewedAt: to === "signed_off" && !pack.reviewedAt ? now : pack.reviewedAt,
    signedOffById: to === "signed_off" ? actorId : pack.signedOffById,
    signedOffAt: to === "signed_off" ? now : pack.signedOffAt,
    publishedAt: to === "published" ? now : pack.publishedAt,
  };
  managementPacks.set(id, updated);
  return updated;
}
