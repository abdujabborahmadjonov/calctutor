// The built-in solver: answers many math problems with worked steps and no
// AI, using a computer algebra system in the app. It is used when no API key
// is set (mock mode) and as the demo's engine. Anything it cannot solve and
// check returns undefined.

import type { Solution } from "@/lib/ai/schemas";

import { solveEquation, solveExpression, solveSystem } from "./algebra";
import { resetAlgebra } from "./engine";
import { solveDerivative, solveIntegral, solveLimit } from "./calculus";
import { solveMatrix, solveOde, solveStats } from "./other";
import { parseProblem } from "./parse";

export { LOCAL_MODEL } from "./build";

export function localSolve(problemText: string): Solution | undefined {
  const problem = parseProblem(problemText);
  if (!problem) return undefined;
  resetAlgebra();
  try {
    switch (problem.kind) {
      case "derivative":
        return solveDerivative(problem.expr, problem.variable);
      case "integral":
        return solveIntegral(problem.expr, problem.variable, problem.bounds);
      case "limit":
        return solveLimit(
          problem.expr,
          problem.variable,
          problem.point,
          problem.pointNode,
        );
      case "equation":
        return solveEquation(
          problem.left,
          problem.right,
          problem.variable,
          problem.interval,
        );
      case "system":
        return solveSystem(problem.equations, problem.variables);
      case "expression":
        return solveExpression(problem.expr, problem.intent);
      case "matrix":
        return solveMatrix(problem.rows, problem.intent);
      case "stats":
        return solveStats(problem.values, problem.wants, problem.sample);
      case "ode":
        return solveOde(problem.rhs, problem.initial);
    }
  } catch (error) {
    // A failed check or an unsupported form: not solvable offline.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[CalcTutor] Built-in solver gave up:",
        error instanceof Error ? error.message : error,
      );
    }
    return undefined;
  }
}
