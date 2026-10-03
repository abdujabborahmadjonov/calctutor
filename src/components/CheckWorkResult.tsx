"use client";

import { CheckCircle2, CircleAlert, CircleHelp, Lightbulb } from "lucide-react";

import type { CheckWorkState } from "./useCheckWork";
import { Markdown } from "./Markdown";
import { Math } from "./Math";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type CheckWorkResultProps = {
  checked: CheckWorkState;
  onShowSolution: () => void;
};

const titles = {
  correct: "Your work is correct",
  error_found: "Found the first mistake",
  incomplete: "Correct so far, but not finished",
  unreadable: "Your work could not be read",
} as const;

const icons = {
  correct: CheckCircle2,
  error_found: CircleAlert,
  incomplete: Lightbulb,
  unreadable: CircleHelp,
} as const;

export function CheckWorkResult({
  checked,
  onShowSolution,
}: CheckWorkResultProps) {
  const { result } = checked;
  const Icon = icons[result.verdict];
  const error = result.first_error;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="w-fit">Check my work</Badge>
          {checked.isMock && <Badge variant="outline">Mock work check</Badge>}
        </div>
        <CardTitle className="flex items-center gap-2">
          <Icon
            className={
              result.verdict === "correct"
                ? "size-5 text-emerald-600"
                : "size-5 text-amber-600"
            }
          />
          {titles[result.verdict]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {result.verdict === "error_found" && (
          <>
            <div className="space-y-1">
              <p className="font-medium">Your line</p>
              <div className="overflow-x-auto rounded-lg border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-700/60 dark:bg-amber-950/30">
                <Math latex={error.line_latex} display />
              </div>
            </div>
            <div>
              <p className="font-medium">What went wrong</p>
              <Markdown>{error.what_went_wrong}</Markdown>
            </div>
            <div>
              <p className="font-medium">Why</p>
              <Markdown>{error.why}</Markdown>
            </div>
            <div className="space-y-1">
              <p className="font-medium">The line done correctly</p>
              <div className="overflow-x-auto rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                <Math latex={error.corrected_line_latex} display />
              </div>
            </div>
          </>
        )}

        {result.next_step_hint && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="font-medium">
              {result.verdict === "unreadable"
                ? "What to fix"
                : "How to continue"}
            </p>
            <Markdown>{result.next_step_hint}</Markdown>
          </div>
        )}

        <Button type="button" variant="outline" onClick={onShowSolution}>
          Show the full solution
        </Button>
      </CardContent>
    </Card>
  );
}
