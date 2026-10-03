"use client";

import { useState } from "react";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";

type CheckWorkInputProps = {
  hasProblem: boolean;
  disabled: boolean;
  onCheck: (studentWork: string) => void;
};

export function CheckWorkInput({
  hasProblem,
  disabled,
  onCheck,
}: CheckWorkInputProps) {
  const [work, setWork] = useState("");

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Check my work</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter the problem above, then paste your attempt one line per step.
          CalcTutor finds the first mistake and stops there. To check
          handwritten work, use the photo or Apple Pencil card instead and write
          your working under the problem.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={work}
          rows={5}
          maxLength={4_000}
          className="font-mono text-base"
          placeholder={
            "u = x, dv = e^x dx\n\\int x e^x dx = x e^x - \\int e^x dx"
          }
          aria-label="Your work"
          onChange={(event) => setWork(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!hasProblem || !work.trim() || disabled}
          onClick={() => onCheck(work.trim())}
        >
          Check my work
        </Button>
        {!hasProblem && work.trim() && (
          <p className="text-xs text-muted-foreground">
            Enter the problem in the box above first.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
