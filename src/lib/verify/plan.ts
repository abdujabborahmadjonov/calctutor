import type { Solution } from "@/lib/ai/schemas";

import { latexToSympy } from "./latexToSympy";

export type VerifyPlan =
  | { kind: "antiderivative"; variable: string; expr: string; answer: string }
  | {
      kind: "definite";
      variable: string;
      expr: string;
      lower: string;
      upper: string;
      answer: string;
    }
  | { kind: "derivative"; variable: string; expr: string; answer: string }
  | {
      kind: "limit";
      variable: string;
      expr: string;
      point: string;
      answer: string;
    }
  | { kind: "roots"; variable: string; expr: string; values: string[] }
  | {
      kind: "equivalent";
      variable: string;
      expected: string;
      answer: string;
    };

const SPACING = /\\[,;!: ]|\\quad|\\qquad|\\displaystyle/g;

function unwrap(latex: string, command: string) {
  const prefix = `\\${command}{`;
  const trimmed = latex.trim();
  if (!trimmed.startsWith(prefix) || !trimmed.endsWith("}")) return trimmed;
  return trimmed.slice(prefix.length, -1).trim();
}

// Splits on "=" outside braces and keeps the last side, so
// "\int x e^x dx = e^x(x-1) + C" becomes "e^x(x-1) + C".
function lastSide(latex: string) {
  let depth = 0;
  let start = 0;
  for (let index = 0; index < latex.length; index += 1) {
    const char = latex[index];
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (char === "=" && depth === 0) start = index + 1;
  }
  return latex.slice(start).trim();
}

export function cleanAnswerLatex(latex: string) {
  return lastSide(unwrap(latex.replaceAll(SPACING, " "), "boxed"))
    .replace(/\s*\+\s*C\s*$/, "")
    .trim();
}

function group(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}")
    ? trimmed.slice(1, -1)
    : trimmed;
}

function stripBrackets(value: string) {
  const trimmed = value
    .trim()
    .replace(/^\\left\s*[[(]/, "(")
    .replace(/\\right\s*[\])]$/, ")");
  if (/^[[(].*[\])]$/.test(trimmed)) return trimmed.slice(1, -1);
  return trimmed;
}

// "\frac{dx}{g}" puts the differential in the numerator: the integrand is 1/g.
function integrandAndVariable(body: string) {
  const fraction = body.match(/^\\frac\{\s*d([a-z])\s*\}\{(.+)\}$/);
  if (fraction)
    return { integrand: `\\frac{1}{${fraction[2]}}`, variable: fraction[1] };
  const trailing = body.match(/^(.+?)\s*d([a-z])$/);
  if (trailing) return { integrand: trailing[1], variable: trailing[2] };
  return undefined;
}

const BOUND = String.raw`(\{[^{}]*\}|[^\s{}\\]|\\infty|\\pi)`;

function planFromProblem(
  problem: string,
  answer: string,
): VerifyPlan | undefined {
  const definite = problem.match(
    new RegExp(String.raw`^\\int_${BOUND}\^${BOUND}\s*(.+)$`),
  );
  if (definite) {
    const parts = integrandAndVariable(definite[3].trim());
    const expr = parts && latexToSympy(parts.integrand);
    const lower = latexToSympy(group(definite[1]));
    const upper = latexToSympy(group(definite[2]));
    if (!parts || !expr || !lower || !upper) return undefined;
    return {
      kind: "definite",
      variable: parts.variable,
      expr,
      lower,
      upper,
      answer,
    };
  }

  const indefinite = problem.match(/^\\int\s*(.+)$/);
  if (indefinite) {
    const parts = integrandAndVariable(indefinite[1].trim());
    const expr = parts && latexToSympy(parts.integrand);
    if (!parts || !expr) return undefined;
    return { kind: "antiderivative", variable: parts.variable, expr, answer };
  }

  const derivative = problem.match(/^\\frac\{d\}\{d([a-z])\}\s*(.+)$/);
  if (derivative) {
    const expr = latexToSympy(stripBrackets(derivative[2]));
    if (!expr) return undefined;
    return { kind: "derivative", variable: derivative[1], expr, answer };
  }

  const limitMatch = problem.match(
    /^\\lim_\{\s*([a-z])\s*\\to\s*([^{}]+)\}\s*(.+)$/,
  );
  if (limitMatch) {
    const point = latexToSympy(limitMatch[2].replace(/\^[+-]$/, ""));
    const expr = latexToSympy(limitMatch[3]);
    // One-sided limits are left to the model's own check.
    if (!point || !expr || /\^[+-]/.test(limitMatch[2])) return undefined;
    return { kind: "limit", variable: limitMatch[1], expr, point, answer };
  }

  return undefined;
}

