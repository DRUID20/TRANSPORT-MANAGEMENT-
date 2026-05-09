import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { jobDescriptionForEmployeeAction } from "@/server/actions/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function EmployeeJdCard({ employeeId }: { employeeId: string }) {
  const jd = await jobDescriptionForEmployeeAction(employeeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-fg-tertiary" />
          Job description & permissions
        </CardTitle>
        <CardDescription>
          {jd
            ? `${jd.code} · ${jd.title} — ${jd.permissions.length} resources, ${jd.permissions.reduce((s, p) => s + p.actions.length, 0)} actions allowed.`
            : "No job description assigned. Each employee should have one."}
        </CardDescription>
      </CardHeader>
      {jd ? (
        <CardContent>
          <Link
            href={`/hr/job-descriptions/${jd.id}`}
            className="inline-flex items-center justify-between gap-3 rounded-md border border-border bg-bg-base/40 px-4 py-3 transition-colors hover:border-border-strong"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                <KeyRound className="size-4" />
              </div>
              <div>
                <div className="font-mono text-[10px] tnum text-fg-tertiary">{jd.code}</div>
                <div className="text-sm font-semibold text-fg-primary">{jd.title}</div>
                <div className="text-[11px] text-fg-secondary">{jd.summary}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info">{jd.level}</Badge>
              <ArrowRight className="size-3.5 text-fg-tertiary" />
            </div>
          </Link>
        </CardContent>
      ) : (
        <CardContent>
          <Link
            href="/hr/job-descriptions"
            className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
          >
            Browse job descriptions
            <ArrowRight className="size-3" />
          </Link>
        </CardContent>
      )}
    </Card>
  );
}
