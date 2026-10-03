"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";

import type { Problem } from "@/lib/ai/schemas";
import { courseById, DEFAULT_COURSE_ID } from "@/lib/curriculum/alberta";
import { getDefaultCoveredUpTo } from "@/lib/curriculum/allowed";
import { getSetting, setSetting } from "@/lib/storage/history";

import { CourseSelector } from "./CourseSelector";
import { CheckWorkInput } from "./CheckWorkInput";
import { PhotoInput } from "./PhotoInput";
import { ProblemInput } from "./ProblemInput";
import { ResultPanel } from "./ResultPanel";
import { Card, CardContent } from "./ui/card";
import { Switch } from "./ui/switch";
import { useCheckWork } from "./useCheckWork";
import { useSolver } from "./useSolver";

export function SolverClient() {
  const [problem, setProblem] = useState("");
  const [courseId, setCourseId] = useState(DEFAULT_COURSE_ID);
  const [coveredUpTo, setCoveredUpTo] = useState(() => getDefaultCoveredUpTo());
  const [learnMode, setLearnMode] = useState(false);
  const [lastSource, setLastSource] = useState<Problem["source"]>("text");
  const [view, setView] = useState<"solve" | "check">("solve");
  const { solve, ...solveState } = useSolver();
  const checkWork = useCheckWork();
  const checkState = {
    checked: checkWork.checked,
    isChecking: checkWork.isChecking,
    error: checkWork.error,
  };
  const busy = solveState.isSolving || checkWork.isChecking;

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
    if (!busy || window.matchMedia("(min-width: 1024px)").matches) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    solutionSection.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [busy]);

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
    setView("solve");
    setProblem(latex);
    setLastSource(source);
    void solve({ latex, source, courseId, coveredUpTo });
  };

  const solveFromPhoto = (latex: string) => {
    setProblem(latex);
    solveProblem(latex, "image");
  };

  const checkProblemWork = (problemLatex: string, studentWork: string) => {
    setView("check");
    void checkWork.check({ problemLatex, studentWork, courseId, coveredUpTo });
  };

  const checkFromPhoto = (latex: string, studentWork: string) => {
    setProblem(latex);
    setLastSource("image");
    checkProblemWork(latex, studentWork);
  };

  const retry = () => {
    if (view === "check" && checkWork.lastInput) {
      checkProblemWork(
        checkWork.lastInput.problemLatex,
        checkWork.lastInput.studentWork,
      );
    } else {
      solveProblem(problem, lastSource);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-7 space-y-2 print:hidden">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Work through calculus, one step at a time.
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Type a problem in plain English or LaTeX, or photograph it. CalcTutor
          will choose an allowed method for your course and explain every move.
        </p>
      </div>

      <Card className="mb-6 print:hidden">
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] print:block">
        <div className="space-y-6 print:hidden">
          <ProblemInput
            value={problem}
            onChange={setProblem}
            onSolve={() => solveProblem(problem, "text")}
            isSolving={busy}
          />
          <PhotoInput
            onSolve={solveFromPhoto}
            onCheckWork={checkFromPhoto}
            disabled={busy}
          />
          <CheckWorkInput
            hasProblem={Boolean(problem.trim())}
            disabled={busy}
            onCheck={(studentWork) => checkProblemWork(problem, studentWork)}
          />
        </div>

        <ResultPanel
          ref={solutionSection}
          view={view}
          learnMode={learnMode}
          courseId={courseId}
          coveredUpTo={coveredUpTo}
          solve={solveState}
          checkWork={checkState}
          onRetry={retry}
          onShowSolution={(latex) => solveProblem(latex, lastSource)}
        />
      </div>
    </main>
  );
}
