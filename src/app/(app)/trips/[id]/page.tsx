import { redirect, notFound } from "next/navigation";
import { getTripById } from "@/server/actions/trips";
import { currentStage } from "@/lib/trips/wizard-stages";

/**
 * /trips/[id] is a thin redirect into the current wizard stage. Keeps
 * old bookmarks working and means dispatchers always land on the right
 * step for whichever trip status they're on.
 */
export default async function TripIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) notFound();
  const stage = currentStage(trip.status, { readyToInvoice: trip.readyToInvoice });
  redirect(`/trips/${id}/${stage}`);
}
