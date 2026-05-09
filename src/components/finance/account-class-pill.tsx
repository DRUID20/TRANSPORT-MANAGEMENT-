import { Badge } from "@/components/ui/badge";
import type { AccountClass } from "@/lib/types/accounts";

const config: Record<
  AccountClass,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  Asset:           { label: "Asset",         variant: "info" },
  Liability:       { label: "Liability",     variant: "warning" },
  Equity:          { label: "Equity",        variant: "neutral" },
  Income:          { label: "Income",        variant: "success" },
  "Direct Cost":   { label: "Direct Cost",   variant: "danger" },
  Expense:         { label: "Expense",       variant: "danger" },
  "Other Income":  { label: "Other Income",  variant: "success" },
  "Other Expense": { label: "Other Expense", variant: "danger" },
  Tax:             { label: "Tax",           variant: "neutral" },
};

export function AccountClassPill({ klass }: { klass: AccountClass }) {
  const c = config[klass];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
