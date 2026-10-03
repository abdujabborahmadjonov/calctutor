"use client";

import { forwardRef } from "react";
import { AlertTriangle } from "lucide-react";

import type { Solution } from "@/lib/ai/schemas";
import type { PartialSolution } from "@/lib/client/partialSolution";

import { CheckWorkResult } from "./CheckWorkResult";
import { SolutionView } from "./SolutionView";
import { SolvingState } from "./SolvingState";
import { StreamingSolution } from "./StreamingSolution";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import type { CheckWorkState } from "./useCheckWork";

type ResultPanelProps = {
  view: "solve" | "check";
  learnMode: boolean;
  courseId: string;
  coveredUpTo: string;
  solve: {
    solution?: Solution;
    solvedLatex: string;
    partial?: PartialSolution;
    isSolving: boolean;
    error: string;
    storageWarning: string;
    aiMode?: "mock" | "anthropic";
  };
  checkWork: { checked?: CheckWorkState; isChecking: boolean; error: string };
  onRetry: () => void;
  onShowSolution: (problemLatex: string) => void;
};

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-wrap items-center gap-3 py-5 text-sm">
        <AlertTriangle className="size-5 shrink-0 text-destructive" />
        <span className="min-w-0 flex-1">{message}</span>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

export const ResultPanel = forwardRef<HTMLElement, ResultPanelProps>(
  function ResultPanel(
    {
      view,
      learnMode,
      courseId,
      coveredUpTo,
      solve,
      checkWork,
      onRetry,
      onShowSolution,
    },
    ref,
  ) {
    const showCheck = view === "check";
    const error = showCheck ? checkWork.error : solve.error;
    const busy = showCheck ? checkWork.isChecking : solve.isSolving;
    const hasResult = showCheck
      ? Boolean(checkWork.checked)
      : Boolean(solve.solution);

    return (
      <section
        ref={ref}
        className="scroll-mt-4 space-y-4"
        aria-label="Solution"
      >
        {!showCheck && solve.aiMode === "mock" && solve.solution && (
          <Badge variant="outline">Mock fixture response</Badge>
        )}
        {error && <ErrorCard message={error} onRetry={onRetry} />}
        {!showCheck && solve.storageWarning && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {solve.storageWarning}
          </p>
        )}

        {showCheck && checkWork.isChecking && <SolvingState />}
        {showCheck && checkWork.checked && (
          <CheckWorkResult
            checked={checkWork.checked}
            onShowSolution={() =>
              checkWork.checked &&
              onShowSolution(checkWork.checked.problemLatex)
            }
          />
        )}

        {!showCheck && solve.isSolving && (
          <StreamingSolution
            partial={solve.partial ?? { steps: [] }}
            learnMode={learnMode}
          />
        )}
        {!showCheck && solve.solution && (
          <SolutionView
            key={`${solve.solution.problem.restated_latex}-${learnMode}`}
            problemLatex={solve.solvedLatex}
            solution={solve.solution}
            learnMode={learnMode}
            courseId={courseId}
            coveredUpTo={coveredUpTo}
          />
        )}

        {!hasResult && !busy && !error && (
          <Card className="border-dashed">
            <CardContent className="py-14 text-center text-sm text-muted-foreground">
              Your strategy and step-by-step solution will appear here.
            </CardContent>
          </Card>
        )}
      </section>
    );
  },
);
