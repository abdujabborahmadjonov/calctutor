type SmokeSolution = {
  status: string;
  clarification_question: string;
  problem: { topic_id: string };
  strategy: { method: string; alternatives: string };
  steps: Array<{
    rule: string;
    latex: string;
    common_mistake: string;
  }>;
  final_answer: { latex: string; plain: string };
  check: { method: string; result: string };
};

export {};

type GoldenCase = {
  name: string;
  problemLatex: string;
  courseId: string;
  coveredUpTo: string;
  validate: (solution: SmokeSolution) => boolean;
};

const includes = (value: string, needle: string) =>
  value.toLowerCase().includes(needle.toLowerCase());
const allText = (solution: SmokeSolution) =>
  JSON.stringify(solution).toLowerCase();

const cases: GoldenCase[] = [
  {
    name: "sine limit avoids early L'Hôpital",
    problemLatex: String.raw`\lim_{x \to 0} \frac{\sin x}{x}`,
    courseId: "ualberta-math-144",
    coveredUpTo: "limits",
    validate: (solution) =>
      solution.status === "solved" &&
      (includes(solution.strategy.method, "squeeze") ||
        includes(solution.strategy.method, "standard")) &&
      includes(solution.strategy.alternatives, "later in the course") &&
      !solution.steps.some((step) => includes(step.rule, "hôpital")),
  },
  {
    name: "product and chain rules are separate",
    problemLatex: String.raw`\frac{d}{dx}\left[x^{2}\sin(3x)\right]`,
    courseId: "ualberta-math-144",
    coveredUpTo: "transcendental-derivatives",
    validate: (solution) =>
      solution.steps.some((step) => includes(step.rule, "product rule")) &&
      solution.steps.some((step) => includes(step.rule, "chain rule")) &&
      solution.steps.some(
        (step) =>
          includes(step.common_mistake, "factor 3") ||
          includes(step.common_mistake, "factor 3"),
      ),
  },
  {
    name: "integration by parts includes constant and check",
    problemLatex: String.raw`\int x e^{x}\,dx`,
    courseId: "ualberta-math-146",
    coveredUpTo: "parametric-polar",
    validate: (solution) =>
      includes(solution.strategy.method, "parts") &&
      includes(solution.final_answer.latex, "+C") &&
      solution.check.result === "passed" &&
      includes(solution.check.method, "different"),
  },
  {
    name: "endpoint singularity is treated as improper",
    problemLatex: String.raw`\int_{0}^{1} \frac{dx}{\sqrt{1-x^{2}}}`,
    courseId: "ualberta-math-146",
    coveredUpTo: "improper-integrals",
    validate: (solution) =>
      includes(allText(solution), "improper") &&
      includes(allText(solution), "limit") &&
      includes(solution.final_answer.latex, "pi"),
  },
  {
    name: "alternating harmonic series is conditional",
    problemLatex: String.raw`\sum_{n=1}^{\infty} \frac{(-1)^{n}}{n}`,
    courseId: "ualberta-math-146",
    coveredUpTo: "series-tests",
    validate: (solution) =>
      includes(allText(solution), "alternating series") &&
      includes(allText(solution), "p-series") &&
      includes(allText(solution), "conditionally"),
  },
  {
    name: "ladder rate includes sign and direction",
    problemLatex:
      "Ladder: 5 m ladder, base slides away at 1 m/s, how fast is the top falling when the base is 3 m from the wall",
    courseId: "ualberta-math-144",
    coveredUpTo: "related-rates",
    validate: (solution) =>
      includes(allText(solution), "x^2+y^2") &&
      (includes(allText(solution), "-\\frac34") ||
        includes(allText(solution), "three quarters")) &&
      includes(allText(solution), "downward"),
  },
  {
    name: "missing bound asks for clarification",
    problemLatex: String.raw`\int x^{2} dx from 0 to (missing bound)`,
    courseId: "ualberta-math-144",
    coveredUpTo: "substitution",
    validate: (solution) =>
      solution.status === "needs_clarification" &&
      includes(solution.clarification_question, "upper bound"),
  },
  {
    name: "linear algebra is out of scope",
    problemLatex: "Eigenvalues of a 2 × 2 matrix",
    courseId: "ualberta-math-144",
    coveredUpTo: "substitution",
    validate: (solution) =>
      solution.status === "out_of_scope" &&
      includes(allText(solution), "linear algebra"),
  },
];

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:43127";
const expectedMode = process.env.SMOKE_EXPECT_MODE ?? "mock";
const transcribeImage =
  process.env.SMOKE_TRANSCRIBE_IMAGE ??
  new URL("./fixtures/handwritten-x2-lnx.jpg", import.meta.url).pathname;
let passed = 0;
let total = 0;
let inputTokens = 0;
let outputTokens = 0;

type SolveRead = {
  body: SmokeSolution & { error?: { message?: string } };
  streamed: boolean;
  firstStepBeforeDone: boolean;
  usage: { inputTokens: number; outputTokens: number };
};

// A step is complete once the text holds the start of the next step or the
// end of the steps array.
const hasCompleteStep = (text: string) => {
  const steps = text.indexOf('"steps"');
  if (steps === -1) return false;
  const rest = text.slice(steps);
  return /\}\s*,\s*\{/.test(rest) || /\}\s*\]/.test(rest);
};

