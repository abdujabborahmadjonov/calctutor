import { describe, expect, it } from "vitest";

import fixture from "@/fixtures/solutions/integration-by-parts.json";

import {
  SolutionSchema,
  SolveRequestSchema,
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
});
