"use client";

import type { PartialSolution } from "@/lib/client/partialSolution";

import { SolvingState } from "./SolvingState";
import { StepCard } from "./StepCard";
import { StrategyCard } from "./StrategyCard";
import { Card, CardContent } from "./ui/card";
import { formatElapsed, useElapsedSeconds } from "./useElapsedSeconds";

type StreamingSolutionProps = {
  partial: PartialSolution;
  learnMode: boolean;
};

function StreamingFooter({
  label,
  seconds,
}: {
  label: string;
  seconds: number;
}) {
  return (
    <Card className="border-dashed" aria-live="polite">
      <CardContent className="py-4 text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{formatElapsed(seconds)}</p>
      </CardContent>
    </Card>
  );
}

// Shows the strategy and each finished step while the solve is still
// streaming. The validated solution replaces this view when it arrives.
export function StreamingSolution({
  partial,
  learnMode,
}: StreamingSolutionProps) {
  const seconds = useElapsedSeconds();

  if (!partial.strategy || partial.status !== "solved") {
    return <SolvingState elapsed={seconds} />;
  }

  const nextStep = partial.steps.length + 1;

  return (
    <div className="space-y-5">
      <StrategyCard strategy={partial.strategy} />
      {!learnMode &&
        partial.steps.map((step, index) => (
          <StepCard key={`${step.title}-${index}`} step={step} index={index} />
        ))}
      <StreamingFooter
        seconds={seconds}
        label={
          learnMode
            ? "Preparing hints and the solution"
            : `Working through step ${nextStep}`
        }
      />
    </div>
  );
}
