import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  CreditCard,
  FileText,
  Mail,
  Phone,
  Smartphone,
  Truck as TruckIcon,
} from "lucide-react";
import { getSubcontractorById } from "@/server/actions/subcontractors";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { TruckStatusPill } from "@/components/fleet/truck-status-pill";

export default async function SubcontractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sub = await getSubcontractorById(id);
  if (!sub) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Subcontractors", href: "/subcontractors" },
          { label: sub.name },
        ]}
        eyebrow="Partner"
        title={sub.name}
        description={`Contact: ${sub.contactPerson}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Contact card */}
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ContactRow icon={Building2} label="Contact person" value={sub.contactPerson} />
            <ContactRow icon={Phone} label="Phone" value={sub.phone} mono />
            {sub.email && <ContactRow icon={Mail} label="Email" value={sub.email} />}
            {sub.kraPin && <ContactRow icon={FileText} label="KRA PIN" value={sub.kraPin} mono />}
          </CardContent>
        </Card>

        {/* Settlement card */}
        <Card>
          <CardHeader>
            <CardTitle>Year-end settlement</CardTitle>
            <CardDescription>Rate methodology TBD</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {sub.mpesaNumber && (
              <ContactRow icon={Smartphone} label="M-Pesa" value={sub.mpesaNumber} mono />
            )}
            {sub.bankName && (
              <ContactRow icon={CreditCard} label="Bank" value={sub.bankName} />
            )}
            {sub.bankAccount && (
              <ContactRow
                icon={CreditCard}
                label="Account"
                value={sub.bankAccount}
                mono
              />
            )}
            {!sub.mpesaNumber && !sub.bankName && !sub.bankAccount && (
              <span className="text-sm text-fg-tertiary">No settlement details on file.</span>
            )}
          </CardContent>
        </Card>

        {/* Trucks count */}
        <Card>
          <CardHeader>
            <CardTitle>Trucks</CardTitle>
            <CardDescription>Operating under Nile Valley</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="font-mono text-5xl tnum font-semibold text-fg-primary">
              {sub.trucks.length}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-fg-tertiary">
              registered
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trucks list */}
      <Card>
        <CardHeader>
          <CardTitle>Trucks owned by {sub.name}</CardTitle>
          <CardDescription>
            Click any truck to drill into its asset record.
          </CardDescription>
        </CardHeader>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Registration</th>
                  <th className="px-5 py-3 font-medium">Make / Model</th>
                  <th className="px-5 py-3 font-medium">Year</th>
                  <th className="px-5 py-3 font-medium">Capacity</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sub.trucks.map((t) => (
                  <tr key={t.id} className="group transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-3">
                      <Link href={`/trucks/${t.id}`} className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                          <TruckIcon className="size-3.5 text-fg-tertiary" />
                        </span>
                        <span className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
                          {t.registration}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-fg-primary">
                      {t.make} <span className="text-fg-tertiary">{t.model}</span>
                    </td>
                    <td className="px-5 py-3 font-mono tnum text-fg-secondary">{t.year}</td>
                    <td className="px-5 py-3 font-mono tnum text-fg-secondary">
                      {t.capacityTonnes}t
                    </td>
                    <td className="px-5 py-3">
                      <TruckStatusPill status={t.status} />
                    </td>
                  </tr>
                ))}
                {sub.trucks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No trucks registered to this subcontractor yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {sub.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{sub.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ContactRow({
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
        <div
          className={
            "text-sm text-fg-primary " + (mono ? "font-mono tnum tracking-wider" : "")
          }
        >
          {value}
        </div>
      </div>
    </div>
  );
}
