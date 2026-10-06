import { describe, expect, it } from "vitest";

import eigenvalues from "@/fixtures/solutions/eigenvalues.json";
import improperIntegral from "@/fixtures/solutions/improper-integral.json";
import integrationByParts from "@/fixtures/solutions/integration-by-parts.json";
import limitSine from "@/fixtures/solutions/limit-sine.json";
import productChain from "@/fixtures/solutions/product-chain.json";
import quadratic from "@/fixtures/solutions/quadratic.json";
import { SolutionSchema } from "@/lib/ai/schemas";

import {
  compileFunction,
  curvesForSolution,
  DEFAULT_VIEW,
  fitView,
  keyPoints,
  sampleCurve,
  suggestView,
  ticks,
  tickStep,
} from "./graph";

const curves = (value: unknown) =>
  curvesForSolution(SolutionSchema.parse(value));

describe("curvesForSolution", () => {
  it("graphs the left side of an equation set to zero", () => {
    const [left, ...rest] = curves(quadratic);
    expect(rest).toHaveLength(0);
    expect(left.label).toBe("Left side");
    expect(left.fn(2)).toBeCloseTo(0);
    expect(left.fn(0)).toBe(6);
  });

  it("graphs an integrand with its antiderivative", () => {
    const [integrand, antiderivative] = curves(integrationByParts);
    expect(integrand.fn(1)).toBeCloseTo(Math.E);
    expect(antiderivative.label).toContain("Antiderivative");
    expect(antiderivative.fn(2)).toBeCloseTo(Math.E ** 2);
  });

  it("shades a definite integral between its bounds", () => {
    const [integrand] = curves(improperIntegral);
    expect(integrand.shade).toEqual([0, 1]);
    expect(integrand.fn(0)).toBe(1);
  });

  it("graphs a function with its derivative", () => {
    const [fn, derivative] = curves(productChain);
    expect(fn.label).toBe("Function");
    expect(fn.fn(1)).toBeCloseTo(Math.sin(3));
    expect(derivative.fn(0)).toBeCloseTo(0);
  });

  it("skips limits and matrix problems", () => {
    expect(curves(limitSine)).toEqual([]);
    expect(curves(eigenvalues)).toEqual([]);
  });
});

describe("graph helpers", () => {
  it("breaks curves at asymptotes", () => {
    const segments = sampleCurve((x) => 1 / x, DEFAULT_VIEW, 400);
    expect(segments.length).toBe(2);
    expect(
      segments.every(
        (segment) =>
          segment.every(([x]) => x < 0) || segment.every(([x]) => x > 0),
      ),
    ).toBe(true);
  });

  it("finds roots and the y-intercept", () => {
    const points = keyPoints(
      compileFunction("x^2-5x+6") ?? (() => NaN),
      DEFAULT_VIEW,
    );
    const roots = points
      .filter((point) => point.kind === "root")
      .map((point) => point.x);
    expect(roots).toHaveLength(2);
    expect(roots[0]).toBeCloseTo(2, 6);
    expect(roots[1]).toBeCloseTo(3, 6);
    expect(points.find((point) => point.kind === "y-intercept")?.y).toBe(6);
  });

  it("picks 1-2-5 tick steps", () => {
    expect(tickStep(20)).toBe(2);
    expect(tickStep(1)).toBe(0.1);
    expect(tickStep(700)).toBe(100);
    expect(ticks(-1, 1, 0.5)).toEqual([-1, -0.5, 0, 0.5, 1]);
  });

  it("fits the view to the curve", () => {
    const view = fitView([(x) => x * x]);
    expect(view.yMin).toBeLessThan(0);
    expect(view.yMax).toBeGreaterThan(80);
  });

  it("rejects functions of two variables", () => {
    expect(compileFunction("x+y")).toBeUndefined();
    expect(compileFunction("3", { allowConstant: false })).toBeUndefined();
  });
});

describe("suggestView", () => {
  it("frames the roots of the first curve", () => {
    const view = suggestView(curves(quadratic));
    expect(view.xMin).toBeLessThan(2);
    expect(view.xMax).toBeGreaterThan(3);
    expect(view.xMax - view.xMin).toBeLessThan(12);
    expect(view.yMin).toBeLessThan(0);
  });

  it("frames a shaded interval", () => {
    const view = suggestView(curves(improperIntegral));
    expect(view.xMin).toBeLessThanOrEqual(-1);
    expect(view.xMax).toBeGreaterThanOrEqual(1);
    expect(view.xMax - view.xMin).toBeLessThan(10);
  });
});
