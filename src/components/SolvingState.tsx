"use client";

import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { formatElapsed, useElapsedSeconds } from "./useElapsedSeconds";

const labels = [
  "Choosing a method",
  "Working through the steps",
  "Checking the answer",
];

// When a parent already tracks the solve's elapsed time it passes it in, so
// the counter does not restart as the view changes.
export function SolvingState({ elapsed }: { elapsed?: number }) {
  const ownSeconds = useElapsedSeconds();
  const seconds = elapsed ?? ownSeconds;

  return (
    <Card aria-live="polite">
      <CardContent className="space-y-5 py-8">
        <div>
          <p className="font-medium">{labels[Math.floor(seconds / 4) % 3]}</p>
          <p className="text-sm text-muted-foreground">
            {formatElapsed(seconds)}
          </p>
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-5 w-1/2" />
      </CardContent>
    </Card>
  );
}
