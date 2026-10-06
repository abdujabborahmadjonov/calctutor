// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { LOCAL_MODEL } from "@/lib/cas/model";

import { FIXTURE_MODEL, mockSolve } from "./mock";

describe("mockSolve", () => {
  it("serves the saved example for its own problem", () => {
    const result = mockSolve(String.raw`\int x e^{x}\,dx`);
    expect(result.model).toBe(FIXTURE_MODEL);
    expect(result.solution.steps[0]?.title).toMatch(/parts/i);
  });

  it("does not answer a different problem with a fixture that shares a phrase", () => {
    const result = mockSolve("limit of sin(3x)/x as x -> 0");
    expect(result.model).toBe(LOCAL_MODEL);
    expect(result.solution.final_answer.latex).toBe("3");
  });

  it("solves other math with the built-in engine", () => {
    const result = mockSolve("2x + 3 = 11");
    expect(result.model).toBe(LOCAL_MODEL);
    expect(result.solution.final_answer.latex).toBe("x = 4");
  });

  it("says plainly when a question needs the AI", () => {
    const result = mockSolve("Why is the sky blue?");
    expect(result.solution.status).toBe("needs_clarification");
    expect(result.solution.clarification_question).toContain("without AI");
  });
});
