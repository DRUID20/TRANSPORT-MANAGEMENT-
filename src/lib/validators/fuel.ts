import { z } from "zod";

export const fuelLogCreateSchema = z.object({
  tripId: z.string().optional(),
  truckId: z.string().min(1, "Truck is required"),
  driverId: z.string().optional(),
  datetime: z.string().min(1),
  station: z.string().min(2, "Station is required"),
  countryCode: z.string().length(2).default("KE"),
  litres: z.coerce.number().positive(),
  costKes: z.coerce.number().positive(),
  odometerKm: z.coerce.number().positive("Odometer is required"),
  stationManagerName: z.string().min(2, "Station manager name is required"),
  expenseId: z.string().optional(),
  notes: z.string().optional(),
  submittedBy: z.string().default("Dispatcher"),
});
export type FuelLogCreateInput = z.infer<typeof fuelLogCreateSchema>;
