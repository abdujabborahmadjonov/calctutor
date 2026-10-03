import { describe, expect, it } from "vitest";

import { latexToSympy } from "./latexToSympy";

const compact = (value: string | undefined) => value?.replaceAll(" ", "");

describe("latexToSympy", () => {
  it.each([
    [String.raw`x e^{x}`, "xe**(x)"],
    [String.raw`e^x(x-1)`, "e**(x)(x-1)"],
    [String.raw`\frac{1}{\sqrt{1-x^2}}`, "((1)/(sqrt(1-x**(2))))"],
    [String.raw`\frac34`, "((3)/(4))"],
    [String.raw`\frac{\pi}{2}`, "((pi)/(2))"],
    [String.raw`x^2\sin(3x)`, "x**(2)sin(3x)"],
    [String.raw`2x\sin(3x)+3x^2\cos(3x)`, "2xsin(3x)+3x**(2)cos(3x)"],
    [String.raw`\frac{\sin x}{x}`, "((sin(x))/(x))"],
    [String.raw`x^{2}\ln x`, "x**(2)log(x)"],
    [String.raw`\sin^2 x`, "sin(x)**(2)"],
    [String.raw`\sin^{-1}(x)`, "asin(x)"],
    [String.raw`\arctan x`, "atan(x)"],
    [String.raw`\sqrt[3]{x}`, "((x)**(1/(3)))"],
    [String.raw`\left(x+1\right)^2`, "(x+1)**(2)"],
    [String.raw`\left[x+1\right]`, "(x+1)"],
    [String.raw`2\cdot\pi`, "2*pi"],
    [String.raw`e^{-x^2}`, "e**(-x**(2))"],
  ])("converts %s", (latex, expected) => {
    expect(compact(latexToSympy(latex))).toBe(expected);
  });

  it.each([
    String.raw`\sum_{n=1}^{\infty} \frac{1}{n}`,
    String.raw`\text{converges}`,
    String.raw`x = 3`,
    String.raw`|x|`,
    String.raw`\frac{1}{x`,
    String.raw`n!`,
    "",
  ])("refuses %s", (latex) => {
    expect(latexToSympy(latex)).toBeUndefined();
  });
});
