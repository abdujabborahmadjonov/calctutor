"use client";

import { useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";

import type { Solution } from "@/lib/ai/schemas";

import { HintLadder } from "./HintLadder";
import { Math } from "./Math";
import { StepCard } from "./StepCard";
import { StrategyCard } from "./StrategyCard";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type SolutionViewProps = {
  problemLatex: string;
  solution: Solution;
  learnMode: boolean;
};

export function SolutionView({
  problemLatex,
  solution,
  learnMode,
}: SolutionViewProps) {
  const [solutionRevealed, setSolutionRevealed] = useState(!learnMode);
  const [visibleSteps, setVisibleSteps] = useState(1);
  const [copied, setCopied] = useState(false);

  if (solution.status === "needs_clarification") {
    return (
      <Card className="border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle>I need one detail</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{solution.clarification_question}</p>
        </CardContent>
      </Card>
    );
  }

  if (solution.status === "out_of_scope") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This is outside CalcTutor&apos;s scope</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>{solution.clarification_question}</p>
          <p className="text-sm text-muted-foreground">
            CalcTutor covers single-variable Calculus I and II.
          </p>
        </CardContent>
      </Card>
    );
  }

  const allStepsVisible = visibleSteps >= solution.steps.length;

  const copyFinalAnswer = async () => {
    await navigator.clipboard.writeText(solution.final_answer.latex);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <div className="space-y-5">
      <StrategyCard strategy={solution.strategy} />

      <HintLadder
        hints={solution.hints}
        onRevealSolution={
          learnMode && !solutionRevealed
            ? () => setSolutionRevealed(true)
            : undefined
        }
      />

      {solutionRevealed && (
        <>
          <div className="space-y-4">
            {solution.steps.slice(0, visibleSteps).map((step, index) => (
              <StepCard
                key={`${step.title}-${index}`}
                step={step}
                index={index}
                explain={{ problemLatex, solution }}
              />
            ))}
          </div>

          {!allStepsVisible && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => setVisibleSteps((count) => count + 1)}
              >
                Next step
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisibleSteps(solution.steps.length)}
              >
                Show all
              </Button>
            </div>
          )}

          {allStepsVisible && (
            <Card className="border-2 border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Final answer</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy final answer LaTeX"
                    onClick={copyFinalAnswer}
                  >
                    {copied ? <Check /> : <Copy />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto rounded-lg bg-muted/40 p-4">
                  <Math latex={solution.final_answer.latex} display />
                </div>
                <p>{solution.final_answer.plain}</p>
                {solution.final_answer.domain_notes && (
                  <p className="text-sm text-muted-foreground">
                    {solution.final_answer.domain_notes}
                  </p>
                )}
                <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Self-checked by {solution.check.method}.{" "}
                    {solution.check.detail}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
