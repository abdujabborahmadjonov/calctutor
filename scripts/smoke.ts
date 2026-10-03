// Golden-problem smoke test (SPEC section 7). Calls lib/ai directly, prints a
// table, and exits non-zero on any failure.
//
//   npm run smoke                        # uses MOCK_AI and keys from .env*
//   MOCK_AI=false npm run smoke          # real Claude API
//   SMOKE_EXPECT_MODE=anthropic npm run smoke   # fail if any call was mocked
//
// `npm run smoke` runs tsx with the react-server condition so lib/ai's
// "server-only" imports resolve outside Next.js.
import { readFile } from "node:fs/promises";
import path from "node:path";

import nextEnv from "@next/env";
import { z } from "zod";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);
nextEnv.loadEnvConfig(root);

// Imported after the env files load, because lib/env reads process.env once.
const { solveStream } = await import("@/lib/ai/solve-stream");
const { transcribe } = await import("@/lib/ai/transcribe");
const { checkWork } = await import("@/lib/ai/check-work");
const { readPartialSolution } = await import("@/lib/client/partialSolution");
const schemas = await import("@/lib/ai/schemas");
type Solution = z.infer<typeof schemas.SolutionSchema>;
type Transcription = z.infer<typeof schemas.TranscriptionSchema>;
type CheckWork = z.infer<typeof schemas.CheckWorkSchema>;

const ProblemSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string(),
    kind: z.literal("solve"),
    name: z.string(),
    problemLatex: z.string(),
    courseId: z.string(),
    coveredUpTo: z.string(),
  }),
  z.object({
    id: z.string(),
    kind: z.literal("transcribe"),
    name: z.string(),
    image: z.string(),
    mediaType: z.enum(schemas.IMAGE_MEDIA_TYPES),
  }),
  z.object({
    id: z.string(),
    kind: z.literal("check-work"),
    name: z.string(),
    problemLatex: z.string(),
    studentWork: z.string(),
    courseId: z.string(),
    coveredUpTo: z.string(),
  }),
]);

const problems = z
  .array(ProblemSchema)
  .parse(
    JSON.parse(
      await readFile(path.join(root, "src/fixtures/problems.json"), "utf8"),
    ),
  );

const includes = (value: string, needle: string) =>
  value.toLowerCase().includes(needle.toLowerCase());
const allText = (value: unknown) => JSON.stringify(value).toLowerCase();
const compact = (value = "") => value.replaceAll(/\s+|\\,/g, "");

const solveChecks: Record<string, (solution: Solution) => boolean> = {
  "sine-limit": (s) =>
    s.status === "solved" &&
    (includes(s.strategy.method, "squeeze") ||
      includes(s.strategy.method, "standard")) &&
    includes(s.strategy.alternatives, "later in the course") &&
    !s.steps.some((step) => includes(step.rule, "hôpital")),
  "product-chain": (s) =>
    s.steps.some((step) => includes(step.rule, "product rule")) &&
    s.steps.some((step) => includes(step.rule, "chain rule")) &&
    s.steps.some((step) => includes(step.common_mistake, "factor 3")),
  "integration-by-parts": (s) =>
    includes(s.strategy.method, "parts") &&
    includes(compact(s.final_answer.latex), "+C") &&
    s.check.result === "passed" &&
    includes(s.check.method, "different"),
  "improper-integral": (s) =>
    includes(allText(s), "improper") &&
    includes(allText(s), "limit") &&
    includes(s.final_answer.latex, "pi"),
  "alternating-series": (s) =>
    includes(allText(s), "alternating series") &&
    includes(allText(s), "p-series") &&
    includes(allText(s), "conditionally"),
  "related-rates": (s) =>
    includes(allText(s), "x^2+y^2") &&
    (includes(allText(s), "-\\frac34") ||
      includes(allText(s), "three quarters")) &&
    includes(allText(s), "downward"),
  "missing-bound": (s) =>
    s.status === "needs_clarification" &&
    includes(s.clarification_question, "upper bound"),
  "out-of-scope": (s) =>
    s.status === "out_of_scope" && includes(allText(s), "linear algebra"),
};

// The transcription must be the exact integral, read with high confidence,
// and must not solve anything.
const transcriptionIsExact = (t: Transcription) => {
  const first = t.problems[0];
  const latex = compact(first?.latex);
  return (
    t.problems.length === 1 &&
    /x\^\{?2\}?\\ln/.test(latex) &&
    latex.includes("\\int") &&
    first.confidence === "high" &&
    !latex.includes("=")
  );
};

// The wrong line has "+ \int", the fix has "- \int", and the final answer
// x e^x - e^x (in any arrangement) never appears.
const checkWorkIsRight = (c: CheckWork) => {
  const everything = compact(JSON.stringify(c));
  return (
    c.verdict === "error_found" &&
    compact(c.first_error.line_latex).includes("+\\int") &&
    compact(c.first_error.corrected_line_latex).includes("-\\int") &&
    !/e\^\{?x\}?\(x-1\)|xe\^\{?x\}?-e\^\{?x\}?\+C/.test(everything)
  );
};

type Row = {
  problem: string;
  mode: string;
  status: string;
  answer: string;
  check: string;
  ms: number;
  tokens: string;
  pass: boolean;
  detail?: string;
};

