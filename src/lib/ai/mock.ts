import "server-only";

import alternatingSeries from "@/fixtures/solutions/alternating-series.json";
import eigenvalues from "@/fixtures/solutions/eigenvalues.json";
import fractions from "@/fixtures/solutions/fractions.json";
import improperIntegral from "@/fixtures/solutions/improper-integral.json";
import integrationByParts from "@/fixtures/solutions/integration-by-parts.json";
import limitSine from "@/fixtures/solutions/limit-sine.json";
import needsClarification from "@/fixtures/solutions/needs-clarification.json";
import outOfScope from "@/fixtures/solutions/out-of-scope.json";
import productChain from "@/fixtures/solutions/product-chain.json";
import projectile from "@/fixtures/solutions/projectile.json";
import quadratic from "@/fixtures/solutions/quadratic.json";
import relatedRates from "@/fixtures/solutions/related-rates.json";

import { LOCAL_MODEL, localSolve } from "@/lib/cas";

import { validateSolution, type Solution } from "./schemas";

const fixtures = {
  alternatingSeries: validateSolution(alternatingSeries),
  eigenvalues: validateSolution(eigenvalues),
  fractions: validateSolution(fractions),
  improperIntegral: validateSolution(improperIntegral),
  integrationByParts: validateSolution(integrationByParts),
  limitSine: validateSolution(limitSine),
  needsClarification: validateSolution(needsClarification),
  outOfScope: validateSolution(outOfScope),
  productChain: validateSolution(productChain),
  projectile: validateSolution(projectile),
  quadratic: validateSolution(quadratic),
  relatedRates: validateSolution(relatedRates),
};

export const FIXTURE_MODEL = "mock-fixture";

// Mock mode: a saved fixture when one matches, otherwise the built-in math
// engine, otherwise a clear message that this needs the AI tutor.
export function mockSolve(problemLatex: string): {
  solution: Solution;
  model: string;
} {
  const fixture = fixtureFor(problemLatex);
  if (fixture) return { solution: fixture, model: FIXTURE_MODEL };

  const local = localSolve(problemLatex);
  if (local) return { solution: validateSolution(local), model: LOCAL_MODEL };

  return {
    solution: {
      ...fixtures.needsClarification,
      clarification_question:
        "The built-in math engine can't solve this one without AI. It handles equations, systems, arithmetic, simplifying and factoring, derivatives, integrals, limits, matrices, statistics and simple differential equations. Word problems, proofs and science questions need the AI tutor: set CALCTUTOR_ANTHROPIC_API_KEY and MOCK_AI=false.",
    },
    model: FIXTURE_MODEL,
  };
}

export function getMockSolution(problemLatex: string): Solution {
  return mockSolve(problemLatex).solution;
}

function fixtureFor(problemLatex: string): Solution | undefined {
  const problem = problemLatex.toLowerCase().replaceAll(/\s+/g, "");

  if (problem.includes("lottery")) return fixtures.outOfScope;
  if (problem.includes("eigenvalue")) return fixtures.eigenvalues;
  if (problem.includes("x^{2}-5x+6") || problem.includes("x^2-5x+6")) {
    return fixtures.quadratic;
  }
  if (problem.includes("thrownup") || problem.includes("12m/s")) {
    return fixtures.projectile;
  }
  if (
    problem.includes("\\frac{3}{4}+\\frac{5}{6}") ||
    problem.includes("3/4+5/6")
  ) {
    return fixtures.fractions;
  }
  if (problem.includes("missingbound") || problem.includes("0to(missing")) {
    return fixtures.needsClarification;
  }
  if (problem.includes("ladder")) return fixtures.relatedRates;
  if (problem.includes("\\sum") || problem.includes("(-1)^n")) {
    return fixtures.alternatingSeries;
  }
  const integral = /\\int|integra/.test(problem);
  const derivative = /\\frac\{d\}|d\/dx|deriv|differentiat/.test(problem);
  if (
    integral &&
    (problem.includes("\\sqrt{1-x^{2}}") || problem.includes("sqrt(1-x"))
  ) {
    return fixtures.improperIntegral;
  }
  if (integral && (problem.includes("xe^x") || problem.includes("xe^{x}"))) {
    return fixtures.integrationByParts;
  }
  if (
    derivative &&
    (problem.includes("\\sin(3x)") || problem.includes("sin(3x)"))
  ) {
    return fixtures.productChain;
  }
  if (
    problem.includes("lim") &&
    (problem.includes("\\sinx}{x}") || problem.includes("sinx/x"))
  ) {
    return fixtures.limitSine;
  }

  return undefined;
}
