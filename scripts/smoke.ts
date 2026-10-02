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
let passed = 0;
let inputTokens = 0;
let outputTokens = 0;

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
    inputTokens += Number(
      response.headers.get("x-calctutor-input-tokens") ?? 0,
    );
    outputTokens += Number(
      response.headers.get("x-calctutor-output-tokens") ?? 0,
    );
    const body = (await response.json()) as SmokeSolution & {
      error?: { message?: string };
    };
    const valid = response.ok && mode === expectedMode && golden.validate(body);

    if (valid) {
      passed += 1;
      console.log(`PASS ${golden.name}`);
    } else {
      console.error(
        `FAIL ${golden.name}: HTTP ${response.status}, mode=${mode}, body=${JSON.stringify(body)}`,
      );
    }
  } catch (error) {
    console.error(`FAIL ${golden.name}:`, error);
  }
}

const estimatedCostUsd = (inputTokens * 2 + outputTokens * 10) / 1_000_000;
console.log(
  `RESULT mode=${expectedMode} passed=${passed}/${cases.length} input_tokens=${inputTokens} output_tokens=${outputTokens} estimated_cost_usd=${estimatedCostUsd.toFixed(4)}`,
);

if (passed !== cases.length) process.exitCode = 1;
