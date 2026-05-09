import Link from "next/link";
import { Phone, Plus, Tag, Wallet } from "lucide-react";
import { listSuppliers } from "@/server/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  bank: "Bank",
  cash: "Cash",
} as const;

export default async function SuppliersPage() {
  const suppliers = await listSuppliers();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Suppliers"
        description="Vendors paid through Accounts Payable. Used by Workshop / Job Cards in Phase 1C and AP in Phase 5."
        actions={
          <Button asChild>
            <Link href="/suppliers/new">
              <Plus className="size-4" />
              Add Supplier
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((s) => (
          <Link
            key={s.id}
            href={`/suppliers/${s.id}`}
            className="group rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-fg-primary group-hover:text-brand-blue">
                  {s.name}
                </div>
                {s.contactPerson && (
                  <div className="mt-0.5 text-xs text-fg-tertiary">{s.contactPerson}</div>
                )}
                {s.defaultExpenseCategory && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-bg-base px-2 py-0.5 text-[11px] text-fg-secondary ring-1 ring-border">
                    <Tag className="size-2.5" />
                    {s.defaultExpenseCategory}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
              <div className="flex items-center gap-1.5 text-fg-secondary">
                <Phone className="size-3 text-fg-tertiary" />
                <span className="font-mono tnum">{s.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-fg-secondary">
                <Wallet className="size-3 text-fg-tertiary" />
                <span>{methodLabel[s.defaultPaymentMethod]}</span>
              </div>
            </div>

            <div className="mt-3">
              <Badge variant="info">{termsLabel[s.paymentTerms]}</Badge>
            </div>
          </Link>
        ))}
        {suppliers.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-sm text-fg-tertiary">
              No suppliers yet.{" "}
              <Link href="/suppliers/new" className="text-brand-blue hover:underline">
                Add the first one →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
