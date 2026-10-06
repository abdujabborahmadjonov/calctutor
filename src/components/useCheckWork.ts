"use client";

import { useState } from "react";

import { type CheckWork, CheckWorkSchema } from "@/lib/ai/schemas";

export type CheckWorkState = {
  problemLatex: string;
  studentWork: string;
  result: CheckWork;
  isMock: boolean;
};

type ApiError = { error?: { message?: string } };

export function useCheckWork() {
  const [checked, setChecked] = useState<CheckWorkState>();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");
  const [lastInput, setLastInput] = useState<{
    problemLatex: string;
    studentWork: string;
  }>();

  const check = async (input: {
    problemLatex: string;
    studentWork: string;
    courseId: string;
    coveredUpTo: string;
  }) => {
    setLastInput(input);
    setIsChecking(true);
    setError("");
    setChecked(undefined);

    try {
      const response = await fetch("/api/check-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiError;
        throw new Error(
          body.error?.message ?? "Something went wrong on our side.",
        );
      }
      setChecked({
        problemLatex: input.problemLatex,
        studentWork: input.studentWork,
        result: CheckWorkSchema.parse(await response.json()),
        isMock: response.headers.get("X-CalcTutor-AI-Mode") === "mock",
      });
    } catch (checkError) {
      console.error("[CalcTutor] Check work failed", checkError);
      setError(
        checkError instanceof Error
          ? checkError.message
          : "Something went wrong on our side.",
      );
    } finally {
      setIsChecking(false);
    }
  };

  return { check, checked, isChecking, error, lastInput };
}
