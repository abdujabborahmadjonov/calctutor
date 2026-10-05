"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";

import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

type CheckWorkInputProps = {
  problem: string;
  onProblemChange: (value: string) => void;
  disabled: boolean;
  onCheck: (studentWork: string) => void;
};

export function CheckWorkInput({
  problem,
  onProblemChange,
  disabled,
  onCheck,
}: CheckWorkInputProps) {
  const [work, setWork] = useState("");
  const hasProblem = Boolean(problem.trim());

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Paste your attempt one line per step. CalcTutor finds the first mistake,
        explains it, and stops there without giving away the answer. For
        handwritten work, use Scan or Write and put your working under the
        problem.
      </p>
      <label className="grid gap-1.5 text-sm font-medium">
        Problem
        <Textarea
          value={problem}
          rows={2}
          maxLength={2_000}
          className="font-mono text-base"
          placeholder="\int x e^x dx"
          aria-label="Problem you worked on"
          onChange={(event) => onProblemChange(event.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Your work
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
      </label>
      <Button
        type="button"
        size="lg"
        className="h-11 w-full rounded-xl bg-brand text-base text-white shadow-lg shadow-primary/25"
        disabled={!hasProblem || !work.trim() || disabled}
        onClick={() => onCheck(work.trim())}
      >
        <ClipboardCheck />
        Check my work
      </Button>
      {!hasProblem && work.trim() && (
        <p className="text-xs text-muted-foreground">
          Enter the problem first.
        </p>
      )}
    </div>
  );
}
