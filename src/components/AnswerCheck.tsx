"use client";

import { useId, useRef, useState } from "react";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";

import { normalizeLatex } from "@/lib/latex/normalize";
import { type Grade, gradeAnswer } from "@/lib/verify/grade";

import { Math } from "./Math";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type AnswerCheckProps = {
  expectedLatex: string;
  label?: string;
  allowReveal?: boolean;
};

function message(grade: Grade, allowReveal: boolean) {
  const compare = allowReveal ? "show the answer" : "reveal the solution";
  if (grade === "correct")
    return "Correct. SymPy confirmed your answer matches.";
  if (grade === "no_match") {
    return `SymPy could not match this to the expected answer. Check your work, or ${compare} to compare.`;
  }
  return `This answer could not be checked automatically. ${compare[0].toUpperCase()}${compare.slice(1)} and compare it yourself.`;
}

const icons = {
  correct: CheckCircle2,
  no_match: XCircle,
  ungradable: CircleHelp,
} as const;

export function AnswerCheck({
  expectedLatex,
  label = "Your answer",
  allowReveal = true,
}: AnswerCheckProps) {
  const inputId = useId();
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<Grade>();
  const [checking, setChecking] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const preview = normalizeLatex(answer);

  // The first check can take seconds while SymPy loads. A result is applied
  // only if it belongs to the latest check, so an edited answer never shows
  // the grade of the text it replaced.
  const latestCheck = useRef(0);

  const check = async () => {
    if (!answer.trim()) return;
    const id = ++latestCheck.current;
    setChecking(true);
    setGrade(undefined);
    try {
      const result = await gradeAnswer(expectedLatex, answer);
      if (id === latestCheck.current) setGrade(result);
    } catch (error) {
      console.warn("[CalcTutor] Answer check could not run", error);
      if (id === latestCheck.current) setGrade("ungradable");
    } finally {
      if (id === latestCheck.current) setChecking(false);
    }
  };

  const Icon = grade ? icons[grade] : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          value={answer}
          maxLength={500}
          className="font-mono"
          placeholder="e.g. x^2/2 + C"
          onChange={(event) => {
            setAnswer(event.target.value);
            setGrade(undefined);
            // Editing the answer invalidates any check still running.
            latestCheck.current += 1;
            setChecking(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void check();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!answer.trim() || checking}
          onClick={check}
        >
          {checking ? "Checking…" : "Check"}
        </Button>
      </div>
      {preview && (
        <div className="overflow-x-auto text-sm">
          <Math latex={preview} />
        </div>
      )}
      {checking && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          The first check loads SymPy and can take a few seconds.
        </p>
      )}
      {grade && Icon && (
        <p
          className={
            grade === "correct"
              ? "flex gap-2 text-sm text-emerald-700 dark:text-emerald-300"
              : "flex gap-2 text-sm text-muted-foreground"
          }
          aria-live="polite"
        >
          <Icon className="mt-0.5 size-4 shrink-0" />
          {message(grade, allowReveal)}
        </p>
      )}
      {allowReveal && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0"
          aria-expanded={showAnswer}
          onClick={() => setShowAnswer((value) => !value)}
        >
          {showAnswer ? "Hide the answer" : "Show the answer"}
        </Button>
      )}
      {allowReveal && showAnswer && (
        <div className="overflow-x-auto rounded-lg bg-muted/40 p-3">
          <Math latex={expectedLatex} display />
        </div>
      )}
    </div>
  );
}
