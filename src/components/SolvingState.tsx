"use client";

import { useEffect, useState } from "react";

import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

const labels = [
  "Choosing a method",
  "Working through the steps",
  "Checking the answer",
];

export function SolvingState() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(
      () => setSeconds((value) => value + 1),
      1_000,
    );
    return () => window.clearInterval(interval);
  }, []);

  return (
    <Card aria-live="polite">
      <CardContent className="space-y-5 py-8">
        <div>
          <p className="font-medium">{labels[Math.floor(seconds / 4) % 3]}</p>
          <p className="text-sm text-muted-foreground">
            {seconds} {seconds === 1 ? "second" : "seconds"} elapsed
          </p>
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-5 w-1/2" />
      </CardContent>
    </Card>
  );
}
