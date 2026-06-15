import Link from "next/link";
import { listSuppliers } from "@/server/actions/suppliers";
import { PageHeader } from "@/components/layout/page-header";
import { AssetCreateForm } from "./asset-create-form";

export const dynamic = "force-dynamic";

export default async function NewAssetPage() {
  const suppliers = (await listSuppliers()).map((s) => ({ id: s.id, name: s.name }));
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Asset Register", href: "/assets" }, { label: "New asset" }]}
        eyebrow="Finance · Assets"
        title="Register Asset"
        description="Add a fixed asset to the register. Depreciation is computed from the method, life and cost."
      />
      <AssetCreateForm suppliers={suppliers} />
      <div className="text-center">
        <Link href="/assets" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Asset Register
        </Link>
      </div>
    </div>
  );
}
