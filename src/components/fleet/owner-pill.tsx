import { Building2, Handshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OwnerType } from "@/lib/types/fleet";

export function OwnerPill({ ownerType }: { ownerType: OwnerType }) {
  if (ownerType === "company_owned") {
    return (
      <Badge variant="info" className="!bg-brand-blue/10 !text-brand-blue !ring-brand-blue/20">
        <Building2 className="size-3" />
        Company-Owned
      </Badge>
    );
  }
  return (
    <Badge variant="warning">
      <Handshake className="size-3" />
      Subcontractor
    </Badge>
  );
}
