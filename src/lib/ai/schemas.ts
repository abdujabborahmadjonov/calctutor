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

export const TranscriptionSchema = z.object({
  problems: z.array(
    z.object({
      label: z.string(),
      latex: z.string(),
      plain: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
      ambiguities: z.array(z.string()),
      student_work_latex: z.string(),
    }),
  ),
  image_quality_note: z.string(),
});

export const IMAGE_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// 10 MB of image bytes, expressed as base64 characters.
export const MAX_IMAGE_BASE64_LENGTH = Math.ceil((10 * 1024 * 1024 * 4) / 3);

export const TranscribeRequestSchema = z.object({
  mediaType: z.enum(IMAGE_MEDIA_TYPES),
  data: z
    .string()
    .min(1, "Attach a photo of the problem")
    .max(MAX_IMAGE_BASE64_LENGTH, "Images must be 10 MB or smaller")
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "Send the image as base64 data"),
});

export const ExplainStepRequestSchema = z.object({
  problemLatex: z
    .string()
    .trim()
    .min(1, "Enter a calculus problem")
    .max(2_000, "Problem must be 2,000 characters or fewer"),
  solution: SolutionSchema,
  stepIndex: z.number().int().nonnegative(),
});

export const SimilarSchema = z.object({
  problems: z.array(
    z.object({
      latex: z.string(),
      plain: z.string(),
      difficulty: z.enum(["easier", "same", "harder"]),
      answer_latex: z.string(),
    }),
  ),
});

// problemLatex is "" when practice comes from the topic browser instead of a
// solved problem.
export const SimilarRequestSchema = z.object({
  problemLatex: z
    .string()
    .trim()
    .max(2_000, "Problem must be 2,000 characters or fewer"),
  topicId: z.string().min(1),
  courseId: z.string(),
  coveredUpTo: z.string(),
});

export const CheckWorkSchema = z.object({
  verdict: z.enum(["correct", "error_found", "incomplete", "unreadable"]),
  first_error: z.object({
    line_latex: z.string(),
    what_went_wrong: z.string(),
    why: z.string(),
    corrected_line_latex: z.string(),
  }),
  next_step_hint: z.string(),
});

export const CheckWorkRequestSchema = z.object({
  problemLatex: z
    .string()
    .trim()
    .min(1, "Enter the problem you worked on")
    .max(2_000, "Problem must be 2,000 characters or fewer"),
  studentWork: z
    .string()
    .trim()
    .min(1, "Enter your work")
    .max(4_000, "Your work must be 4,000 characters or fewer"),
  courseId: z.string(),
  coveredUpTo: z.string(),
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
export type Transcription = z.infer<typeof TranscriptionSchema>;
export type TranscribedProblem = Transcription["problems"][number];
export type TranscribeRequest = z.infer<typeof TranscribeRequestSchema>;
export type ImageMediaType = TranscribeRequest["mediaType"];
export type ExplainStepRequest = z.infer<typeof ExplainStepRequestSchema>;
export type Similar = z.infer<typeof SimilarSchema>;
export type SimilarProblem = Similar["problems"][number];
export type SimilarRequest = z.infer<typeof SimilarRequestSchema>;
export type CheckWork = z.infer<typeof CheckWorkSchema>;
export type CheckWorkRequest = z.infer<typeof CheckWorkRequestSchema>;
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
