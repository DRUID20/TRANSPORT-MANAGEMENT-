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
import { getSubcontractorById, getSubcontractorAccount } from "@/server/actions/subcontractors";
import { listSuppliers } from "@/server/actions/suppliers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { TruckStatusPill } from "@/components/fleet/truck-status-pill";
import { RecordSubcontractorPayment } from "@/components/subcontractors/record-payment";

export default async function SubcontractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sub = await getSubcontractorById(id);
  if (!sub) notFound();
  const [account, suppliers] = await Promise.all([
    getSubcontractorAccount(id),
    listSuppliers(),
  ]);
  const commissionPct = Math.round((sub.commissionRate ?? 0.1) * 100);

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
            <CardTitle>Settlement</CardTitle>
            <CardDescription>We keep {commissionPct}% commission per trip</CardDescription>
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

      {/* Account / current-account statement */}
      {account && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Account</CardTitle>
                <CardDescription>
                  Their {100 - commissionPct}% share of completed trips, less payments. Positive balance = we owe them.
                </CardDescription>
              </div>
              <RecordSubcontractorPayment
                subcontractorId={id}
                suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <AccountStat label="Earned (their share)" value={account.totalEarned} tone="info" />
              <AccountStat label="Paid out" value={account.totalPaid} tone="warning" />
              <AccountStat
                label={account.closingBalance >= 0 ? "Balance we owe" : "Overdrawn"}
                value={Math.abs(account.closingBalance)}
                tone={account.closingBalance >= 0 ? "success" : "danger"}
              />
            </div>
            {account.rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-tertiary">
                No trip earnings or payments yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-fg-secondary">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Ref</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Earned</th>
                      <th className="px-3 py-2 text-right">Paid</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {account.rows.map((r, i) => (
                      <tr key={`${r.ref}-${i}`} className="transition-colors hover:bg-bg-base/40">
                        <td className="px-3 py-2 font-mono text-[11px] tnum text-fg-tertiary">{r.date}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-fg-secondary">{r.ref}</td>
                        <td className="px-3 py-2 text-fg-primary">{r.description}</td>
                        <td className="px-3 py-2 text-right font-mono tnum text-status-success">
                          {r.credit ? Math.round(r.credit).toLocaleString() : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tnum text-status-warning">
                          {r.debit ? Math.round(r.debit).toLocaleString() : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                          {Math.round(r.balance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

function AccountStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "warning" | "success" | "danger";
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "warning" ? "text-status-warning" :
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-lg font-medium ${colour}`}>
        KSh {Math.round(value).toLocaleString()}
      </div>
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
