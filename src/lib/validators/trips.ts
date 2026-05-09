import { z } from "zod";

const currencyEnum = z.enum(["KES", "USD", "UGX", "TZS", "RWF"]);
const basisEnum = z.enum(["per_trip", "per_tonne", "per_km", "per_container"]);
const cargoUnitEnum = z.enum(["tonnes", "TEUs", "units", "litres"]);

export const customerCreateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  phone: z.string().min(7, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  kraPin: z.string().optional(),
  billingAddress: z.string().optional(),
  billingCurrency: z.enum(["KES", "USD"]).default("KES"),
  paymentTermsDays: z.coerce.number().int().min(0).max(180).default(30),
  notes: z.string().optional(),
});
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export const rateCreateSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  customerId: z.string().optional(),
  cargoClass: z.string().optional(),
  basis: basisEnum,
  amount: z.coerce.number().positive(),
  currency: currencyEnum,
  notes: z.string().optional(),
});
export type RateCreateInput = z.infer<typeof rateCreateSchema>;

export const bookingCreateSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  origin: z.string().min(2),
  destination: z.string().min(2),
  cargoType: z.string().min(2),
  cargoQuantity: z.coerce.number().positive(),
  cargoUnit: cargoUnitEnum,
  requestedDate: z.string().min(1, "Requested date is required"),
  agreedAmount: z.coerce.number().positive(),
  agreedBasis: basisEnum,
  agreedCurrency: currencyEnum,
  notes: z.string().optional(),
});
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

export const tripPlanSchema = z.object({
  bookingId: z.string().min(1),
  truckId: z.string().min(1, "Truck is required"),
  trailerId: z.string().optional(),
  driverId: z.string().min(1, "Driver is required"),
  driverAdvanceKes: z.coerce.number().nonnegative().optional(),
  plannedDepartureDate: z.string().optional(),
  plannedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
});
export type TripPlanInput = z.infer<typeof tripPlanSchema>;
