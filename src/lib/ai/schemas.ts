import { z } from "zod";

export const StepSchema = z.object({
  title: z.string(),
  rule: z.string(),
  latex: z.string(),
  explanation: z.string(),
  common_mistake: z.string(),
});

export const SolutionSchema = z.object({
  status: z.enum(["solved", "needs_clarification", "out_of_scope"]),
  clarification_question: z.string(),
  problem: z.object({
    restated_latex: z.string(),
    topic_id: z.string(),
    problem_type: z.string(),
  }),
  strategy: z.object({
    method: z.string(),
    why_this_method: z.string(),
    alternatives: z.string(),
  }),
  steps: z.array(StepSchema),
  final_answer: z.object({
    latex: z.string(),
    plain: z.string(),
    domain_notes: z.string(),
  }),
  check: z.object({
    method: z.string(),
    result: z.enum(["passed", "failed", "not_applicable"]),
    detail: z.string(),
  }),
  hints: z.array(z.string()),
});

export const SolveRequestSchema = z.object({
  problemLatex: z
    .string()
    .trim()
    .min(1, "Enter a calculus problem")
    .max(2_000, "Problem must be 2,000 characters or fewer"),
  courseId: z.string(),
  coveredUpTo: z.string(),
  mode: z.enum(["full", "check"]),
});

export const ProblemSchema = z.object({
  id: z.string(),
  source: z.enum(["text", "image"]),
  latex: z.string(),
  plain: z.string(),
  courseId: z.string(),
  coveredUpTo: z.string(),
  topicId: z.string().optional(),
  createdAt: z.string(),
});

export const UsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});

export const SolutionRecordSchema = z.object({
  problemId: z.string(),
  solution: SolutionSchema,
  model: z.string(),
  usage: UsageSchema,
  latencyMs: z.number().nonnegative(),
  createdAt: z.string(),
});

export type Step = z.infer<typeof StepSchema>;
export type Solution = z.infer<typeof SolutionSchema>;
export type SolveRequest = z.infer<typeof SolveRequestSchema>;
export type Problem = z.infer<typeof ProblemSchema>;
export type SolutionRecord = z.infer<typeof SolutionRecordSchema>;

export function validateSolution(value: unknown): Solution {
  const solution = SolutionSchema.parse(value);

  if (solution.status === "solved" && solution.hints.length !== 3) {
    throw new Error("A solved response must contain exactly three hints");
  }

  if (solution.status === "solved" && solution.check.result !== "passed") {
    throw new Error("A solved response must include a passing self-check");
  }

  return solution;
}