// $ per million tokens, input and output (SPEC section 5).
const PRICES: Array<[string, number, number]> = [
  ["claude-haiku", 1, 5],
  ["claude-sonnet", 2, 10],
  ["claude-opus", 4, 20],
];
let costUsd = 0;
const addCost = (model: string, input: number, output: number) => {
  const price = PRICES.find(([prefix]) => model.startsWith(prefix));
  if (price) costUsd += (input * price[1] + output * price[2]) / 1_000_000;
};

const expectedMode = process.env.SMOKE_EXPECT_MODE;
const rows: Row[] = [];

for (const problem of problems) {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);

  try {
    if (problem.kind === "solve") {
      let text = "";
      let firstStepBeforeDone = false;
      let done:
        | {
            solution: Solution;
            source: string;
            model: string;
            usage: { inputTokens: number; outputTokens: number };
          }
        | undefined;

      for await (const event of solveStream(
        {
          problemLatex: problem.problemLatex,
          courseId: problem.courseId,
          coveredUpTo: problem.coveredUpTo,
          mode: "full",
        },
        { mockChunkDelayMs: 0 },
      )) {
        if (event.type === "delta") {
          text += event.text;
          firstStepBeforeDone ||= readPartialSolution(text).steps.length > 0;
        } else if (event.type === "reset") {
          text = "";
        } else if (event.type === "done") {
          done = event;
        }
      }

      if (!done) throw new Error("the stream ended without a solution");
      const { solution, usage } = done;
      addCost(done.model, usage.inputTokens, usage.outputTokens);
      const streamed = solution.status !== "solved" || firstStepBeforeDone;

      rows.push({
        problem: problem.id,
        mode: done.source,
        status: solution.status,
        answer: solution.final_answer.plain || solution.clarification_question,
        check: solution.check.result,
        ms: elapsed(),
        tokens: `${usage.inputTokens}/${usage.outputTokens}`,
        pass: solveChecks[problem.id](solution) && streamed,
        detail: streamed
          ? undefined
          : "no complete step before the solve finished",
      });
    } else if (problem.kind === "transcribe") {
      const image = await readFile(path.join(root, problem.image));
      const result = await transcribe({
        mediaType: problem.mediaType,
        data: image.toString("base64"),
      });
      addCost(
        result.model,
        result.usage.inputTokens,
        result.usage.outputTokens,
      );

      rows.push({
        problem: problem.id,
        mode: result.source,
        status: `${result.transcription.problems.length} problem(s)`,
        answer: result.transcription.problems[0]?.latex ?? "",
        check: result.transcription.problems[0]?.confidence ?? "",
        ms: elapsed(),
        tokens: `${result.usage.inputTokens}/${result.usage.outputTokens}`,
        // Mock mode serves a fixed fixture, so only its shape can be checked.
        pass:
          result.source === "mock"
            ? result.transcription.problems.length > 0
            : transcriptionIsExact(result.transcription),
      });
    } else {
      const result = await checkWork({
        problemLatex: problem.problemLatex,
        studentWork: problem.studentWork,
        courseId: problem.courseId,
        coveredUpTo: problem.coveredUpTo,
      });
      addCost(
        result.model,
        result.usage.inputTokens,
        result.usage.outputTokens,
      );

      rows.push({
        problem: problem.id,
        mode: result.source,
        status: result.result.verdict,
        answer: result.result.first_error.corrected_line_latex,
        check: "",
        ms: elapsed(),
        tokens: `${result.usage.inputTokens}/${result.usage.outputTokens}`,
        pass: checkWorkIsRight(result.result),
      });
    }
  } catch (error) {
    rows.push({
      problem: problem.id,
      mode: "-",
      status: "error",
      answer: "",
      check: "",
      ms: elapsed(),
      tokens: "-",
      pass: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  const row = rows.at(-1);
  if (row && expectedMode && row.mode !== expectedMode) {
    row.pass = false;
    row.detail = `expected mode ${expectedMode}, got ${row.mode}`;
  }
}

const clip = (value: string, width: number) => {
  const flat = value.replaceAll(/\s+/g, " ");
  return flat.length > width ? `${flat.slice(0, width - 1)}…` : flat;
};
const header = [
  "problem",
  "mode",
  "status",
  "final answer",
  "check",
  "ms",
  "tokens in/out",
  "result",
];
const table = rows.map((row) => [
  row.problem,
  row.mode,
  row.status,
  clip(row.answer, 40),
  row.check,
  String(row.ms),
  row.tokens,
  row.pass ? "PASS" : "FAIL",
]);
const widths = header.map((title, column) =>
  Math.max(title.length, ...table.map((cells) => cells[column].length)),
);
const line = (cells: string[]) =>
  `| ${cells.map((cell, column) => cell.padEnd(widths[column])).join(" | ")} |`;

console.log(line(header));
console.log(`|${widths.map((width) => "-".repeat(width + 2)).join("|")}|`);
for (const cells of table) console.log(line(cells));

for (const row of rows.filter((item) => !item.pass && item.detail)) {
  console.log(`FAIL ${row.problem}: ${row.detail}`);
}

const passed = rows.filter((row) => row.pass).length;
console.log(
  `RESULT passed=${passed}/${rows.length} estimated_cost_usd=${costUsd.toFixed(4)}`,
);
if (passed !== rows.length) process.exitCode = 1;
