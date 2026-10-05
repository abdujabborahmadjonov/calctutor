"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";

import type { Solution } from "@/lib/ai/schemas";
import { topicById } from "@/lib/curriculum/alberta";
import { subjectForTopic } from "@/lib/subjects";

import { AnswerCheck } from "./AnswerCheck";
import { FinalAnswerCard } from "./FinalAnswerCard";
import { HintLadder } from "./HintLadder";
import { Math } from "./Math";
import { SolutionGraph } from "./SolutionGraph";
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
  onSolveAnotherWay?: (method: string) => void;
};

export function SolutionView({
  problemLatex,
  solution,
  learnMode,
  courseId,
  coveredUpTo,
  onSolveAnotherWay,
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
            CalcTutor solves math at every level, science, and other homework
            and general-knowledge questions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const allStepsVisible = visibleSteps >= solution.steps.length;

  const subject =
    subjectForTopic(solution.problem.topic_id) ??
    (topicById.has(solution.problem.topic_id)
      ? subjectForTopic("calculus")
      : undefined);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium">
          {subject && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-white">
              <span aria-hidden>{subject.glyph}</span>
              {subject.name}
            </span>
          )}
          {solution.problem.problem_type && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              {solution.problem.problem_type}
            </span>
          )}
          {onSolveAnotherWay && solution.strategy.method && (
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-foreground transition-colors hover:border-primary/40 hover:bg-accent print:hidden"
              onClick={() => onSolveAnotherWay(solution.strategy.method)}
            >
              <Shuffle className="size-3.5" />
              Solve another way
            </button>
          )}
        </div>
        <div className="overflow-x-auto text-lg">
          <Math latex={solution.problem.restated_latex} display />
        </div>
      </div>

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
                topicId: solution.problem.topic_id || coveredUpTo,
                courseId,
                coveredUpTo,
              }}
            />
          )}
          {allStepsVisible && <SolutionGraph solution={solution} />}
        </>
      )}
    </div>
  );
}
