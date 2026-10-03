"use client";

import { useState } from "react";

import type { Solution } from "@/lib/ai/schemas";
import { topicById } from "@/lib/curriculum/alberta";

import { AnswerCheck } from "./AnswerCheck";
import { FinalAnswerCard } from "./FinalAnswerCard";
import { HintLadder } from "./HintLadder";
import { StepCard } from "./StepCard";
import { StrategyCard } from "./StrategyCard";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type SolutionViewProps = {
  problemLatex: string;
  solution: Solution;
  learnMode: boolean;
  courseId: string;
  coveredUpTo: string;
};

export function SolutionView({
  problemLatex,
  solution,
  learnMode,
  courseId,
  coveredUpTo,
}: SolutionViewProps) {
  const [solutionRevealed, setSolutionRevealed] = useState(!learnMode);
  const [visibleSteps, setVisibleSteps] = useState(1);

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

      {!solutionRevealed && (
        <div className="rounded-xl border p-4 print:hidden">
          <AnswerCheck
            expectedLatex={solution.final_answer.latex}
            label="Try it yourself, then check your final answer"
            allowReveal={false}
          />
        </div>
      )}

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
            <FinalAnswerCard
              solution={solution}
              practice={{
                problemLatex,
                topicId: topicById.has(solution.problem.topic_id)
                  ? solution.problem.topic_id
                  : coveredUpTo,
                courseId,
                coveredUpTo,
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
