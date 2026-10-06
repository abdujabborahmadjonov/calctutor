import { describe, expect, it } from "vitest";

import {
  compileMath,
  formatNumber,
  graphExpression,
  instantAnswer,
  toFraction,
} from "./evaluate";

const at = (source: string, x?: number) =>
  compileMath(source)?.evaluate(x === undefined ? {} : { x });

describe("compileMath", () => {
  it.each([
    ["2+3*4", 14],
    ["2^3^2", 512],
    ["-2^2", -4],
    ["(1+2)(3+4)", 21],
    ["2pi", 2 * Math.PI],
    ["sqrt(16)+5!", 124],
    ["√9", 3],
    ["6 ÷ 4 × 2", 3],
    [String.raw`\frac{3}{4}+\frac{5}{6}`, 19 / 12],
    [String.raw`\sqrt[3]{-8}`, -2],
    [String.raw`2\cdot\pi`, 2 * Math.PI],
  ])("evaluates %s", (source, expected) => {
    expect(at(source)).toBeCloseTo(expected, 12);
  });

  it.each([
    ["x^2 - 5x + 6", 2, 0],
    ["2x sin(x)", Math.PI / 2, Math.PI],
    ["sin^2(x) + cos^2(x)", 0.7, 1],
    ["e^x", 1, Math.E],
    ["ln(x)", Math.E, 1],
    [String.raw`x^{2}\ln x`, Math.E, Math.E ** 2],
    [String.raw`\frac{\sin x}{x}`, Math.PI, 0],
    [String.raw`e^{-x^2}`, 1, Math.exp(-1)],
  ])("evaluates %s at x = %d", (source, x, expected) => {
    expect(at(source, x)).toBeCloseTo(expected, 10);
  });

  it("reports the free variables", () => {
    expect(compileMath("x y + 2t")?.variables).toEqual(["t", "x", "y"]);
    expect(compileMath("2e")?.variables).toEqual([]);
  });

  it.each([
    "",
    "2+",
    "(1+2",
    "f(x)=",
    "x = 3",
    String.raw`\sum_{n=1}^{\infty} n`,
  ])("refuses %s", (source) => {
    expect(compileMath(source)).toBeUndefined();
  });
});

describe("instantAnswer", () => {
  it("answers rational arithmetic exactly", () => {
    expect(instantAnswer("3/4 + 5/6")?.latex).toBe(
      String.raw`\frac{19}{12} \approx 1.583333333`,
    );
    expect(instantAnswer(String.raw`\frac{3}{4}+\frac{5}{6}`)?.latex).toContain(
      String.raw`\frac{19}{12}`,
    );
    expect(instantAnswer("12*(3+4)")?.latex).toBe("84");
    expect(instantAnswer("1/2 - 3/4")?.latex).toContain(
      String.raw`-\frac{1}{4}`,
    );
  });

  it("gives a decimal for irrational results", () => {
    expect(instantAnswer("sqrt(2)")).toEqual({
      latex: String.raw`\approx 1.414213562`,
      approximate: true,
    });
  });

  it("leaves equations, variables and bare numbers to the solver", () => {
    expect(instantAnswer("x^2-5x+6=0")).toBeUndefined();
    expect(instantAnswer("2x+1")).toBeUndefined();
    expect(instantAnswer("42")).toBeUndefined();
    expect(instantAnswer(String.raw`\int x\,dx`)).toBeUndefined();
    expect(instantAnswer("1/0")).toBeUndefined();
  });
});

describe("helpers", () => {
  it("finds fractions and formats numbers", () => {
    expect(toFraction(0.375)).toEqual({ numerator: 3, denominator: 8 });
    expect(toFraction(-19 / 12)).toEqual({ numerator: -19, denominator: 12 });
    expect(toFraction(Math.PI)).toBeUndefined();
    expect(formatNumber(1 / 3)).toBe("0.3333333333");
    expect(formatNumber(1.5e-9)).toBe("1.5e-9");
  });

  it("strips y = and f(x) = before graphing", () => {
    expect(graphExpression("y = x^2")).toBe("x^2");
    expect(graphExpression("f(x)=sin x")).toBe("sin x");
    expect(graphExpression("x^2")).toBe("x^2");
  });
});
