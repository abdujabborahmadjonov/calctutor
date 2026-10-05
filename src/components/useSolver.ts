"use client";

import { useRef, useState } from "react";

import type { Problem, Solution, SolutionRecord } from "@/lib/ai/schemas";
import type { SubjectId } from "@/lib/subjects";
import {
  type PartialSolution,
  readPartialSolution,
} from "@/lib/client/partialSolution";
import { requestSolve } from "@/lib/client/requestSolve";
import { saveHistoryEntry } from "@/lib/storage/history";

type SolveInput = {
  latex: string;
  source: Problem["source"];
  courseId: string;
  coveredUpTo: string;
  subject: SubjectId;
  avoidMethod?: string;
};

export function useSolver() {
  const [solution, setSolution] = useState<Solution>();
  const [solvedLatex, setSolvedLatex] = useState("");
  const [partial, setPartial] = useState<PartialSolution>();
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [aiMode, setAiMode] = useState<"mock" | "anthropic">();
  const solving = useRef(false);

  const solve = async ({
    latex,
    source,
    courseId,
    coveredUpTo,
    subject,
    avoidMethod = "",
  }: SolveInput) => {
    if (!latex.trim() || solving.current) return;

    solving.current = true;
    setIsSolving(true);
    setError("");
    setStorageWarning("");
    setSolution(undefined);
    setPartial(undefined);

    try {
      const outcome = await requestSolve(
        {
          problemLatex: latex,
          courseId,
          coveredUpTo,
          mode: "full",
          subject,
          avoidMethod,
        },
        (text) => setPartial(readPartialSolution(text)),
      );
      const now = new Date().toISOString();
      const problemId = crypto.randomUUID();
      const record: SolutionRecord = {
        problemId,
        solution: outcome.solution,
        model: outcome.model,
        usage: outcome.usage,
        latencyMs: outcome.latencyMs,
        createdAt: now,
      };

      // Save before showing the solution, so a solution on screen is always
      // already in history (navigating away right after cannot lose it).
      if (outcome.solution.status === "solved") {
        try {
          await saveHistoryEntry({
            id: problemId,
            problem: {
              id: problemId,
              source,
              latex,
              plain: latex,
              courseId,
              coveredUpTo,
              topicId: outcome.solution.problem.topic_id,
              subject,
              createdAt: now,
            },
            record,
          });
        } catch (historyError) {
          console.error(
            "[CalcTutor] Could not save local history",
            historyError,
          );
          setStorageWarning(
            "The solution worked, but this browser could not save it to history.",
          );
        }
      }

      setSolution(outcome.solution);
      setSolvedLatex(latex);
      setAiMode(outcome.source);
    } catch (solveError) {
      console.error("[CalcTutor] Solve failed", solveError);
      setError(
        solveError instanceof Error
          ? solveError.message
          : "Something went wrong on our side.",
      );
    } finally {
      solving.current = false;
      setIsSolving(false);
      setPartial(undefined);
    }
  };

  return {
    solve,
    solution,
    solvedLatex,
    partial,
    isSolving,
    error,
    storageWarning,
    aiMode,
  };
}
