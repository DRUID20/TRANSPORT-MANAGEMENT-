import { z } from "zod";

const currencyEnum = z.enum(["KES", "USD", "UGX", "TZS", "RWF"]);
// Legacy + fuel-specific basis values. Fuel rate cards use per_litre / per_litre_per_km.
const basisEnum = z.enum([
  "per_trip",
  "per_litre",
  "per_litre_per_km",
  "per_km",
  "per_tonne",
  "per_container",
]);
const cargoUnitEnum = z.enum(["tonnes", "TEUs", "units", "litres"]);
const productEnum = z.enum(["PMS", "AGO"]);
const customerTypeEnum = z.enum(["service_station", "industrial", "transporter", "other"]);

export const customerCreateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  phone: z.string().min(7, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  kraPin: z.string().optional(),
  customerType: customerTypeEnum.optional(),
  epraLicenceNumber: z.string().optional(),
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
  /** Fuel product. Optional during F-1 so the legacy create form keeps
   *  working; F-2 rewrites the form to make this required. */
  product: productEnum.optional(),
  /** Volume in litres. */
  cargoQuantity: z.coerce.number().positive(),
  /** Always 'litres' for fuel; kept on the schema for round-trip with the
   *  legacy Booking type. */
  cargoUnit: cargoUnitEnum.default("litres"),
  /** Kept for legacy seeds; new bookings will have it auto-derived from product. */
  cargoType: z.string().min(1).optional(),
  requestedDate: z.string().min(1, "Requested date is required"),
  agreedAmount: z.coerce.number().positive(),
  agreedBasis: basisEnum,
  agreedCurrency: currencyEnum,
  notes: z.string().optional(),
});
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

/** Schema for capturing depot loading observations at the start of a trip. */
export const tripLoadingSchema = z.object({
  tripId: z.string().min(1),
  product: productEnum,
  loadedLitres: z.coerce.number().positive(),
  loadingTempC: z.coerce.number().min(-10).max(60),
  density15C: z.coerce.number().min(0.6).max(1.0),
  loadingSealNumbers: z.string().optional(),
});
export type TripLoadingInput = z.infer<typeof tripLoadingSchema>;

/** Schema for capturing customer-side discharge readings at delivery. */
export const tripDischargeSchema = z.object({
  tripId: z.string().min(1),
  dischargedLitres: z.coerce.number().positive(),
  dischargeTempC: z.coerce.number().min(-10).max(60),
  dischargeSealNumbers: z.string().optional(),
});
export type TripDischargeInput = z.infer<typeof tripDischargeSchema>;

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

export const tripReconcileSchema = z.object({
  tripId: z.string().min(1),
  actualKm: z.coerce.number().nonnegative().optional(),
  actualFuelLitres: z.coerce.number().nonnegative().optional(),
  driverAdvanceUsedKes: z.coerce.number().nonnegative().optional(),
  closingNotes: z.string().optional(),
  actorName: z.string().default("Dispatcher"),
});
export type TripReconcileInput = z.infer<typeof tripReconcileSchema>;
