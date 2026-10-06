"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { type Similar, SimilarSchema } from "@/lib/ai/schemas";

import { AnswerCheck } from "./AnswerCheck";
import { Math } from "./Math";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export type PracticeContext = {
  problemLatex: string;
  topicId: string;
  courseId: string;
  coveredUpTo: string;
};

type ApiError = { error?: { message?: string } };

export function PracticeProblems({ problems }: Similar) {
  return (
    <ol className="space-y-4">
      {problems.map((problem, index) => (
        <li
          key={`${problem.latex}-${index}`}
          className="space-y-3 rounded-xl border p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Problem {index + 1}</span>
            <Badge variant="secondary">{problem.difficulty}</Badge>
          </div>
          <div className="overflow-x-auto">
            <Math latex={problem.latex} display />
          </div>
          <AnswerCheck expectedLatex={problem.answer_latex} />
        </li>
      ))}
    </ol>
  );
}

type PracticeSimilarProps = PracticeContext & {
  buttonLabel?: string;
};

export function PracticeSimilar({
  buttonLabel = "Practice similar",
  ...context
}: PracticeSimilarProps) {
  const [practice, setPractice] = useState<Similar>();
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiError;
        throw new Error(
          body.error?.message ?? "Something went wrong on our side.",
        );
      }
      setPractice(SimilarSchema.parse(await response.json()));
      setIsMock(response.headers.get("X-CalcTutor-AI-Mode") === "mock");
    } catch (loadError) {
      console.error("[CalcTutor] Practice problems failed", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong on our side.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!practice) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={load}
        >
          {loading ? "Writing practice problems…" : buttonLabel}
        </Button>
        {error && (
          <p className="flex gap-2 text-sm text-destructive" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-3" aria-label="Practice problems">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">Practice problems</h3>
        {isMock && <Badge variant="outline">Mock practice set</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        Work each one, then check your answer. Answers stay hidden until you
        ask.
      </p>
      <PracticeProblems problems={practice.problems} />
    </section>
  );
}
