// Thin wrappers over the two computer algebra libraries. Algebrite does the
// algebra and calculus; nerdamer only evaluates limits, which Algebrite lacks.
// Every result is checked numerically by the caller before it is shown.

import Algebrite from "algebrite";
import nerdamer from "nerdamer";

export class CasError extends Error {}

export function alg(script: string): string {
  let output: string;
  try {
    output = Algebrite.run(script);
  } catch (error) {
    throw new CasError(error instanceof Error ? error.message : String(error));
  }
  if (/^Stop|nil$|Unsupported/.test(output.trim())) {
    throw new CasError(output);
  }
  return output.trim();
}

// Algebrite keeps symbols between calls; each problem starts clean.
export function resetAlgebra() {
  try {
    Algebrite.clearall();
  } catch {
    // Nothing was defined.
  }
}

export function nerdamerLimit(
  expression: string,
  variable: string,
  point: string,
): string {
  try {
    return nerdamer
      .limit(expression.replaceAll("**", "^"), variable, point)
      .toString();
  } catch (error) {
    throw new CasError(error instanceof Error ? error.message : String(error));
  }
}
