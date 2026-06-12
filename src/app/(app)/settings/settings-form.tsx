"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Database, Monitor, Moon, Sun } from "lucide-react";
import { Select } from "@/components/ui/select";
import { FormField, FormSection } from "@/components/ui/form-section";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FUEL_DEPOTS, ULLAGE_ALERT_THRESHOLD_PCT } from "@/lib/types/trips";

/**
 * Workspace preference keys. Single source of truth — the booking form
 * reads PREF_KEYS.defaultDepot / defaultCurrency to pre-fill its fields.
 */
export const PREF_KEYS = {
  defaultDepot: "tx.prefs.defaultDepot",
  defaultCurrency: "tx.prefs.defaultCurrency",
} as const;

const CURRENCIES = ["KES", "USD", "UGX", "TZS", "RWF"] as const;

function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode — preference simply won't persist.
  }
}

export function SettingsForm() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [defaultDepot, setDefaultDepot] = useState<string>(FUEL_DEPOTS[0]);
  const [defaultCurrency, setDefaultCurrency] = useState<string>("KES");
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  useEffect(() => {
    setDefaultDepot(readPref(PREF_KEYS.defaultDepot) ?? FUEL_DEPOTS[0]);
    setDefaultCurrency(readPref(PREF_KEYS.defaultCurrency) ?? "KES");
    setMounted(true);
  }, []);

  // Brief "Saved" confirmation next to whichever field just changed.
  function flash(field: string) {
    setSavedFlash(field);
    window.setTimeout(() => setSavedFlash((f) => (f === field ? null : f)), 1600);
  }

  if (!mounted) {
    return (
      <div className="flex flex-col gap-5">
        <div className="surface-card h-44 animate-pulse" />
        <div className="surface-card h-44 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <FormSection
        eyebrow="Personal"
        title="Appearance"
        description="Theme applies to this browser only."
        columns={1}
      >
        <FormField label="Theme">
          <SegmentedControl
            value={(theme as "light" | "dark" | "system") ?? "system"}
            onChange={(v) => setTheme(v)}
            options={[
              { value: "light", label: "Light", icon: <Sun className="size-3.5" /> },
              { value: "dark", label: "Dark", icon: <Moon className="size-3.5" /> },
              { value: "system", label: "System", icon: <Monitor className="size-3.5" /> },
            ]}
          />
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Workspace"
        title="Dispatch defaults"
        description="Pre-fill values for new bookings. Saved instantly as you change them."
        columns={2}
      >
        <FormField
          label="Default depot"
          helper="Pre-selected as the origin on new bookings."
        >
          <div className="flex items-center gap-2">
            <Select
              value={defaultDepot}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setDefaultDepot(v);
                writePref(PREF_KEYS.defaultDepot, v);
                flash("depot");
              }}
            >
              {FUEL_DEPOTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <SavedTick show={savedFlash === "depot"} />
          </div>
        </FormField>
        <FormField
          label="Default currency"
          helper="Pre-selected on new bookings and rates."
        >
          <div className="flex items-center gap-2">
            <Select
              value={defaultCurrency}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setDefaultCurrency(v);
                writePref(PREF_KEYS.defaultCurrency, v);
                flash("currency");
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <SavedTick show={savedFlash === "currency"} />
          </div>
        </FormField>
      </FormSection>

      <FormSection
        eyebrow="Organisation"
        title="Operational thresholds"
        description="These are fixed constants today. They become editable, organisation-wide settings once the database is connected."
        columns={2}
      >
        <ReadOnlyRow
          label="Ullage alert threshold"
          value={`${ULLAGE_ALERT_THRESHOLD_PCT.toFixed(1)} %`}
          note="Variance above this triggers an investigation flag."
        />
        <ReadOnlyRow
          label="Expiry warning window"
          value="30 days"
          note="Compliance documents surface this far before expiry."
        />
      </FormSection>

      <div className="surface-card flex items-start gap-3 border-dashed p-4">
        <Database className="mt-0.5 size-4 shrink-0 text-brand-blue" />
        <p className="text-xs leading-relaxed text-fg-secondary">
          Preferences on this page live in your browser&apos;s local storage —
          they follow this device, not your account. When the Supabase database
          is connected, organisation settings (thresholds, company details,
          users &amp; roles) move to the database and sync everywhere.
        </p>
      </div>
    </div>
  );
}

function SavedTick({ show }: { show: boolean }) {
  return (
    <span
      aria-hidden={!show}
      className={
        "inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-status-success transition-opacity duration-300 " +
        (show ? "opacity-100" : "opacity-0")
      }
    >
      <Check className="size-3" />
      Saved
    </span>
  );
}

function ReadOnlyRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-bg-surface/50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </div>
      <div className="font-mono tnum text-base font-semibold text-fg-primary">{value}</div>
      <div className="text-[11px] text-fg-tertiary">{note}</div>
    </div>
  );
}
