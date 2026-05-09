"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { advanceReview, updateReview } from "@/server/actions/appraisal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  RATING_LABELS,
  STANDARD_COMPETENCIES,
  type AppraisalReview,
  type AppraisalReviewStatus,
  type Rating,
} from "@/lib/types/appraisal";

export function ReviewForm({
  cycleId,
  employeeId,
  review,
}: {
  cycleId: string;
  employeeId: string;
  review: AppraisalReview;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = review.status === "hr_finalised";

  type EditableGoal = {
    id?: string;
    description: string;
    target?: string;
    selfRating?: number;
    managerRating?: number;
  };
  type EditableComp = {
    competency: string;
    selfRating?: Rating;
    managerRating?: Rating;
    comment?: string;
  };

  const [goals, setGoals] = useState<EditableGoal[]>(
    review.goals.length > 0 ? review.goals : [],
  );
  const [comps, setComps] = useState<EditableComp[]>(
    review.competencies.length > 0
      ? review.competencies
      : STANDARD_COMPETENCIES.map((c) => ({ competency: c })),
  );
  const [overall, setOverall] = useState<Rating | undefined>(review.overallRating);
  const [employeeComment, setEmployeeComment] = useState(review.employeeComment ?? "");
  const [managerComment, setManagerComment] = useState(review.managerComment ?? "");
  const [hrComment, setHrComment] = useState(review.hrComment ?? "");
  const [recommendation, setRecommendation] = useState(review.recommendation ?? "none");
  const [incrementPct, setIncrementPct] = useState(
    review.proposedIncrementPct ? String(review.proposedIncrementPct) : "",
  );

  function addGoal() {
    setGoals([...goals, { id: undefined, description: "", target: undefined, selfRating: undefined, managerRating: undefined }]);
  }
  function removeGoal(i: number) {
    setGoals(goals.filter((_, idx) => idx !== i));
  }
  function updateGoal(i: number, patch: Partial<typeof goals[number]>) {
    setGoals(goals.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  }

  function updateComp(i: number, patch: Partial<typeof comps[number]>) {
    setComps(comps.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function save() {
    setError(null);
    setLoading(true);
    const r = await updateReview({
      cycleId,
      employeeId,
      goals: goals.map((g) => ({
        ...g,
        selfRating: g.selfRating === undefined ? undefined : Number(g.selfRating),
        managerRating: g.managerRating === undefined ? undefined : Number(g.managerRating),
      })),
      competencies: comps,
      overallRating: overall,
      employeeComment: employeeComment || undefined,
      managerComment: managerComment || undefined,
      hrComment: hrComment || undefined,
      recommendation: recommendation as never,
      proposedIncrementPct: incrementPct ? Number(incrementPct) : undefined,
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.refresh();
  }

  async function advance(to: AppraisalReviewStatus) {
    if (!confirm(`Advance review to "${to.replaceAll("_", " ")}"?`)) return;
    setError(null);
    setLoading(true);
    // Save first, then advance
    await save();
    const r = await advanceReview(cycleId, employeeId, to);
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-4"
    >
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}
      {locked && (
        <div className="rounded-md border border-status-success/30 bg-status-success/10 p-3 text-sm text-status-success">
          HR finalised — review is locked.
        </div>
      )}

      {/* Goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Goals</CardTitle>
              <CardDescription>
                Set SMART goals at the start of the cycle. Both sides rate achievement (0-100).
              </CardDescription>
            </div>
            {!locked && (
              <Button type="button" size="sm" variant="outline" onClick={addGoal}>
                <Plus className="size-3.5" />
                Add goal
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="!p-0">
          {goals.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-fg-tertiary">No goals set yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Target</th>
                  <th className="px-3 py-2 text-right font-medium">Self %</th>
                  <th className="px-3 py-2 text-right font-medium">Manager %</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {goals.map((g, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <Input
                        value={g.description}
                        onChange={(e) => updateGoal(i, { description: e.currentTarget.value })}
                        disabled={locked}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={g.target ?? ""}
                        onChange={(e) => updateGoal(i, { target: e.currentTarget.value })}
                        disabled={locked}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={g.selfRating ?? ""}
                        onChange={(e) => updateGoal(i, { selfRating: e.currentTarget.value === "" ? undefined : Number(e.currentTarget.value) })}
                        disabled={locked}
                        className="text-right font-mono tnum"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={g.managerRating ?? ""}
                        onChange={(e) => updateGoal(i, { managerRating: e.currentTarget.value === "" ? undefined : Number(e.currentTarget.value) })}
                        disabled={locked}
                        className="text-right font-mono tnum"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {!locked && (
                        <button
                          type="button"
                          onClick={() => removeGoal(i)}
                          className="text-fg-tertiary transition-colors hover:text-status-danger"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Competencies */}
      <Card>
        <CardHeader>
          <CardTitle>Competencies</CardTitle>
          <CardDescription>
            Rate each competency 1-5 from both perspectives. 3 = meets expectations.
          </CardDescription>
        </CardHeader>
        <CardContent className="!p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                <th className="px-5 py-2 font-medium">Competency</th>
                <th className="px-5 py-2 text-right font-medium">Self</th>
                <th className="px-5 py-2 text-right font-medium">Manager</th>
                <th className="px-5 py-2 font-medium">Comment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {comps.map((c, i) => (
                <tr key={i}>
                  <td className="px-5 py-2 text-fg-primary">{c.competency}</td>
                  <td className="px-5 py-2">
                    <Select
                      value={c.selfRating ?? ""}
                      onChange={(e) =>
                        updateComp(i, {
                          selfRating: e.currentTarget.value === "" ? undefined : (Number(e.currentTarget.value) as Rating),
                        })
                      }
                      disabled={locked}
                    >
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n} · {RATING_LABELS[n as Rating]}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-5 py-2">
                    <Select
                      value={c.managerRating ?? ""}
                      onChange={(e) =>
                        updateComp(i, {
                          managerRating: e.currentTarget.value === "" ? undefined : (Number(e.currentTarget.value) as Rating),
                        })
                      }
                      disabled={locked}
                    >
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n} · {RATING_LABELS[n as Rating]}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-5 py-2">
                    <Input
                      value={c.comment ?? ""}
                      onChange={(e) => updateComp(i, { comment: e.currentTarget.value })}
                      disabled={locked}
                      placeholder="Optional comment"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Overall + Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle>Overall</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Overall rating</Label>
            <Select
              value={overall ?? ""}
              onChange={(e) =>
                setOverall(e.currentTarget.value === "" ? undefined : (Number(e.currentTarget.value) as Rating))
              }
              disabled={locked}
            >
              <option value="">— Not rated —</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n} · {RATING_LABELS[n as Rating]}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Recommendation</Label>
            <Select
              value={recommendation}
              onChange={(e) => setRecommendation(e.currentTarget.value as never)}
              disabled={locked}
            >
              <option value="none">None</option>
              <option value="promote">Promote</option>
              <option value="increment">Salary increment</option>
              <option value="training">Training plan</option>
              <option value="pip">Performance improvement plan (PIP)</option>
            </Select>
          </div>
          {recommendation === "increment" && (
            <div className="flex flex-col gap-1.5">
              <Label>Proposed increment %</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={incrementPct}
                onChange={(e) => setIncrementPct(e.currentTarget.value)}
                disabled={locked}
                className="text-right font-mono tnum"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Self-assessment</Label>
            <Textarea
              value={employeeComment}
              onChange={(e) => setEmployeeComment(e.currentTarget.value)}
              disabled={locked}
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Manager comment</Label>
            <Textarea
              value={managerComment}
              onChange={(e) => setManagerComment(e.currentTarget.value)}
              disabled={locked}
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>HR comment</Label>
            <Textarea
              value={hrComment}
              onChange={(e) => setHrComment(e.currentTarget.value)}
              disabled={locked}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!locked && (
          <Button type="submit" variant="outline" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </Button>
        )}
        {review.status === "draft" && (
          <Button type="button" onClick={() => advance("employee_submitted")} disabled={loading}>
            <ArrowRight className="size-4" /> Submit self-assessment
          </Button>
        )}
        {review.status === "employee_submitted" && (
          <Button type="button" onClick={() => advance("manager_reviewed")} disabled={loading}>
            <ArrowRight className="size-4" /> Manager review
          </Button>
        )}
        {review.status === "manager_reviewed" && (
          <Button type="button" variant="success" onClick={() => advance("hr_finalised")} disabled={loading}>
            <ArrowRight className="size-4" /> HR finalise
          </Button>
        )}
      </div>
    </form>
  );
}
