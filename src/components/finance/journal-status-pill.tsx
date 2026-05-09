import { Badge } from "@/components/ui/badge";
import type { JournalStatus } from "@/lib/types/ledger";

const config: Record<
  JournalStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  draft:    { label: "Draft",    variant: "neutral" },
  posted:   { label: "Posted",   variant: "success" },
  reversed: { label: "Reversed", variant: "danger" },
};

export function JournalStatusPill({ status }: { status: JournalStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}
