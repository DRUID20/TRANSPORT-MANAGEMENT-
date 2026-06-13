"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Database, Monitor, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField, FormSection } from "@/components/ui/form-section";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ULLAGE_ALERT_THRESHOLD_PCT } from "@/lib/types/trips";

/**
 * Workspace preference keys. Single source of truth — the booking form
 * reads PREF_KEYS.defaultLoadingPoint / defaultCurrency to pre-fill its fields.
 */
export const PREF_KEYS = {
  defaultLoadingPoint: "tx.prefs.defaultLoadingPoint",
  defaultCurrency: "tx.prefs.defaultCurrency",
} as const;

const CURRENCIES = ["USD", "KES", "UGX"] as const;

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
  const [defaultLoadingPoint, setDefaultLoadingPoint] = useState<string>("");
  const [defaultCurrency, setDefaultCurrency] = useState<string>("USD");
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  useEffect(() => {
    setDefaultLoadingPoint(readPref(PREF_KEYS.defaultLoadingPoint) ?? "");
    setDefaultCurrency(readPref(PREF_KEYS.defaultCurrency) ?? "USD");
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
          label="Default loading point"
          helper="Pre-filled as the origin on new bookings. Leave blank to type per booking."
        >
          <div className="flex items-center gap-2">
            <Input
              value={defaultLoadingPoint}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setDefaultLoadingPoint(v);
                writePref(PREF_KEYS.defaultLoadingPoint, v);
                flash("loadingPoint");
              }}
              placeholder="e.g. KPC Mombasa"
            />
            <SavedTick show={savedFlash === "loadingPoint"} />
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