// Splits LaTeX at a top-level "=" (outside braces).
function topLevelEquals(latex: string) {
  const positions: number[] = [];
  let depth = 0;
  for (let index = 0; index < latex.length; index += 1) {
    const char = latex[index];
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (char === "=" && depth === 0) positions.push(index);
  }
  return positions;
}

const NOT_AN_EQUATION =
  /\\(?:(?:text|int|lim|sum|le|ge|leq|geq|neq|begin)(?![a-zA-Z])|frac\{d)|[<>,]/;

// "x = 2, \; x = 3", "x = \pm 2" or "x = 1 \text{ or } x = 4" as SymPy
// values, when every part names the same variable.
function rootValues(answerLatex: string, variable: string) {
  const parts = unwrap(answerLatex.replaceAll(SPACING, " "), "boxed")
    .replaceAll(/\\text\{\s*or\s*\}|\bor\b/g, ",")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;

  const values: string[] = [];
  for (const part of parts) {
    const match = part.match(/^([a-zA-Z])\s*=\s*(.+)$/);
    if (!match || match[1] !== variable) return undefined;
    const raw = match[2].trim();
    const options = raw.includes("\\pm")
      ? [raw.replace("\\pm", "+"), raw.replace("\\pm", "-")]
      : [raw];
    for (const option of options) {
      const value = latexToSympy(option.replace(/^\+/, ""));
      if (!value) return undefined;
      values.push(value);
    }
  }
  return values;
}

// An equation in one variable whose answer lists its solutions: each one is
// substituted back. This confirms the listed roots, not that none is missing.
function planForEquation(solution: Solution): VerifyPlan | undefined {
  const problem = solution.problem.restated_latex
    .replaceAll(SPACING, " ")
    .trim();
  if (NOT_AN_EQUATION.test(problem)) return undefined;
  const equals = topLevelEquals(problem);
  if (equals.length !== 1) return undefined;

  const left = latexToSympy(problem.slice(0, equals[0]));
  const right = latexToSympy(problem.slice(equals[0] + 1));
  if (!left || !right) return undefined;
  const expr = `(${left})-(${right})`;

  const letters = expr
    .replaceAll(
      /\b(?:sin|cos|tan|sec|csc|cot|asin|acos|atan|sinh|cosh|tanh|log|exp|sqrt|pi|oo)\b/g,
      " ",
    )
    .match(/[a-zA-Z]/g);
  const variables = [...new Set(letters?.filter((l) => l !== "e"))];
  if (variables.length !== 1) return undefined;
  const [variable] = variables;

  const values = rootValues(solution.final_answer.latex, variable);
  return values ? { kind: "roots", variable, expr, values } : undefined;
}

// Builds a CAS check for solved problems in a recognised form. Anything else
// (series verdicts, word problems, prose answers) returns undefined and is
// shown as "Could not verify".
export function buildVerifyPlan(solution: Solution): VerifyPlan | undefined {
  if (solution.status !== "solved") return undefined;

  const equation = planForEquation(solution);
  if (equation) return equation;

  const answerLatex = cleanAnswerLatex(solution.final_answer.latex);
  if (/\\text|\\mathrm|DNE/.test(answerLatex)) return undefined;

  const answer = latexToSympy(answerLatex);
  if (!answer) return undefined;

  const problem = solution.problem.restated_latex
    .replaceAll(SPACING, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
  return planFromProblem(problem, answer);
}

// Builds a check that a student's typed answer matches the expected one.
export function buildEquivalencePlan(
  expectedLatex: string,
  studentLatex: string,
): VerifyPlan | undefined {
  const expected = latexToSympy(cleanAnswerLatex(expectedLatex));
  const answer = latexToSympy(cleanAnswerLatex(studentLatex));
  if (!expected || !answer) return undefined;

  const letters = `${expected} ${answer}`
    .replaceAll(
      /\b(?:sin|cos|tan|sec|csc|cot|asin|acos|atan|sinh|cosh|tanh|log|exp|sqrt|pi|oo)\b/g,
      " ",
    )
    .match(/[a-zA-Z]/g);
  const variable = letters?.find((letter) => letter !== "e") ?? "x";
  return { kind: "equivalent", variable, expected, answer };
}
