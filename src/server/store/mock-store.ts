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
import { allowedTransitions, isTerminal } from "@/lib/types/trips";
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
const trucks = new Map<string, Truck>(truckSeed.map((t) => [t.id, t]));
const subcontractors = new Map<string, Subcontractor>(
  subcontractorSeed.map((s) => [s.id, s]),
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

const trailers = new Map<string, Trailer>(trailerSeed.map((t) => [t.id, t]));

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
    status: "on_trip",
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
    status: "on_trip",
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

const drivers = new Map<string, Driver>(driverSeed.map((d) => [d.id, d]));

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

const suppliers = new Map<string, Supplier>(supplierSeed.map((s) => [s.id, s]));

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
seedJobCards();

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

const customers = new Map<string, Customer>(customerSeed.map((c) => [c.id, c]));

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
  { id: "rate-001", origin: "Mombasa", destination: "Kampala", basis: "per_tonne", amount: 95,    currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-002", origin: "Mombasa", destination: "Kigali",  basis: "per_tonne", amount: 145,   currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-003", origin: "Mombasa", destination: "Goma",    basis: "per_tonne", amount: 195,   currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-004", origin: "Mombasa", destination: "Bujumbura", basis: "per_tonne", amount: 175, currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-005", origin: "Nairobi", destination: "Juba",    basis: "per_tonne", amount: 220,   currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-006", origin: "Nairobi", destination: "Dar es Salaam", basis: "per_tonne", amount: 75, currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-007", origin: "Mombasa", destination: "Mwanza",  basis: "per_tonne", amount: 85,    currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  { id: "rate-008", origin: "Mombasa", destination: "Nairobi", basis: "per_tonne", amount: 18,    currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
  // Customer-specific override (Pearl of Africa Coffee gets a discounted Mombasa→Kampala)
  { id: "rate-009", origin: "Mombasa", destination: "Kampala", customerId: "cus-002", basis: "per_tonne", amount: 88, currency: "USD", notes: "Volume agreement", createdAt: "2025-02-15T08:00:00Z" },
  // Container-class
  { id: "rate-010", origin: "Mombasa", destination: "Kigali",  cargoClass: "containerised", basis: "per_container", amount: 3200, currency: "USD", createdAt: "2025-01-01T08:00:00Z" },
];

const rates = new Map<string, Rate>(rateSeed.map((r) => [r.id, r]));

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
      agreedBasis: "per_tonne",
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
      agreedBasis: "per_tonne",
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
      agreedBasis: "per_container",
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
      agreedBasis: "per_tonne",
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
      agreedBasis: "per_tonne",
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
seedBookings();

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
      revenueAmount: b.agreedBasis === "per_tonne" ? b.agreedAmount * b.cargoQuantity
                   : b.agreedBasis === "per_container" ? b.agreedAmount * b.cargoQuantity
                   : b.agreedAmount,
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
seedTrips();

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
  if (booking.status === "planned" || booking.status === "cancelled") return undefined;

  const id = randomUUID();
  const revenue =
    booking.agreedBasis === "per_tonne" || booking.agreedBasis === "per_container"
      ? booking.agreedAmount * booking.cargoQuantity
      : booking.agreedAmount;
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
seedTripEvents();

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
seedTripDocuments();

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
seedBorderCrossings();

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
seedExpenses();

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
seedFuelLogs();

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
