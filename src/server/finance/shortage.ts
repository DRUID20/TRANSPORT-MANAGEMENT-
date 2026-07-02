import { getTrip } from "@/server/repos/trips";
import { getEmployeeByDriverId } from "@/server/repos/hr";
import { listLoans, cancelLoan } from "@/server/repos/payroll";

/**
 * Reverse the auto-raised driver shortage loan for a trip.
 *
 * The shortage loan is created at invoice time (recordDriverShortageIfAny) and
 * keyed by `shortageTripId`. It must be reversed whenever the invoice that
 * justified it goes away — i.e. the trip is reopened OR the invoice is
 * cancelled — otherwise the driver keeps a live payroll deduction for a
 * charge that no longer exists. Idempotent: only an ACTIVE loan for this exact
 * trip is cancelled; a no-op if none exists.
 */
export async function reverseTripShortageLoan(tripId: string): Promise<void> {
  const trip = await getTrip(tripId);
  if (!trip?.driverId) return;
  const employee = await getEmployeeByDriverId(trip.driverId);
  if (!employee) return;
  const loans = await listLoans({ employeeId: employee.id });
  const shortageLoan = loans.find((l) => l.shortageTripId === tripId && l.status === "active");
  if (shortageLoan) await cancelLoan(shortageLoan.id);
}
