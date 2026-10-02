"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BookOpen } from "lucide-react";

import {
  type Solution,
  SolutionSchema,
  type SolutionRecord,
} from "@/lib/ai/schemas";
import { courseById, DEFAULT_COURSE_ID } from "@/lib/curriculum/alberta";
import { getDefaultCoveredUpTo } from "@/lib/curriculum/allowed";
import {
  getSetting,
  saveHistoryEntry,
  setSetting,
} from "@/lib/storage/history";

import { CourseSelector } from "./CourseSelector";
import { ProblemInput } from "./ProblemInput";
import { SolutionView } from "./SolutionView";
import { SolvingState } from "./SolvingState";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Switch } from "./ui/switch";

type ApiError = {
  error?: {
    code?: string;
    message?: string;
  };
};

export function SolverClient() {
  const [problem, setProblem] = useState("");
  const [courseId, setCourseId] = useState(DEFAULT_COURSE_ID);
  const [coveredUpTo, setCoveredUpTo] = useState(() => getDefaultCoveredUpTo());
  const [learnMode, setLearnMode] = useState(false);
  const [solution, setSolution] = useState<Solution>();
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [aiMode, setAiMode] = useState<"mock" | "anthropic">();

  useEffect(() => {
    const reopenedProblem = new URLSearchParams(window.location.search).get(
      "problem",
    );
    if (reopenedProblem) setProblem(reopenedProblem.slice(0, 2_000));

    void Promise.all([
      getSetting("courseId"),
      getSetting("coveredUpTo"),
      getSetting("learnMode"),
    ]).then(([storedCourse, storedCovered, storedLearnMode]) => {
      const nextCourseId =
        typeof storedCourse?.value === "string" &&
        courseById.has(storedCourse.value)
          ? storedCourse.value
          : DEFAULT_COURSE_ID;
      const nextCourse = courseById.get(nextCourseId);
      const nextCovered =
        typeof storedCovered?.value === "string" &&
        nextCourse?.topicOrder.includes(storedCovered.value)
          ? storedCovered.value
          : getDefaultCoveredUpTo(nextCourseId);

      setCourseId(nextCourseId);
      setCoveredUpTo(nextCovered);
      setLearnMode(storedLearnMode?.value === true);
    });
  }, []);

  const changeCourse = (nextCourseId: string) => {
    const nextCovered = getDefaultCoveredUpTo(nextCourseId);
    setCourseId(nextCourseId);
    setCoveredUpTo(nextCovered);
    void setSetting("courseId", nextCourseId);
    void setSetting("coveredUpTo", nextCovered);
  };

  const changeCoveredUpTo = (topicId: string) => {
    setCoveredUpTo(topicId);
    void setSetting("coveredUpTo", topicId);
  };

  const changeLearnMode = (checked: boolean) => {
    setLearnMode(checked);
    void setSetting("learnMode", checked);
  };

  const solveProblem = async () => {
    if (!problem.trim() || isSolving) return;

    setIsSolving(true);
    setError("");
    setStorageWarning("");
    setSolution(undefined);

    try {
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemLatex: problem,
          courseId,
          coveredUpTo,
          mode: "full",
        }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const apiError = data as ApiError;
        throw new Error(
          apiError.error?.message ?? "Something went wrong on our side.",
        );
      }

      const nextSolution = SolutionSchema.parse(data);
      const now = new Date().toISOString();
      const problemId = crypto.randomUUID();
      const mode =
        response.headers.get("X-CalcTutor-AI-Mode") === "mock"
          ? "mock"
          : "anthropic";
      const record: SolutionRecord = {
        problemId,
        solution: nextSolution,
        model: response.headers.get("X-CalcTutor-Model") ?? "unknown",
        usage: {
          inputTokens: Number(
            response.headers.get("X-CalcTutor-Input-Tokens") ?? 0,
          ),
          outputTokens: Number(
            response.headers.get("X-CalcTutor-Output-Tokens") ?? 0,
          ),
        },
        latencyMs: Number(response.headers.get("X-CalcTutor-Latency-Ms") ?? 0),
        createdAt: now,
      };

      setSolution(nextSolution);
      setAiMode(mode);

      if (nextSolution.status === "solved") {
        try {
          await saveHistoryEntry({
            id: problemId,
            problem: {
              id: problemId,
              source: "text",
              latex: problem,
              plain: problem,
              courseId,
              coveredUpTo,
              topicId: nextSolution.problem.topic_id,
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
    } catch (solveError) {
      console.error("[CalcTutor] Solve failed", solveError);
      setError(
        solveError instanceof Error
          ? solveError.message
          : "Something went wrong on our side.",
      );
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-7 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Work through calculus, one step at a time.
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Type a problem in plain English or LaTeX. CalcTutor will choose an
          allowed method for your course and explain every move.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="grid gap-5 py-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <CourseSelector
            courseId={courseId}
            coveredUpTo={coveredUpTo}
            onCourseChange={changeCourse}
            onCoveredUpToChange={changeCoveredUpTo}
          />
          <label className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <BookOpen className="size-4" />
            <span className="text-sm font-medium">Learn mode</span>
            <Switch checked={learnMode} onCheckedChange={changeLearnMode} />
          </label>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ProblemInput
          value={problem}
          onChange={setProblem}
          onSolve={solveProblem}
          isSolving={isSolving}
        />

        <section className="space-y-4" aria-label="Solution">
          {aiMode === "mock" && solution && (
            <Badge variant="outline">Mock fixture response</Badge>
          )}
          {error && (
            <Card className="border-destructive/40">
              <CardContent className="flex gap-3 py-5 text-sm">
                <AlertTriangle className="size-5 shrink-0 text-destructive" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}
          {storageWarning && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {storageWarning}
            </p>
          )}
          {isSolving && <SolvingState />}
          {solution && (
            <SolutionView solution={solution} learnMode={learnMode} />
          )}
          {!solution && !isSolving && !error && (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                Your strategy and step-by-step solution will appear here.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
