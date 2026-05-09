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
