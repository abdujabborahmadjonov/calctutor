"use client";

import { useEffect, useRef, useState } from "react";

import type { Problem } from "@/lib/ai/schemas";
import { courseById } from "@/lib/curriculum/alberta";
import {
  getDefaultCoveredUpTo,
  isOpenCourse,
  OPEN_COURSE_ID,
} from "@/lib/curriculum/allowed";
import { getSetting, setSetting } from "@/lib/storage/history";
import { isSubjectId, type SubjectId } from "@/lib/subjects";

import { Composer } from "./Composer";
import { CourseSelector } from "./CourseSelector";
import { ExampleGallery } from "./ExampleGallery";
import { ResultPanel } from "./ResultPanel";
import { useCheckWork } from "./useCheckWork";
import { useSolver } from "./useSolver";

export function SolverClient() {
  const [problem, setProblem] = useState("");
  const [courseId, setCourseId] = useState(OPEN_COURSE_ID);
  const [coveredUpTo, setCoveredUpTo] = useState(() =>
    getDefaultCoveredUpTo(OPEN_COURSE_ID),
  );
  const [subject, setSubject] = useState<SubjectId>("auto");
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
      getSetting("subject"),
    ]).then(([storedCourse, storedCovered, storedLearnMode, storedSubject]) => {
      const reopenedProblem = new URLSearchParams(window.location.search).get(
        "problem",
      );
      const nextCourseId =
        typeof storedCourse?.value === "string" &&
        courseById.has(storedCourse.value)
          ? storedCourse.value
          : OPEN_COURSE_ID;
      const nextCourse = courseById.get(nextCourseId);
      const nextCovered =
        typeof storedCovered?.value === "string" &&
        !isOpenCourse(nextCourseId) &&
        nextCourse?.topicOrder.includes(storedCovered.value)
          ? storedCovered.value
          : getDefaultCoveredUpTo(nextCourseId);

      if (reopenedProblem) setProblem(reopenedProblem.slice(0, 2_000));
      setCourseId(nextCourseId);
      setCoveredUpTo(nextCovered);
      setLearnMode(storedLearnMode?.value === true);
      if (isSubjectId(storedSubject?.value)) setSubject(storedSubject.value);
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

  const changeSubject = (next: SubjectId) => {
    setSubject(next);
    void setSetting("subject", next);
  };

  const solveProblem = (
    latex: string,
    source: Problem["source"],
    avoidMethod = "",
  ) => {
    setView("solve");
    setProblem(latex);
    setLastSource(source);
    void solve({ latex, source, courseId, coveredUpTo, subject, avoidMethod });
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
    <main
      id="main"
      tabIndex={-1}
      className="relative w-full flex-1 outline-none"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-hero print:hidden"
      />
      <div className="relative mx-auto max-w-7xl px-4 pt-8 pb-12 sm:px-6 sm:pt-12">
        <div className="mb-8 max-w-3xl space-y-3 print:hidden">
          <p className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Every subject · Every step explained
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Snap, write or type <span className="text-brand">any problem.</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Step-by-step solutions for math from fractions to differential
            equations, plus physics, chemistry and more, with graphs and checked
            answers.
          </p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] print:block">
          <div className="space-y-6 lg:sticky lg:top-20 print:hidden">
            <Composer
              value={problem}
              onChange={setProblem}
              onSolve={() => solveProblem(problem, "text")}
              busy={busy}
              subject={subject}
              onSubjectChange={changeSubject}
              learnMode={learnMode}
              onLearnModeChange={changeLearnMode}
              settings={
                <CourseSelector
                  courseId={courseId}
                  coveredUpTo={coveredUpTo}
                  onCourseChange={changeCourse}
                  onCoveredUpToChange={changeCoveredUpTo}
                />
              }
              onPhotoSolve={solveFromPhoto}
              onPhotoCheckWork={checkFromPhoto}
              onCheckWork={(studentWork) =>
                checkProblemWork(problem, studentWork)
              }
            />
            {!problem.trim() && (
              <ExampleGallery
                onPick={(example, exampleSubject) => {
                  setProblem(example);
                  changeSubject(exampleSubject);
                }}
              />
            )}
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
            onSolveAnotherWay={(method) =>
              solveProblem(solveState.solvedLatex, lastSource, method)
            }
          />
        </div>
      </div>
    </main>
  );
}
