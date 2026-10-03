"use client";

import { useState } from "react";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type HintLadderProps = {
  hints: string[];
  onRevealSolution?: () => void;
};

export function HintLadder({ hints, onRevealSolution }: HintLadderProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  if (hints.length === 0) return null;

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle>Hint ladder</CardTitle>
        <p className="text-sm text-muted-foreground">
          Reveal only as much help as you need.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-3">
          {hints.slice(0, visibleCount).map((hint, index) => (
            <li key={hint} className="rounded-lg bg-muted/50 p-3 text-sm">
              <strong className="mr-2">Hint {index + 1}</strong>
              {hint}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          {visibleCount < hints.length && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setVisibleCount((count) => count + 1)}
            >
              Reveal hint {visibleCount + 1}
            </Button>
          )}
          {onRevealSolution && (
            <Button type="button" onClick={onRevealSolution}>
              Reveal solution
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
