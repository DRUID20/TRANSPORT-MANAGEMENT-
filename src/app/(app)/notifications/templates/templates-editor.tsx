"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { updateTemplate } from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChannelPill } from "@/components/notifications/channel-pill";
import { renderTemplate, type NotificationTemplate } from "@/lib/types/notifications";

export function TemplatesEditor({ templates }: { templates: NotificationTemplate[] }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {templates.map((t) => (
        <SingleEditor key={t.id} template={t} />
      ))}
    </div>
  );
}

const previewPayload: Record<string, string> = {
  tripNumber: "TRP-2026-0117",
  origin: "Mombasa",
  destination: "Kampala",
  truckPlate: "KCA 123A",
  driverName: "Joseph Mwangi",
  eta: "14:00",
  manifest: "MN-2026-0117",
  weight: "28 t",
  border: "Malaba",
  employee: "Grace Akinyi",
  number: "REQ-2026-00001",
  currency: "KES",
  amount: "12,500",
  reason: "Family holiday",
  method: "M-Pesa",
  customer: "Unilever Kenya",
  supplier: "Total Kenya",
  dueDate: "2026-06-15",
  daysToDue: "7",
  daysLate: "12",
  leaveType: "Annual",
  startDate: "2026-06-01",
  endDate: "2026-06-05",
  days: "5",
  approver: "Faith Njeri",
  period: "2026-05",
  grossPay: "350,000",
  deductions: "85,000",
  netPay: "265,000",
  bankOrMpesa: "M-Pesa",
  principal: "100,000",
  monthlyRecovery: "10,000",
  termMonths: "12",
  kind: "Diesel Mechanic Cert",
  expiryDate: "2026-12-31",
  daysToExpiry: "20",
  fault: "Air leak",
  duration: "4 hours",
  cost: "12,500",
  stage: "Manager reviewed",
  cycle: "2026",
  summary: "3 trips closed, 2 invoices issued, 1 alert.",
  date: new Date().toISOString().slice(0, 10),
  href: "/notifications",
};

function SingleEditor({ template }: { template: NotificationTemplate }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = subject !== template.subject || body !== template.body;

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await updateTemplate({ id: template.id, subject, body });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between">
        <ChannelPill channel={template.channel} />
        {template.mandatory && (
          <span className="text-[10px] uppercase tracking-wider text-fg-tertiary">
            Mandatory — channel cannot be opted-out
          </span>
        )}
      </div>
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-2 text-xs text-status-danger">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] uppercase tracking-wider">
          {template.channel === "sms" ? "Body" : "Subject"}
        </Label>
        {template.channel !== "sms" && (
          <Input
            value={subject}
            onChange={(e) => setSubject(e.currentTarget.value)}
            className="font-mono text-xs"
          />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] uppercase tracking-wider">Body</Label>
        <Textarea
          value={template.channel === "sms" ? subject : body}
          onChange={(e) => {
            if (template.channel === "sms") setSubject(e.currentTarget.value);
            else setBody(e.currentTarget.value);
          }}
          rows={template.channel === "sms" ? 2 : 4}
          className="font-mono text-xs"
        />
        {template.channel === "sms" && (
          <span className="text-[10px] text-fg-tertiary">
            {subject.length} chars · {Math.max(1, Math.ceil(subject.length / 153))} segment(s)
          </span>
        )}
      </div>
      {/* Preview */}
      <div className="rounded-md border border-dashed border-border bg-bg-base/40 p-3">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-fg-tertiary">Preview</div>
        {template.channel !== "sms" && (
          <div className="font-semibold text-fg-primary">
            {renderTemplate(subject, previewPayload)}
          </div>
        )}
        <pre className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-fg-secondary">
          {renderTemplate(template.channel === "sms" ? subject : body, previewPayload)}
        </pre>
      </div>
      <div className="flex items-center justify-end gap-2">
        {saved && <span className="text-[11px] text-status-success">Saved.</span>}
        <Button size="sm" onClick={save} disabled={!dirty || pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </Button>
      </div>
    </div>
  );
}
