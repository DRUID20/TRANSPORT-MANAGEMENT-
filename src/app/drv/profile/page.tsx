import { redirect } from "next/navigation";
import { Calendar, IdCard as IdCardIcon, Phone } from "lucide-react";
import { currentDriverId, clearDriverSession } from "@/server/actions/driver-session";
import { getDriverById } from "@/server/actions/drivers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/fleet/avatar";
import { ExpiryChip } from "@/components/fleet/expiry-chip";
import { DriverStatusPill } from "@/components/fleet/driver-status-pill";
import { Button } from "@/components/ui/button";

export default async function DriverProfilePage() {
  const driverId = await currentDriverId();
  if (!driverId) redirect("/drv/login");
  const driver = await getDriverById(driverId);
  if (!driver) redirect("/drv/login");

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="!p-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar name={driver.fullName} size="lg" />
            <div className="text-base font-semibold text-fg-primary">{driver.fullName}</div>
            <DriverStatusPill status={driver.status} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Row icon={Phone} label="Phone" value={driver.phone} mono />
          <Row icon={IdCardIcon} label="National ID" value={driver.nationalId} mono />
          {driver.hireDate && (
            <Row
              icon={Calendar}
              label="Hire date"
              value={new Date(driver.hireDate).toLocaleDateString("en-GB")}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Class {driver.licenceClass} licence</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <DocRow label="Driving licence" date={driver.licenceExpiry} />
          <DocRow label="Medical" date={driver.medicalExpiry} />
          <DocRow label="Passport" date={driver.passportExpiry} />
          <DocRow label="COMESA driver permit" date={driver.comesaDriverPermitExpiry} />
        </CardContent>
      </Card>

      <form action={clearDriverSession}>
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-fg-tertiary" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
        <div className={"text-sm text-fg-primary " + (mono ? "font-mono tnum tracking-wider" : "")}>
          {value}
        </div>
      </div>
    </div>
  );
}

function DocRow({ label, date }: { label: string; date?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-bg-base/40 px-3 py-2 ring-1 ring-border">
      <div className="text-sm text-fg-primary">{label}</div>
      <ExpiryChip date={date} />
    </div>
  );
}
