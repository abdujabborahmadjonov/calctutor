"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BookOpen } from "lucide-react";

import type { Problem } from "@/lib/ai/schemas";
import { courseById, DEFAULT_COURSE_ID } from "@/lib/curriculum/alberta";
import { getDefaultCoveredUpTo } from "@/lib/curriculum/allowed";
import { getSetting, setSetting } from "@/lib/storage/history";

import { CourseSelector } from "./CourseSelector";
import { PhotoInput } from "./PhotoInput";
import { ProblemInput } from "./ProblemInput";
import { SolutionView } from "./SolutionView";
import { StreamingSolution } from "./StreamingSolution";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Switch } from "./ui/switch";
import { useSolver } from "./useSolver";

export function SolverClient() {
  const [problem, setProblem] = useState("");
  const [courseId, setCourseId] = useState(DEFAULT_COURSE_ID);
  const [coveredUpTo, setCoveredUpTo] = useState(() => getDefaultCoveredUpTo());
  const [learnMode, setLearnMode] = useState(false);
  const [lastSource, setLastSource] = useState<Problem["source"]>("text");
  const {
    solve,
    solution,
    solvedLatex,
    partial,
    isSolving,
    error,
    storageWarning,
    aiMode,
  } = useSolver();

  useEffect(() => {
    void Promise.all([
      getSetting("courseId"),
      getSetting("coveredUpTo"),
      getSetting("learnMode"),
    ]).then(([storedCourse, storedCovered, storedLearnMode]) => {
      const reopenedProblem = new URLSearchParams(window.location.search).get(
        "problem",
      );
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

      if (reopenedProblem) setProblem(reopenedProblem.slice(0, 2_000));
      setCourseId(nextCourseId);
      setCoveredUpTo(nextCovered);
      setLearnMode(storedLearnMode?.value === true);
    });
  }, []);

  const solutionSection = useRef<HTMLElement>(null);

  // On a phone the solution sits below both inputs, so bring it into view
  // when a solve starts; on the two-column desktop layout it is already
  // visible.
  useEffect(() => {
    if (!isSolving || window.matchMedia("(min-width: 1024px)").matches) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    solutionSection.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [isSolving]);

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

  const solveProblem = (latex: string, source: Problem["source"]) => {
    setLastSource(source);
    void solve({ latex, source, courseId, coveredUpTo });
  };

  const solveFromPhoto = (latex: string) => {
    setProblem(latex);
    solveProblem(latex, "image");
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-7 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Work through calculus, one step at a time.
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Type a problem in plain English or LaTeX, or photograph it. CalcTutor
          will choose an allowed method for your course and explain every move.
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
        <div className="space-y-6">
          <ProblemInput
            value={problem}
            onChange={setProblem}
            onSolve={() => solveProblem(problem, "text")}
            isSolving={isSolving}
          />
          <PhotoInput onSolve={solveFromPhoto} disabled={isSolving} />
        </div>

        <section
          ref={solutionSection}
          className="scroll-mt-4 space-y-4"
          aria-label="Solution"
        >
          {aiMode === "mock" && solution && (
            <Badge variant="outline">Mock fixture response</Badge>
          )}
          {error && (
            <Card className="border-destructive/40">
              <CardContent className="flex flex-wrap items-center gap-3 py-5 text-sm">
                <AlertTriangle className="size-5 shrink-0 text-destructive" />
                <span className="min-w-0 flex-1">{error}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => solveProblem(problem, lastSource)}
                >
                  Try again
                </Button>
              </CardContent>
            </Card>
          )}
          {storageWarning && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {storageWarning}
            </p>
          )}
          {isSolving && (
            <StreamingSolution
              partial={partial ?? { steps: [] }}
              learnMode={learnMode}
            />
          )}
          {solution && (
            <SolutionView
              key={`${solution.problem.restated_latex}-${learnMode}`}
              problemLatex={solvedLatex}
              solution={solution}
              learnMode={learnMode}
            />
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
