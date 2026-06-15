"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackageX } from "lucide-react";
import { disposeAsset } from "@/server/actions/assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const PROCEEDS_ACCOUNTS = [
  { code: "121100", label: "Bank — KES" },
  { code: "120100", label: "Cash in Hand" },
  { code: "129100", label: "M-Pesa" },
  { code: "129200", label: "Mobile Money (UGX)" },
];

export function DisposeAsset({ assetId, nbv }: { assetId: string; nbv: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [disposalDate, setDisposalDate] = useState(today);
  const [writeOff, setWriteOff] = useState(false);
  const [proceeds, setProceeds] = useState("");
  const [account, setAccount] = useState("121100");

  const gainLoss = writeOff ? -nbv : (Number(proceeds) || 0) - nbv;

  function submit() {
    setError(null);
    start(async () => {
      const r = await disposeAsset({
        assetId,
        disposalDate,
        proceeds: writeOff ? 0 : Number(proceeds) || 0,
        proceedsAccountCode: writeOff ? undefined : account,
        writeOff,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PackageX className="size-3.5" />
        Dispose / write off
      </Button>
    );
  }

  return (
    <div className="surface-card flex flex-col gap-4 border-2 border-border-strong p-4">
      <h3 className="text-[15px] font-extrabold text-fg-primary">Dispose or write off</h3>
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-2.5 text-[13px] font-medium text-status-danger">
          {error}
        </div>
      )}
      <label className="flex items-center gap-2 text-[13px] font-medium text-fg-secondary">
        <input type="checkbox" checked={writeOff} onChange={(e) => setWriteOff(e.currentTarget.checked)} />
        Write off (no proceeds — scrapped / lost)
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Disposal date</Label>
          <Input type="date" value={disposalDate} onChange={(e) => setDisposalDate(e.currentTarget.value)} className="font-mono tnum" />
        </div>
        {!writeOff && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Proceeds (KES)</Label>
              <Input type="number" min={0} step="0.01" value={proceeds} onChange={(e) => setProceeds(e.currentTarget.value)} className="font-mono tnum" placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Proceeds received in</Label>
              <Select value={account} onChange={(e) => setAccount(e.currentTarget.value)}>
                {PROCEEDS_ACCOUNTS.map((a) => (
                  <option key={a.code} value={a.code}>{a.label}</option>
                ))}
              </Select>
            </div>
          </>
        )}
      </div>
      <p className="text-[13px] font-medium text-fg-secondary">
        Net book value <span className="font-mono font-semibold text-fg-primary">KSh {Math.round(nbv).toLocaleString()}</span>
        {" · "}
        {gainLoss >= 0 ? "Gain" : "Loss"} on disposal{" "}
        <span className={gainLoss >= 0 ? "font-mono font-semibold text-status-success" : "font-mono font-semibold text-status-danger"}>
          KSh {Math.round(Math.abs(gainLoss)).toLocaleString()}
        </span>
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="danger" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <PackageX className="size-4" />}
          {writeOff ? "Write off" : "Record disposal"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
