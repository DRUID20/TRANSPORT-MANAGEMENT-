import Link from "next/link";
import { ArrowRight, Plus, Tag } from "lucide-react";
import { listRates } from "@/server/actions/rates";
import { listCustomers } from "@/server/actions/customers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";

const basisLabel = {
  per_trip: "per trip",
  per_litre: "per litre",
  per_litre_per_km: "per litre per km",
  per_km: "per km",
  per_tonne: "per tonne",
  per_container: "per container",
} as const;

export default async function RatesPage() {
  const [rates, customers] = await Promise.all([listRates(), listCustomers()]);
  const customerById = new Map(customers.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Rate table"
        actions={
          <Button asChild>
            <Link href="/rates/new">
              <Plus className="size-4" />
              Add rate
            </Link>
          </Button>
        }
      />

      {rates.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={Tag}
            title="No rates configured"
            description="Add a default per-litre rate for your KPC routes; the booking form looks them up automatically."
            action={
              <Button asChild>
                <Link href="/rates/new">
                  <Plus className="size-3.5" />
                  Add rate
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable
          caption={
            <span>
              {rates.length} rate{rates.length === 1 ? "" : "s"} on file
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Route</DataTableHeaderCell>
              <DataTableHeaderCell>Customer</DataTableHeaderCell>
              <DataTableHeaderCell>Product</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Rate</DataTableHeaderCell>
              <DataTableHeaderCell>Basis</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rates.map((r) => (
              <DataTableRow key={r.id}>
                <DataTableCell>
                  <span className="inline-flex items-center gap-2 text-sm text-fg-primary">
                    <span className="font-medium">{r.origin}</span>
                    <ArrowRight className="size-3 text-fg-tertiary" />
                    <span className="font-medium">{r.destination}</span>
                  </span>
                </DataTableCell>
                <DataTableCell>
                  {r.customerId ? (
                    <Link
                      href={`/customers/${r.customerId}`}
                      className="text-xs text-brand-blue hover:underline"
                    >
                      {customerById.get(r.customerId)?.name ?? r.customerId}
                    </Link>
                  ) : (
                    <Badge variant="outline">Default</Badge>
                  )}
                </DataTableCell>
                <DataTableCell className="text-xs text-fg-secondary">
                  {r.cargoClass ?? <span className="text-fg-tertiary">Any</span>}
                </DataTableCell>
                <DataTableCell mono align="right" className="text-fg-primary">
                  {r.amount.toLocaleString(undefined, {
                    minimumFractionDigits: r.amount < 1 ? 4 : 0,
                    maximumFractionDigits: r.amount < 1 ? 4 : 2,
                  })}{" "}
                  {r.currency}
                </DataTableCell>
                <DataTableCell className="text-xs text-fg-secondary">
                  {basisLabel[r.basis]}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
