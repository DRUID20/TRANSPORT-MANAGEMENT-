"use client";

import { useState, useTransition } from "react";
import { FileText, Loader2, Save } from "lucide-react";
import { saveNarrative } from "@/server/actions/management-pack";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NarrativeEditor({
  packId,
  locked,
  narrative,
  highlights,
  risks,
}: {
  packId: string;
  locked: boolean;
  narrative: string;
  highlights: string;
  risks: string;
}) {
  const [n, setN] = useState(narrative);
  const [h, setH] = useState(highlights);
  const [r, setR] = useState(risks);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = n !== narrative || h !== highlights || r !== risks;

  function onSave() {
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await saveNarrative({
        id: packId,
        narrative: n,
        highlights: h,
        risks: r,
      });
      if (!result.ok) setError(result.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4 text-fg-tertiary" />
          Narrative
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] uppercase tracking-wider">Period commentary</Label>
            <Textarea
              value={n}
              onChange={(e) => setN(e.currentTarget.value)}
              disabled={locked}
              rows={6}
              placeholder="One or two paragraphs on the period."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] uppercase tracking-wider">Highlights</Label>
            <Textarea
              value={h}
              onChange={(e) => setH(e.currentTarget.value)}
              disabled={locked}
              rows={6}
              placeholder="Wins, new contracts, KPI achievements."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] uppercase tracking-wider">Risks & follow-ups</Label>
            <Textarea
              value={r}
              onChange={(e) => setR(e.currentTarget.value)}
              disabled={locked}
              rows={6}
              placeholder="Issues to escalate, dependencies, mitigation."
            />
          </div>
        </div>
        {!locked && (
          <div className="flex items-center justify-end gap-2">
            {saved && <span className="text-[11px] text-status-success">Saved.</span>}
            <Button size="sm" onClick={onSave} disabled={!dirty || pending}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save narrative
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