async function readSolve(response: Response): Promise<SolveRead> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("ndjson")) {
    return {
      body: (await response.json()) as SolveRead["body"],
      streamed: false,
      firstStepBeforeDone: false,
      usage: {
        inputTokens: Number(
          response.headers.get("x-calctutor-input-tokens") ?? 0,
        ),
        outputTokens: Number(
          response.headers.get("x-calctutor-output-tokens") ?? 0,
        ),
      },
    };
  }

  let text = "";
  let firstStepBeforeDone = false;

  for (const line of (await response.text()).split("\n")) {
    if (!line.trim()) continue;
    const event = JSON.parse(line) as {
      type: string;
      text?: string;
      solution?: SmokeSolution;
      usage?: SolveRead["usage"];
      error?: { message?: string };
    };

    if (event.type === "delta") {
      text += event.text ?? "";
      firstStepBeforeDone ||= hasCompleteStep(text);
    } else if (event.type === "reset") {
      text = "";
    } else if (event.type === "done" && event.solution) {
      return {
        body: event.solution,
        streamed: true,
        firstStepBeforeDone,
        usage: event.usage ?? { inputTokens: 0, outputTokens: 0 },
      };
    } else if (event.type === "error") {
      return {
        body: { error: event.error } as SolveRead["body"],
        streamed: true,
        firstStepBeforeDone,
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    }
  }

  throw new Error("stream ended without a done event");
}

const report = (name: string, ok: boolean, detail: string) => {
  total += 1;
  if (ok) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    console.error(`FAIL ${name}: ${detail}`);
  }
};

for (const golden of cases) {
  try {
    const response = await fetch(`${baseUrl}/api/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemLatex: golden.problemLatex,
        courseId: golden.courseId,
        coveredUpTo: golden.coveredUpTo,
        mode: "full",
      }),
    });
    const mode = response.headers.get("x-calctutor-ai-mode");
    const read = await readSolve(response);
    inputTokens += read.usage.inputTokens;
    outputTokens += read.usage.outputTokens;

    // Streaming must render the first step before the solve finishes;
    // solutions with no steps (clarification, out of scope) are exempt.
    const streamOk =
      !read.streamed ||
      read.body.status !== "solved" ||
      read.firstStepBeforeDone;
    report(
      golden.name,
      response.ok &&
        mode === expectedMode &&
        streamOk &&
        golden.validate(read.body),
      `HTTP ${response.status}, mode=${mode}, streamed=${read.streamed}, firstStepBeforeDone=${read.firstStepBeforeDone}, body=${JSON.stringify(read.body)}`,
    );
  } catch (error) {
    report(golden.name, false, String(error));
  }
}

try {
  const { readFile } = await import("node:fs/promises");
  const image = await readFile(transcribeImage);
  const response = await fetch(`${baseUrl}/api/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mediaType: "image/jpeg",
      data: image.toString("base64"),
    }),
  });
  const mode = response.headers.get("x-calctutor-ai-mode");
  const body = (await response.json()) as {
    problems?: Array<{ latex: string; confidence: string }>;
  };
  const first = body.problems?.[0];
  const compact = first?.latex.replaceAll(/\s+/g, "") ?? "";
  // Mock mode serves a fixed fixture, so only its shape can be checked.
  const valid =
    expectedMode === "mock"
      ? Boolean(first)
      : /x\^\{?2\}?\\ln/.test(compact) &&
        compact.includes("\\int") &&
        first?.confidence === "high" &&
        !compact.includes("=");

  report(
    "handwritten photo transcribes exactly without solving",
    response.ok && mode === expectedMode && valid,
    `HTTP ${response.status}, mode=${mode}, body=${JSON.stringify(body)}`,
  );
} catch (error) {
  report(
    "handwritten photo transcribes exactly without solving",
    false,
    String(error),
  );
}

try {
  const response = await fetch(`${baseUrl}/api/check-work`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      problemLatex: String.raw`\int x e^{x}\,dx`,
      studentWork: [
        String.raw`u = x,\quad dv = e^{x}\,dx`,
        String.raw`du = dx,\quad v = e^{x}`,
        String.raw`\int x e^{x}\,dx = x e^{x} + \int e^{x}\,dx`,
        String.raw`= x e^{x} + e^{x} + C`,
      ].join("\n"),
      courseId: "ualberta-math-146",
      coveredUpTo: "parametric-polar",
    }),
  });
  const mode = response.headers.get("x-calctutor-ai-mode");
  const body = (await response.json()) as {
    verdict?: string;
    first_error?: { line_latex: string; corrected_line_latex: string };
    next_step_hint?: string;
  };
  const compact = (value = "") => value.replaceAll(/\s+|\\,/g, "");
  const errorLine = compact(body.first_error?.line_latex);
  const corrected = compact(body.first_error?.corrected_line_latex);
  const everything = compact(JSON.stringify(body));
  // The wrong line is the one with "+ \int"; the fix has "- \int"; and the
  // final answer x e^x - e^x (in any arrangement) never appears.
  const valid =
    body.verdict === "error_found" &&
    errorLine.includes("+\\int") &&
    corrected.includes("-\\int") &&
    !/e\^\{?x\}?\(x-1\)|xe\^\{?x\}?-e\^\{?x\}?\+C/.test(everything);

  report(
    "check my work finds the parts sign error and withholds the answer",
    response.ok && mode === expectedMode && valid,
    `HTTP ${response.status}, mode=${mode}, body=${JSON.stringify(body)}`,
  );
} catch (error) {
  report(
    "check my work finds the parts sign error and withholds the answer",
    false,
    String(error),
  );
}

const estimatedCostUsd = (inputTokens * 2 + outputTokens * 10) / 1_000_000;
console.log(
  `RESULT mode=${expectedMode} passed=${passed}/${total} solve_input_tokens=${inputTokens} solve_output_tokens=${outputTokens} estimated_solve_cost_usd=${estimatedCostUsd.toFixed(4)}`,
);

if (passed !== total) process.exitCode = 1;
