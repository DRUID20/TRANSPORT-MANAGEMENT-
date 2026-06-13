"use client";

import { CheckCircle2, AlertTriangle, XCircle, Info, Activity, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTable,
  DataTableHead,
  DataTableHeaderCell,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from "@/components/ui/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Sparkline } from "@/components/dashboard/sparkline";
import { StatusPill } from "@/components/dashboard/status-pill";
import { Logo } from "@/components/layout/logo";

const trend = [12, 15, 14, 18, 22, 19, 24, 28, 25, 31, 29, 34, 38, 35, 42];

// Deterministic initials avatar — accent-tinted by name hash (§8 first col).
function DriverAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const tints = [
    "bg-brand-blue/15 text-brand-blue",
    "bg-status-success/15 text-status-success",
    "bg-status-warning/15 text-status-warning",
    "bg-status-info/15 text-status-info",
  ];
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span
      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${tints[hash % tints.length]}`}
    >
      {initials}
    </span>
  );
}

const sampleTrips = [
  { id: "TRP-2026-0142", plate: "KCB 234L", route: "Mombasa → Kampala", driver: "Joseph Mwangi", litres: 38000, status: "in_transit" as const, amount: 1_240_000 },
  { id: "TRP-2026-0141", plate: "KDA 887P", route: "Nairobi → Kigali", driver: "Amina Hassan", litres: 41200, status: "at_border" as const, amount: 1_580_000 },
  { id: "TRP-2026-0140", plate: "KBZ 119Q", route: "Eldoret → Juba", driver: "Peter Otieno", litres: 36500, status: "delayed" as const, amount: 2_010_000 },
  { id: "TRP-2026-0139", plate: "KCE 552M", route: "Mombasa → Bujumbura", driver: "Grace Wanjiru", litres: 39800, status: "delivered" as const, amount: 1_890_000 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-secondary">
          {title}
        </h2>
        <Separator className="ml-4 max-w-[60%]" />
      </div>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <div className="text-xs font-mono uppercase tracking-[0.16em] text-fg-tertiary">
          Internal · Design QA
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg-primary">Component Library</h1>
        <p className="mt-1 max-w-2xl text-sm text-fg-secondary">
          Every primitive used across TX System, rendered against both light and dark surfaces. If
          something looks off here, it'll look off everywhere — fix the token, not the screen.
        </p>
      </header>

      <Section title="Logo">
        <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border bg-bg-elevated p-6">
          <Logo variant="horizontal" />
          <Separator orientation="vertical" className="!h-10" />
          <Logo variant="icon" />
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-bg-elevated p-6">
          <Button variant="primary">Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="success">Approve</Button>
          <Button variant="danger">Delete</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Status badges">
        <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-bg-elevated p-6">
          <Badge variant="success" dot><CheckCircle2 className="size-3" /> Delivered</Badge>
          <Badge variant="warning" dot><AlertTriangle className="size-3" /> At Border</Badge>
          <Badge variant="danger" dot><XCircle className="size-3" /> Overdue</Badge>
          <Badge variant="info" dot><Info className="size-3" /> Planned</Badge>
          <Badge variant="neutral" dot><Activity className="size-3" /> Closed</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      <Section title="Trip status pills">
        <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-bg-elevated p-6">
          <StatusPill status="planned" />
          <StatusPill status="loading" />
          <StatusPill status="in_transit" />
          <StatusPill status="at_border" />
          <StatusPill status="delivered" />
          <StatusPill status="closed" />
          <StatusPill status="cancelled" />
          <StatusPill status="delayed" />
        </div>
      </Section>

      <Section title="Data table">
        <DataTable caption="1–4 of 142 trips · sorted by trip no.">
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell sortHref="#" sortActive sortDir="desc">Trip</DataTableHeaderCell>
              <DataTableHeaderCell>Truck</DataTableHeaderCell>
              <DataTableHeaderCell>Route</DataTableHeaderCell>
              <DataTableHeaderCell>Driver</DataTableHeaderCell>
              <DataTableHeaderCell sortHref="#" align="right">Litres</DataTableHeaderCell>
              <DataTableHeaderCell align="center">Status</DataTableHeaderCell>
              <DataTableHeaderCell sortHref="#" align="right">Amount</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {sampleTrips.map((t) => (
              <DataTableRow key={t.id} linkHref="#">
                <DataTableCell mono className="text-fg-secondary">{t.id}</DataTableCell>
                <DataTableCell>
                  <span className="inline-flex items-center gap-2">
                    <Truck className="size-4 text-fg-tertiary" strokeWidth={1.5} />
                    <span className="font-mono font-medium tracking-wide">{t.plate}</span>
                  </span>
                </DataTableCell>
                <DataTableCell className="text-fg-secondary">{t.route}</DataTableCell>
                <DataTableCell>
                  <span className="inline-flex items-center gap-2">
                    <DriverAvatar name={t.driver} />
                    {t.driver}
                  </span>
                </DataTableCell>
                <DataTableCell mono align="right">{t.litres.toLocaleString()}</DataTableCell>
                <DataTableCell align="center"><StatusPill status={t.status} /></DataTableCell>
                <DataTableCell mono align="right">{t.amount.toLocaleString()}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </Section>

      <Section title="Form inputs">
        <div className="grid max-w-xl gap-3 rounded-lg border border-border bg-bg-elevated p-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-secondary">Email</span>
            <Input type="email" placeholder="you@nilevalley.co.ke" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-secondary">Truck registration</span>
            <Input placeholder="KCB 421R" className="font-mono uppercase tracking-wider" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-secondary">Disabled</span>
            <Input disabled placeholder="Disabled" />
          </label>
        </div>
      </Section>

      <Section title="KPI cards">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Active Trips" value="47" delta={0.082} trend={trend} icon={<Activity className="size-4" strokeWidth={1.5} />} />
          <KpiCard label="Tonnes (MTD)" value="9,420" unit="t" delta={0.118} trend={trend} />
          <KpiCard label="Fuel Eff." value="3.42" unit="km/L" delta={-0.014} trend={trend} />
          <KpiCard
            label="Revenue"
            value="14.8M"
            unit="KES"
            delta={0.067}
            trend={trend}
            hint="≈ $114k USD"
          />
        </div>
      </Section>

      <Section title="Sparkline">
        <div className="grid gap-4 rounded-lg border border-border bg-bg-elevated p-6 sm:grid-cols-3">
          <div>
            <div className="text-xs text-fg-tertiary">Brand blue</div>
            <Sparkline data={trend} />
          </div>
          <div>
            <div className="text-xs text-fg-tertiary">Success</div>
            <Sparkline data={trend} color="rgb(var(--status-success))" />
          </div>
          <div>
            <div className="text-xs text-fg-tertiary">Danger</div>
            <Sparkline data={[...trend].reverse()} color="rgb(var(--status-danger))" />
          </div>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Standard card</CardTitle>
              <CardDescription>Used for grouped content with a header.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-fg-secondary">
                The card surface lifts off the page surface in both modes — soft shadow in light,
                tonal elevation in dark. Always use a card to group related KPIs, forms, or tables.
              </p>
            </CardContent>
          </Card>
          <div className="glass flex flex-col gap-2 rounded-lg p-6">
            <div className="text-xs uppercase tracking-wider text-fg-tertiary">Glass surface</div>
            <div className="text-lg font-semibold text-fg-primary">Frosted overlay</div>
            <div className="text-sm text-fg-secondary">
              Used for modals, command palette, and the driver POD-scan preview. Apple-style
              frosted blur over the underlying content.
            </div>
          </div>
        </div>
      </Section>

      <Section title="Typography">
        <div className="rounded-lg border border-border bg-bg-elevated p-6">
          <div className="text-4xl font-semibold tracking-tight text-fg-primary">
            Display 4xl — TX System
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-fg-primary">
            Heading 2xl — Fleet Command Centre
          </div>
          <div className="mt-1 text-base text-fg-primary">Body — Nile Valley Logistics</div>
          <div className="mt-1 text-sm text-fg-secondary">
            Secondary — Cross-border road freight, exports out of Kenya
          </div>
          <div className="mt-1 text-xs text-fg-tertiary">Tertiary — Inter font</div>
          <Separator className="my-4" />
          <div className="font-mono text-2xl tnum text-fg-primary">14,825,430.00</div>
          <div className="font-mono text-xs text-fg-tertiary">JetBrains Mono · tabular figures</div>
        </div>
      </Section>
    </div>
  );
}
