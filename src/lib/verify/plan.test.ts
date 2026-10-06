import { describe, expect, it } from "vitest";

import alternatingSeries from "@/fixtures/solutions/alternating-series.json";
import improperIntegral from "@/fixtures/solutions/improper-integral.json";
import integrationByParts from "@/fixtures/solutions/integration-by-parts.json";
import limitSine from "@/fixtures/solutions/limit-sine.json";
import eigenvalues from "@/fixtures/solutions/eigenvalues.json";
import productChain from "@/fixtures/solutions/product-chain.json";
import projectile from "@/fixtures/solutions/projectile.json";
import quadratic from "@/fixtures/solutions/quadratic.json";
import relatedRates from "@/fixtures/solutions/related-rates.json";
import { type Solution, SolutionSchema } from "@/lib/ai/schemas";

import {
  buildEquivalencePlan,
  buildVerifyPlan,
  cleanAnswerLatex,
} from "./plan";

const solution = (value: unknown) => SolutionSchema.parse(value);
const strip = (plan: ReturnType<typeof buildVerifyPlan>) =>
  plan &&
  Object.fromEntries(
    Object.entries(plan).map(([key, value]) => [
      key,
      typeof value === "string" ? value.replaceAll(" ", "") : value,
    ]),
  );

describe("cleanAnswerLatex", () => {
  it("removes boxing, the left side, and the constant", () => {
    expect(cleanAnswerLatex(String.raw`\boxed{e^x(x-1)+C}`)).toBe("e^x(x-1)");
    expect(cleanAnswerLatex(String.raw`\int x e^x\,dx = x e^x - e^x + C`)).toBe(
      "x e^x - e^x",
    );
  });
});

describe("buildVerifyPlan", () => {
  it("checks an indefinite integral by differentiating the answer", () => {
    expect(strip(buildVerifyPlan(solution(integrationByParts)))).toEqual({
      kind: "antiderivative",
      variable: "x",
      expr: "xe**(x)",
      answer: "e**(x)(x-1)",
    });
  });

  it("checks a definite integral written with dx in the numerator", () => {
    expect(strip(buildVerifyPlan(solution(improperIntegral)))).toEqual({
      kind: "definite",
      variable: "x",
      expr: "((1)/(sqrt(1-x**(2))))",
      lower: "0",
      upper: "1",
      answer: "((pi)/(2))",
    });
  });

  it("checks a derivative and a limit", () => {
    expect(buildVerifyPlan(solution(productChain))?.kind).toBe("derivative");
    expect(strip(buildVerifyPlan(solution(limitSine)))).toMatchObject({
      kind: "limit",
      point: "0",
      answer: "1",
    });
  });

  it("does not attempt prose answers or word problems", () => {
    expect(buildVerifyPlan(solution(alternatingSeries))).toBeUndefined();
    expect(buildVerifyPlan(solution(relatedRates))).toBeUndefined();
  });

  it("skips solutions that are not solved", () => {
    const unsolved: Solution = {
      ...solution(integrationByParts),
      status: "needs_clarification",
    };
    expect(buildVerifyPlan(unsolved)).toBeUndefined();
  });
});

describe("equation plans", () => {
  const compact = (values: string[]) =>
    values.map((v) => v.replaceAll(" ", ""));
  const withAnswer = (restated: string, answer: string) =>
    solution({
      ...quadratic,
      problem: { ...quadratic.problem, restated_latex: restated },
      final_answer: { ...quadratic.final_answer, latex: answer },
    });

  it("substitutes each listed root back into the equation", () => {
    const plan = buildVerifyPlan(solution(quadratic));
    expect(plan?.kind).toBe("roots");
    if (plan?.kind !== "roots") return;
    expect(plan.variable).toBe("x");
    expect(plan.expr.replaceAll(" ", "")).toBe("(x**(2)-5x+6)-(0)");
    expect(compact(plan.values)).toEqual(["2", "3"]);
  });

  it("expands plus-minus and reads 'or'", () => {
    const plusMinus = buildVerifyPlan(
      withAnswer("x^2 = 2", String.raw`x = \pm\sqrt{2}`),
    );
    expect(plusMinus?.kind === "roots" && compact(plusMinus.values)).toEqual([
      "sqrt(2)",
      "-sqrt(2)",
    ]);
    const either = buildVerifyPlan(
      withAnswer(
        String.raw`\left(y-1\right)(y-4)=0`,
        String.raw`y = 1 \text{ or } y = 4`,
      ),
    );
    expect(either?.kind === "roots" && compact(either.values)).toEqual([
      "1",
      "4",
    ]);
  });

  it("skips inequalities, constraints, systems and other variables", () => {
    expect(
      buildVerifyPlan(
        withAnswer(String.raw`2\sin x - 1 = 0, \; 0 \le x < 2\pi`, "x = 1"),
      ),
    ).toBeUndefined();
    expect(buildVerifyPlan(withAnswer("x + y = 3", "x = 1"))).toBeUndefined();
    expect(buildVerifyPlan(withAnswer("2x = 6", "y = 3"))).toBeUndefined();
    expect(buildVerifyPlan(solution(eigenvalues))).toBeUndefined();
    expect(buildVerifyPlan(solution(projectile))).toBeUndefined();
  });
});

describe("buildEquivalencePlan", () => {
  it("picks the variable from the expressions", () => {
    expect(
      strip(buildEquivalencePlan(String.raw`\frac{t^2}{2}`, "t^2/2")),
    ).toEqual({
      kind: "equivalent",
      variable: "t",
      expected: "((t**(2))/(2))",
      answer: "t**(2)/2",
    });
  });

  it("returns undefined for an answer it cannot read", () => {
    expect(buildEquivalencePlan("x^2", String.raw`\text{two}`)).toBeUndefined();
  });
});
