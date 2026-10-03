import { describe, expect, it } from "vitest";

import fixture from "@/fixtures/solutions/integration-by-parts.json";
import { SolutionSchema } from "@/lib/ai/schemas";

import { markdownFileName, solutionToMarkdown } from "./markdown";

const solution = SolutionSchema.parse(fixture);

describe("solutionToMarkdown", () => {
  it("includes the problem, every step, and the final answer as display math", () => {
    const markdown = solutionToMarkdown(String.raw`\int x e^x\,dx`, solution);

    expect(markdown).toContain("## Problem\n\n$$\n\\int xe^x\\,dx\n$$");
    for (const [index, step] of solution.steps.entries()) {
      expect(markdown).toContain(`### ${index + 1}. ${step.title}`);
      expect(markdown).toContain(step.latex);
    }
    expect(markdown).toContain("> **Common mistake:**");
    expect(markdown).toContain(`$$\n${solution.final_answer.latex}\n$$`);
  });

  it("names the file after the topic", () => {
    expect(markdownFileName(solution)).toBe(
      "calctutor-integration-by-parts.md",
    );
  });
});
