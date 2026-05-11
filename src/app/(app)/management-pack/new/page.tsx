import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { NewPackForm } from "./new-pack-form";

export default function NewManagementPackPage() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Management Pack", href: "/management-pack" },
          { label: "New pack" },
        ]}
        eyebrow="Finance · Monthly close"
        title="New management pack"
        description="Auto-populates every section from the underlying reports."
      />
      <NewPackForm defaultYearMonth={ym} />
      <div className="text-center">
        <Link href="/management-pack" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Management Pack
        </Link>
      </div>
    </div>
  );
}
