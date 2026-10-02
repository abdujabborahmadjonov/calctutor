import { describe, expect, it } from "vitest";

import { normalizeLatex } from "./normalize";

describe("normalizeLatex", () => {
  it("removes common display delimiters", () => {
    expect(normalizeLatex(String.raw`$$ \int x\,dx $$`)).toBe(
      String.raw`\int x\,dx`,
    );
    expect(normalizeLatex(String.raw`\[ x^2 \]`)).toBe("x^2");
  });

  it("normalizes unicode math symbols", () => {
    expect(normalizeLatex("lim x → ∞ of √x ≤ π")).toBe(
      String.raw`lim x \to \infty of \sqrtx \leq \pi`,
    );
  });

  it("keeps half-typed input instead of rejecting it", () => {
    expect(normalizeLatex(String.raw`\frac{x}{`)).toBe(String.raw`\frac{x}{`);
  });
});
