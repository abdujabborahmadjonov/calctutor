// @vitest-environment node

import { describe, expect, it } from "vitest";

import { validateSolution } from "@/lib/ai/schemas";
import { buildVerifyPlan } from "@/lib/verify/plan";

import { localSolve } from ".";
import { exactLatex } from "./numeric";
import { parseProblem } from "./parse";

const answer = (problem: string) => localSolve(problem)?.final_answer.latex;
const compact = (value?: string) =>
  value?.replaceAll(String.raw`\;`, "").replaceAll(/\s/g, "");

describe("parseProblem", () => {
  it.each([
    ["x^2-5x+6=0", "equation"],
    ["2x + y = 5, x - y = 1", "system"],
    [String.raw`\frac{d}{dx}\left[x^2\sin(3x)\right]`, "derivative"],
    ["derivative of x^3 + 2x", "derivative"],
    [String.raw`\int_0^1 x^2\,dx`, "integral"],
    ["integrate x^2 + 3x dx from 0 to 2", "integral"],
    [String.raw`\lim_{x \to 0}\frac{\sin x}{x}`, "limit"],
    ["limit of (1-cos(x))/x^2 as x -> 0", "limit"],
    [String.raw`\begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}`, "matrix"],
    ["Mean and standard deviation of 4, 8, 15, 16, 23, 42", "stats"],
    ["y' = 2y, y(0)=3", "ode"],
    ["factor x^2-5x+6", "expression"],
    ["3/4 + 5/6", "expression"],
  ])("reads %s as %s", (problem, kind) => {
    expect(parseProblem(problem)?.kind).toBe(kind);
  });

  it("leaves word problems and proofs alone", () => {
    expect(
      parseProblem("A ball is thrown up at 12 m/s. How high does it go?"),
    ).toBeUndefined();
    expect(
      parseProblem(
        String.raw`\text{Prove } \sum_{k=1}^{n} k = \frac{n(n+1)}{2}`,
      ),
    ).toBeUndefined();
  });
});

describe("localSolve", () => {
  it.each([
    ["x^2-5x+6=0", "x=2,x=3"],
    ["2x+3=11", "x=4"],
    ["x^2 = 2", String.raw`x=-\sqrt{2},x=\sqrt{2}`],
    ["x^3-6x^2+11x-6=0", "x=1,x=2,x=3"],
    [String.raw`\frac{x}{x+1} = 2`, "x=-2"],
    [
      String.raw`2\sin x - 1 = 0, \; 0 \le x < 2\pi`,
      String.raw`x=\frac{\pi}{6},x=\frac{5\pi}{6}`,
    ],
    [String.raw`\log_{2}(x+3)=5`, "x=29"],
    ["e^x = 5", String.raw`x=\ln5`],
    ["2x + y = 5, x - y = 1", "x=2,y=1"],
    ["x + y + z = 6, 2x - y + z = 3, x + 2y - z = 2", "x=1,y=2,z=3"],
    ["3/4 + 5/6", String.raw`\frac{19}{12}`],
    ["sqrt(72)", String.raw`6\sqrt{2}`],
    ["derivative of x^3 + 2x", "3x^{2}+2"],
    ["d/dx (x^2+1)/(x-1)", String.raw`\frac{x^{2}-2x-1}{\left(x-1\right)^{2}}`],
    [String.raw`\int x e^{x}\,dx`, "-e^{x}+xe^{x}+C"],
    [String.raw`\int_0^{\pi} \sin x\,dx`, "2"],
    [String.raw`\lim_{x \to 2}\frac{x^2-4}{x-2}`, "4"],
    [String.raw`\lim_{x \to \infty}\frac{3x^2+1}{x^2-5}`, "3"],
    ["factor x^2-5x+6", String.raw`\left(x-3\right)\left(x-2\right)`],
    [
      String.raw`\text{Eigenvalues of } \begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}`,
      String.raw`\lambda=1,\lambda=3`,
    ],
    [
      String.raw`\det\begin{pmatrix} 1 & 2 & 3 \\ 0 & 1 & 4 \\ 5 & 6 & 0 \end{pmatrix}`,
      "1",
    ],
    ["y' = 2y, y(0)=3", "y=3e^{2x}"],
  ])("solves %s", (problem, expected) => {
    expect(compact(answer(problem))).toBe(expected);
  });

  it("returns valid solutions with steps, hints and a passed check", () => {
    const solution = localSolve("x^2-5x+6=0");
    if (!solution) throw new Error("expected a solution");
    expect(validateSolution(solution).status).toBe("solved");
    expect(solution.steps.length).toBeGreaterThanOrEqual(3);
    expect(solution.hints).toHaveLength(3);
    expect(solution.check.result).toBe("passed");
    expect(solution.problem.topic_id).toBe("algebra.quadratic-equations");
  });

  it("produces answers the SymPy check and the graph can read", () => {
    const solution = localSolve("x^2-5x+6=0");
    expect(solution && buildVerifyPlan(solution)?.kind).toBe("roots");
    const integral = localSolve(String.raw`\int x e^{x}\,dx`);
    expect(integral && buildVerifyPlan(integral)?.kind).toBe("antiderivative");
  });

  it("explains the method in the steps", () => {
    const parts = localSolve(String.raw`\int x e^{x}\,dx`);
    expect(parts?.strategy.method).toBe("Integration by parts");
    expect(parts?.steps.map((step) => step.title)).toContain("Choose u and dv");
    const hopital = localSolve(String.raw`\lim_{x \to 2}\frac{x^2-4}{x-2}`);
    expect(hopital?.strategy.method).toBe("L'Hôpital's rule");
  });

  it("gives up instead of guessing", () => {
    expect(localSolve("Why does the sky look blue?")).toBeUndefined();
    expect(localSolve(String.raw`\int e^{x}\sin x\,dx`)).toBeUndefined();
  });

  it("works out statistics", () => {
    const solution = localSolve(
      "Mean and standard deviation of 4, 8, 15, 16, 23, 42",
    );
    expect(compact(solution?.final_answer.latex)).toContain(
      String.raw`\bar{x}=18`,
    );
    expect(solution?.final_answer.domain_notes).toContain("n − 1");
  });
});

describe("exactLatex", () => {
  it.each([
    [0.75, String.raw`\frac{3}{4}`],
    [Math.PI / 6, String.raw`\frac{\pi}{6}`],
    [Math.SQRT2, String.raw`\sqrt{2}`],
    [Math.sqrt(12), String.raw`2\sqrt{3}`],
    [Math.E ** 2, "e^{2}"],
    [Math.log(5), String.raw`\ln 5`],
  ])("recognizes %d", (value, expected) => {
    expect(exactLatex(value).latex).toBe(expected);
  });
});
