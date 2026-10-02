import "server-only";

import alternatingSeries from "@/fixtures/solutions/alternating-series.json";
import improperIntegral from "@/fixtures/solutions/improper-integral.json";
import integrationByParts from "@/fixtures/solutions/integration-by-parts.json";
import limitSine from "@/fixtures/solutions/limit-sine.json";
import needsClarification from "@/fixtures/solutions/needs-clarification.json";
import outOfScope from "@/fixtures/solutions/out-of-scope.json";
import productChain from "@/fixtures/solutions/product-chain.json";
import relatedRates from "@/fixtures/solutions/related-rates.json";

import { validateSolution, type Solution } from "./schemas";

const fixtures = {
  alternatingSeries: validateSolution(alternatingSeries),
  improperIntegral: validateSolution(improperIntegral),
  integrationByParts: validateSolution(integrationByParts),
  limitSine: validateSolution(limitSine),
  needsClarification: validateSolution(needsClarification),
  outOfScope: validateSolution(outOfScope),
  productChain: validateSolution(productChain),
  relatedRates: validateSolution(relatedRates),
};

export function getMockSolution(problemLatex: string): Solution {
  const problem = problemLatex.toLowerCase().replaceAll(/\s+/g, "");

  if (problem.includes("eigenvalue")) return fixtures.outOfScope;
  if (problem.includes("missingbound") || problem.includes("0to(missing")) {
    return fixtures.needsClarification;
  }
  if (problem.includes("ladder")) return fixtures.relatedRates;
  if (problem.includes("\\sum") || problem.includes("(-1)^n")) {
    return fixtures.alternatingSeries;
  }
  if (problem.includes("\\sqrt{1-x^{2}}") || problem.includes("sqrt(1-x")) {
    return fixtures.improperIntegral;
  }
  if (problem.includes("xe^x") || problem.includes("xe^{x}")) {
    return fixtures.integrationByParts;
  }
  if (problem.includes("\\sin(3x)") || problem.includes("sin(3x)")) {
    return fixtures.productChain;
  }
  if (problem.includes("\\sinx}{x}") || problem.includes("sinx/x")) {
    return fixtures.limitSine;
  }

  return {
    ...fixtures.needsClarification,
    clarification_question:
      "Mock mode has no fixture for this problem. Try one of the examples or set MOCK_AI=false with an Anthropic API key.",
  };
}
