import { notFound } from "next/navigation";
import { CreditCard, FileText, Mail, Phone, Smartphone, Tag, User } from "lucide-react";
import { getSupplierById } from "@/server/actions/suppliers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";

const termsLabel = {
  cash_on_delivery: "Cash on delivery",
  net_7: "Net 7",
  net_14: "Net 14",
  net_30: "Net 30",
  net_60: "Net 60",
} as const;

const methodLabel = {
  mpesa: "M-Pesa",
  bank: "Bank transfer",
  cash: "Cash",
} as const;

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sup = await getSupplierById(id);
  if (!sup) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Suppliers", href: "/suppliers" },
          { label: sup.name },
        ]}
        eyebrow="Supplier"
        title={sup.name}
        actions={
          <>
            <Badge variant="info">{termsLabel[sup.paymentTerms]}</Badge>
            <Badge variant="outline">{methodLabel[sup.defaultPaymentMethod]}</Badge>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {sup.contactPerson && <Row icon={User} label="Contact" value={sup.contactPerson} />}
            <Row icon={Phone} label="Phone" value={sup.phone} mono />
            {sup.email && <Row icon={Mail} label="Email" value={sup.email} />}
            {sup.kraPin && <Row icon={FileText} label="KRA PIN" value={sup.kraPin} mono />}
            {sup.defaultExpenseCategory && (
              <Row icon={Tag} label="Default category" value={sup.defaultExpenseCategory} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
            <CardDescription>How AP settles this supplier by default</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Row icon={CreditCard} label="Terms" value={termsLabel[sup.paymentTerms]} />
            <Row icon={Smartphone} label="Method" value={methodLabel[sup.defaultPaymentMethod]} />
            {sup.mpesaNumber && <Row icon={Smartphone} label="M-Pesa" value={sup.mpesaNumber} mono />}
            {sup.bankName && <Row icon={CreditCard} label="Bank" value={sup.bankName} />}
            {sup.bankAccount && <Row icon={CreditCard} label="Account" value={sup.bankAccount} mono />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AP activity</CardTitle>
          <CardDescription>Bills + payments will appear here in Phase 5</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-xs text-fg-tertiary">
            Once the AP module ships, this supplier's bills, balance, and aging
            will appear here.
          </div>
        </CardContent>
      </Card>

      {sup.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{sup.notes}</p>
          </CardContent>
        </Card>
      )}
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
