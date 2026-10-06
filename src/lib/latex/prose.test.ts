import { describe, expect, it } from "vitest";

import { looksLikeProse } from "./normalize";

describe("looksLikeProse", () => {
  it.each([
    ["Mean and standard deviation of 4, 8, 15", true],
    ["Why does the sky look blue?", true],
    ["integrate x e^x", false],
    ["sin(x) cos(x) tan(x)", false],
    [
      String.raw`\text{Eigenvalues of the matrix} \begin{pmatrix}1\end{pmatrix}`,
      false,
    ],
    ["x^2-5x+6=0", false],
  ])("%s → %s", (value, expected) => {
    expect(looksLikeProse(value)).toBe(expected);
  });
});
