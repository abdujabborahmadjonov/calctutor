import { describe, expect, it } from "vitest";

import fixture from "@/fixtures/solutions/integration-by-parts.json";
import transcription from "@/fixtures/transcriptions/problem-set-photo.json";

import {
  ExplainStepRequestSchema,
  SolutionSchema,
  SolveRequestSchema,
  TranscribeRequestSchema,
  TranscriptionSchema,
  validateSolution,
} from "./schemas";

describe("AI schemas", () => {
  it("accepts a complete golden solution", () => {
    const result = validateSolution(fixture);

    expect(result.status).toBe("solved");
    expect(result.hints).toHaveLength(3);
    expect(result.check.result).toBe("passed");
  });

  it("rejects missing required structured-output fields", () => {
    const incomplete = {
      ...fixture,
      final_answer: { latex: fixture.final_answer.latex },
    };

    expect(() => SolutionSchema.parse(incomplete)).toThrow();
  });

  it("enforces three hints after schema parsing", () => {
    expect(() =>
      validateSolution({ ...fixture, hints: fixture.hints.slice(0, 2) }),
    ).toThrow("exactly three hints");
  });

  it("bounds solve requests to 2,000 characters", () => {
    const result = SolveRequestSchema.safeParse({
      problemLatex: "x".repeat(2_001),
      courseId: "ualberta-math-144",
      coveredUpTo: "limits",
      mode: "full",
    });

    expect(result.success).toBe(false);
  });

  it("accepts the transcription fixture and rejects unknown confidence", () => {
    expect(TranscriptionSchema.parse(transcription).problems).toHaveLength(2);
    expect(() =>
      TranscriptionSchema.parse({
        ...transcription,
        problems: [{ ...transcription.problems[0], confidence: "certain" }],
      }),
    ).toThrow();
  });

  it("bounds transcribe requests to supported types and base64 data", () => {
    expect(
      TranscribeRequestSchema.safeParse({
        mediaType: "image/heic",
        data: "AAAA",
      }).success,
    ).toBe(false);
    expect(
      TranscribeRequestSchema.safeParse({
        mediaType: "image/jpeg",
        data: "not base64!",
      }).success,
    ).toBe(false);
    expect(
      TranscribeRequestSchema.safeParse({
        mediaType: "image/jpeg",
        data: "/9j/4AAQ",
      }).success,
    ).toBe(true);
  });

  it("requires a whole solution and a step index for explain-step", () => {
    expect(
      ExplainStepRequestSchema.safeParse({
        problemLatex: "x",
        solution: fixture,
        stepIndex: 0,
      }).success,
    ).toBe(true);
    expect(
      ExplainStepRequestSchema.safeParse({
        problemLatex: "x",
        solution: fixture,
        stepIndex: -1,
      }).success,
    ).toBe(false);
  });
});
