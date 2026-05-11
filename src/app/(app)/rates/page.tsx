import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { listRates } from "@/server/actions/rates";
import { listCustomers } from "@/server/actions/customers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const rates = await listRates();
  const customers = await listCustomers();
  const customerById = new Map(customers.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Rate Table"
        description="Destination-driven rates. Customer-specific rates override the default for that route."
        actions={
          <Button asChild>
            <Link href="/rates/new">
              <Plus className="size-4" />
              Add Rate
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Route</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Cargo class</th>
                  <th className="px-5 py-3 text-right font-medium">Rate</th>
                  <th className="px-5 py-3 font-medium">Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rates.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 text-fg-primary">
                        <span className="font-medium">{r.origin}</span>
                        <ArrowRight className="size-3 text-fg-tertiary" />
                        <span className="font-medium">{r.destination}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3">
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
                    </td>
                    <td className="px-5 py-3 text-xs text-fg-secondary">
                      {r.cargoClass ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tnum text-fg-primary">
                      {r.amount.toLocaleString()} {r.currency}
                    </td>
                    <td className="px-5 py-3 text-xs text-fg-secondary">
                      {basisLabel[r.basis]}
                    </td>
                  </tr>
                ))}
                {rates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No rates configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
