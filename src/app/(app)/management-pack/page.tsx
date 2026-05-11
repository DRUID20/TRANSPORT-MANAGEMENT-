import Link from "next/link";
import { ArrowRight, FileBarChart, Plus } from "lucide-react";
import { listManagementPacks } from "@/server/actions/management-pack";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { STATUS_LABELS, type ManagementPackStatus } from "@/lib/types/management-pack";

const STATUS_VARIANT: Record<
  ManagementPackStatus,
  "neutral" | "info" | "success" | "warning"
> = {
  draft: "neutral",
  in_review: "warning",
  signed_off: "success",
  published: "info",
};

export default async function ManagementPackHubPage() {
  const packs = await listManagementPacks();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance · Monthly close"
        title="Management Pack"
        description="One auto-composed close pack per month. Prepared → Reviewed → Signed-off → Published."
        actions={
          <Button asChild>
            <Link href="/management-pack/new">
              <Plus className="size-4" />
              New pack
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packs.map((p) => (
          <Link
            key={p.id}
            href={`/management-pack/${p.id}`}
            className="group block rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                <FileBarChart className="size-5" />
              </div>
              <Badge variant={STATUS_VARIANT[p.status]} dot>
                {STATUS_LABELS[p.status]}
              </Badge>
            </div>
            <div className="mt-3">
              <div className="text-xl font-semibold text-fg-primary group-hover:text-brand-blue">
                {p.yearMonth}
              </div>
              <div className="font-mono text-[11px] tnum text-fg-tertiary">
                {p.startDate} → {p.endDate}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] text-fg-tertiary">
              <span>
                {p.preparedAt
                  ? p.signedOffAt
                    ? `Signed-off ${p.signedOffAt.slice(0, 10)}`
                    : `Prepared ${p.preparedAt.slice(0, 10)}`
                  : "Not started"}
              </span>
              <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
        {packs.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-sm text-fg-tertiary">
              No management packs yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
