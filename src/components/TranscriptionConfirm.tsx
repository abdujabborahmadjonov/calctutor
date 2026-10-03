"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import type { Transcription } from "@/lib/ai/schemas";
import { normalizeLatex } from "@/lib/latex/normalize";
import { cn } from "@/lib/utils";

import { Math } from "./Math";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

type TranscriptionConfirmProps = {
  transcription: Transcription;
  isMock: boolean;
  onSolve: (latex: string) => void;
  onRetake: () => void;
};

const confidenceLabel = {
  high: "Read clearly",
  medium: "Check this reading",
  low: "Unsure of this reading",
} as const;

export function TranscriptionConfirm({
  transcription,
  isMock,
  onSolve,
  onRetake,
}: TranscriptionConfirmProps) {
  const { problems, image_quality_note: qualityNote } = transcription;
  const [selected, setSelected] = useState(0);
  const [latex, setLatex] = useState(problems[0]?.latex ?? "");
  const problem = problems[selected];
  const preview = normalizeLatex(latex);

  const choose = (index: number) => {
    setSelected(index);
    setLatex(problems[index].latex);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">Is this your problem?</h3>
        {isMock && <Badge variant="outline">Mock transcription</Badge>}
      </div>

      {qualityNote && (
        <p className="flex gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {qualityNote}
        </p>
      )}

      {problems.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No calculus problem was found in this photo. Try a closer, sharper
          photo, or type the problem instead.
        </p>
      )}

      {problems.length > 1 && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm text-muted-foreground">
            This photo has {problems.length} problems. Pick one.
          </legend>
          {problems.map((item, index) => (
            <label
              key={`${item.label}-${index}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                index === selected && "border-primary bg-primary/5",
              )}
            >
              <input
                type="radio"
                name="transcribed-problem"
                className="mt-1"
                checked={index === selected}
                onChange={() => choose(index)}
              />
              <span className="min-w-0 flex-1 space-y-1">
                {item.label && (
                  <span className="block text-xs font-medium text-muted-foreground">
                    {item.label}
                  </span>
                )}
                <span className="block overflow-x-auto">
                  <Math latex={normalizeLatex(item.latex)} />
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {problem && (
        <div className="space-y-3">
          <Badge
            variant={problem.confidence === "high" ? "secondary" : "outline"}
            className={cn(
              problem.confidence !== "high" &&
                "border-amber-400 text-amber-800 dark:text-amber-200",
            )}
          >
            {confidenceLabel[problem.confidence]}
          </Badge>

          {problem.ambiguities.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
              {problem.ambiguities.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}

          <div className="overflow-x-auto rounded-xl border bg-muted/30 p-4">
            {preview ? (
              <Math latex={preview} display />
            ) : (
              <p className="text-sm text-muted-foreground">
                The problem is empty.
              </p>
            )}
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium">
              Edit the LaTeX if needed
            </span>
            <Textarea
              value={latex}
              maxLength={2_000}
              rows={3}
              className="font-mono text-base"
              onChange={(event) => setLatex(event.target.value)}
            />
          </label>

          {problem.student_work_latex && (
            <p className="text-xs text-muted-foreground">
              Your own working was also in the photo. It is left out of the
              problem.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {problem && (
          <Button
            type="button"
            size="lg"
            className="sm:flex-1"
            disabled={!latex.trim()}
            onClick={() => onSolve(latex.trim())}
          >
            Solve this
          </Button>
        )}
        <Button type="button" variant="outline" size="lg" onClick={onRetake}>
          Use a different photo
        </Button>
      </div>
    </div>
  );
}
