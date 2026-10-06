// Shared helpers for the built-in solver: building a Solution object and
// running Algebrite on parsed expressions.

import type { Solution, Step } from "@/lib/ai/schemas";
import { type MathNode, variablesOf } from "@/lib/math/evaluate";

import { alg, CasError } from "./engine";
import { latex, parseAlgebrite, toAlgebrite } from "./print";

export { LOCAL_MODEL } from "./model";

export class Unsolved extends Error {}

export function step(
  title: string,
  rule: string,
  latexText: string,
  explanation: string,
  commonMistake = "",
): Step {
  return {
    title,
    rule,
    latex: latexText,
    explanation,
    common_mistake: commonMistake,
  };
}

type SolvedParts = {
  restated: string;
  topic: string;
  type: string;
  method: string;
  why: string;
  alternatives: string;
  steps: Step[];
  answer: string;
  plain: string;
  notes?: string;
  checkMethod: string;
  checkDetail: string;
  hints: [string, string, string];
};

export function solved(parts: SolvedParts): Solution {
  return {
    status: "solved",
    clarification_question: "",
    problem: {
      restated_latex: parts.restated,
      topic_id: parts.topic,
      problem_type: parts.type,
    },
    strategy: {
      method: parts.method,
      why_this_method: parts.why,
      alternatives: parts.alternatives,
    },
    steps: parts.steps,
    final_answer: {
      latex: parts.answer,
      plain: parts.plain,
      domain_notes: parts.notes ?? "",
    },
    check: {
      method: parts.checkMethod,
      result: "passed",
      detail: parts.checkDetail,
    },
    hints: parts.hints,
  };
}

// Runs an Algebrite command on expressions and parses the result.
export function algNode(
  template: (...args: string[]) => string,
  ...nodes: MathNode[]
): MathNode {
  const output = alg(template(...nodes.map(toAlgebrite)));
  // An unknown command comes back unevaluated, with its own name in it.
  const tree = parseAlgebrite(output);
  if (
    !tree ||
    /\b(integral|roots|factor|simplify|subst|rationalize)\(/.test(output)
  ) {
    throw new CasError(`could not evaluate: ${output}`);
  }
  return tree;
}

export function depends(node: MathNode, variable: string) {
  return variablesOf(node).has(variable);
}

export const tex = latex;

// "x" is preferred; otherwise the only letter in the expression.
export function mainVariable(node: MathNode): string | undefined {
  const variables = [...variablesOf(node)].filter((name) => name !== "i");
  if (variables.length === 0) return undefined;
  if (variables.includes("x")) return variables.length === 1 ? "x" : undefined;
  return variables.length === 1 ? variables[0] : undefined;
}
