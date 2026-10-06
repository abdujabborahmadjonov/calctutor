// Reads a typed problem (LaTeX, plain notation or a short instruction such
// as "derivative of x^2 sin x") and decides what kind of problem it is.

import { normalizeLatex } from "@/lib/latex/normalize";
import {
  evaluateNode,
  type MathNode,
  parseMath,
  variablesOf,
} from "@/lib/math/evaluate";

export type Interval = [number, number];

export type Problem =
  | { kind: "derivative"; expr: MathNode; variable: string }
  | {
      kind: "integral";
      expr: MathNode;
      variable: string;
      bounds?: [MathNode, MathNode];
    }
  | {
      kind: "limit";
      expr: MathNode;
      variable: string;
      point: number;
      pointNode?: MathNode;
    }
  | {
      kind: "equation";
      left: MathNode;
      right: MathNode;
      variable: string;
      interval?: Interval;
    }
  | {
      kind: "system";
      equations: Array<[MathNode, MathNode]>;
      variables: string[];
    }
  | {
      kind: "expression";
      expr: MathNode;
      intent: "simplify" | "factor" | "expand";
    }
  | {
      kind: "matrix";
      rows: MathNode[][];
      intent: "eigen" | "det" | "inverse" | "transpose";
    }
  | { kind: "stats"; values: number[]; wants: Set<StatName>; sample?: boolean }
  | {
      kind: "ode";
      rhs: MathNode;
      initial?: { x: number; y: number };
    };

export type StatName =
  "mean" | "median" | "mode" | "range" | "variance" | "sd" | "sum";

const INSTRUCTION =
  /^(?:please\s+)?(?:solve|find|evaluate|compute|calculate|simplify|factori[sz]e|factor|expand|determine|work out|what is|what's|show that)\b[:\s]*(?:for\s+[a-z]\b\s*)?(?:the\s+)?/i;

function textWords(source: string) {
  return [...source.matchAll(/\\text\{([^{}]*)\}/g)]
    .map((match) => match[1])
    .join(" ");
}

function withoutText(source: string) {
  return source.replaceAll(/\\text\{[^{}]*\}/g, " ").trim();
}

function constant(node: MathNode | undefined) {
  if (!node || variablesOf(node).size > 0) return undefined;
  const value = evaluateNode(node, {});
  return Number.isFinite(value) ? value : undefined;
}

// Splits at top-level separators (outside braces and brackets).
function splitTop(source: string, separators: RegExp) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if ("{([".includes(char)) depth += 1;
    else if ("})]".includes(char)) depth -= 1;
    else if (depth === 0) {
      const rest = source.slice(index);
      const match = rest.match(separators);
      if (match && match.index === 0) {
        parts.push(source.slice(start, index));
        index += match[0].length - 1;
        start = index + 1;
      }
    }
  }
  parts.push(source.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

function equalsSplit(source: string): [string, string] | undefined {
  const parts = splitTop(source, /^=/);
  return parts.length === 2 ? [parts[0], parts[1]] : undefined;
}

// "0 \le x < 2\pi" or "0 <= x <= 10".
function parseInterval(source: string): Interval | undefined {
  const match = source
    .replaceAll(/\\leq?|<=|≤/g, "<")
    .replaceAll(/\\geq?|>=|≥/g, ">")
    .replaceAll("\\lt", "<")
    .match(/^(.+?)<\s*[a-z]\s*<(.+)$/);
  if (!match) return undefined;
  const low = constant(parseMath(match[1]));
  const high = constant(parseMath(match[2]));
  return low !== undefined && high !== undefined && low < high
    ? [low, high]
    : undefined;
}

function matrixRows(source: string): MathNode[][] | undefined {
  const latexMatrix = source.match(
    /\\begin\{([pbvB]?matrix)\}([\s\S]*?)\\end\{\1\}/,
  );
  let rows: string[][];
  if (latexMatrix) {
    rows = latexMatrix[2]
      .split("\\\\")
      .map((row) => row.split("&").map((cell) => cell.trim()))
      .filter((row) => row.some(Boolean));
  } else {
    const plain = source.match(/\[\s*\[([\s\S]*)\]\s*\]/);
    if (!plain) return undefined;
    rows = plain[1]
      .split(/\]\s*,\s*\[/)
      .map((row) => row.split(",").map((cell) => cell.trim()));
  }
  const parsed = rows.map((row) => row.map((cell) => parseMath(cell)));
  if (parsed.some((row) => row.some((cell) => !cell))) return undefined;
  const width = parsed[0]?.length ?? 0;
  if (width === 0 || parsed.some((row) => row.length !== width)) {
    return undefined;
  }
  return parsed as MathNode[][];
}

function statWants(lower: string): Set<StatName> {
  const wants = new Set<StatName>();
  if (/\b(mean|average)\b/.test(lower)) wants.add("mean");
  if (/\bmedian\b/.test(lower)) wants.add("median");
  if (/\bmode\b/.test(lower)) wants.add("mode");
  if (/\brange\b/.test(lower)) wants.add("range");
  if (/\bvariance\b/.test(lower)) wants.add("variance");
  if (/standard deviation|\bsd\b|\bstdev\b/.test(lower)) wants.add("sd");
  if (/\bsum\b|\btotal\b/.test(lower)) wants.add("sum");
  return wants;
}

function stripDifferential(source: string) {
  const fraction = source.match(/^\\frac\{\s*d([a-z])\s*\}\{(.+)\}$/);
  if (fraction)
    return { body: `\\frac{1}{${fraction[2]}}`, variable: fraction[1] };
  const match = source.match(/^(.+?)\s*(?:\\,|\\;|\\!|\s)*\bd([a-z])\s*$/);
  if (match) return { body: match[1], variable: match[2] };
  return { body: source, variable: undefined };
}

function parsePoint(
  source: string,
): { point: number; node?: MathNode } | undefined {
  const cleaned = source.trim().replace(/\^\{?[+-]\}?$/, "");
  if (/^\+?\\infty$|^\+?(?:inf|infinity|∞|oo)$/i.test(cleaned)) {
    return { point: Infinity };
  }
  if (/^-\\infty$|^-(?:inf|infinity|∞|oo)$/i.test(cleaned)) {
    return { point: -Infinity };
  }
  const node = parseMath(cleaned);
  const value = constant(node);
  return value === undefined ? undefined : { point: value, node };
}

// \log_{b}(u) and log_b(u) become \frac{\ln(u)}{\ln(b)}, which the
// expression parser understands.
function rewriteLogBases(source: string) {
  return source.replaceAll(
    /\\?log_\{?([0-9a-z.]+)\}?\s*(\((?:[^()]|\([^()]*\))*\)|[a-z0-9]+)/g,
    (_, base: string, arg: string) =>
      `\\frac{\\ln${arg.startsWith("(") ? arg : `(${arg})`}}{\\ln(${base})}`,
  );
}

export function parseProblem(input: string): Problem | undefined {
  let source = rewriteLogBases(normalizeLatex(input))
    .replaceAll(/\\displaystyle|\\,|\\;|\\!|\\quad|\\qquad/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
  const keywords = `${source} ${textWords(source)}`.toLowerCase();

  // Statistics: keywords and a list of at least two numbers.
  const wants = statWants(keywords);
  const numbers = source.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (wants.size > 0 && numbers.length >= 3 && !/[=^\\]/.test(source)) {
    return {
      kind: "stats",
      values: numbers,
      wants,
      sample: /\bsample\b/.test(keywords)
        ? true
        : /\bpopulation\b/.test(keywords)
          ? false
          : undefined,
    };
  }

  // Matrices.
  const rows = matrixRows(source);
  if (rows) {
    const intent = /eigen/.test(keywords)
      ? "eigen"
      : /inverse|\^\{-1\}|invert/.test(keywords)
        ? "inverse"
        : /transpose/.test(keywords)
          ? "transpose"
          : "det";
    return { kind: "matrix", rows, intent };
  }

  if (/\bprove\b|\bshow that\b/.test(keywords)) return undefined;

  source = withoutText(source)
    .replace(INSTRUCTION, "")
    .replace(/\s*[.?]$/, "")
    .trim();

  // Differential equations: y' = f(x, y), optionally with y(x0) = y0.
  const ode = source.match(/^(?:y'|y′|\\frac\{dy\}\{dx\}|dy\/dx)\s*=\s*(.+)$/);
  if (ode) {
    const [rhsText, ...rest] = splitTop(ode[1], /^,|^;|^\band\b/);
    const rhs = parseMath(rhsText);
    if (!rhs) return undefined;
    const extra = [...variablesOf(rhs)].filter(
      (name) => name !== "x" && name !== "y",
    );
    if (extra.length > 0) return undefined;
    let initial: { x: number; y: number } | undefined;
    for (const part of rest) {
      const condition = part.match(/^y\s*\(\s*(.+?)\s*\)\s*=\s*(.+)$/);
      const x = condition && constant(parseMath(condition[1]));
      const y = condition && constant(parseMath(condition[2]));
      if (x !== undefined && x !== null && y !== undefined && y !== null) {
        initial = { x, y };
      }
    }
    return { kind: "ode", rhs, initial };
  }

  // Derivatives.
  const symbolic =
    source.match(/^\\frac\{d\}\{d([a-z])\}\s*(.+)$/) ??
    source.match(/^d\/d([a-z])\s*(.+)$/);
  const worded = source.match(
    /^(?:the\s+)?(?:derivative|differentiate)(?:\s+of)?\s+(.+?)(?:\s+with respect to\s+([a-z]))?$/i,
  );
  if (symbolic || worded) {
    const variable = symbolic?.[1] ?? worded?.[2] ?? "x";
    const expr = parseMath((symbolic?.[2] ?? worded?.[1] ?? "").trim());
    return expr ? { kind: "derivative", expr, variable } : undefined;
  }

  // Integrals.
  const definite = source.match(
    /^\\int_(\{[^{}]*\}|\\infty|-?\\infty|[^\s{}\\^]+)\^(\{[^{}]*\}|\\infty|[^\s{}\\]+)\s*(.+)$/,
  );
  const plainIntegral = source.match(
    /^(?:the\s+)?(?:integral|integrate|antiderivative)(?:\s+of)?\s+(.+?)(?:\s+from\s+(.+?)\s+to\s+(.+))?$/i,
  );
  const indefinite = source.match(/^\\int\s*(.+)$/);
  if (definite || plainIntegral || indefinite) {
    const bodyText =
      definite?.[3] ?? plainIntegral?.[1] ?? indefinite?.[1] ?? "";
    const { body, variable } = stripDifferential(bodyText.trim());
    const expr = parseMath(body);
    if (!expr) return undefined;
    const lowText = definite?.[1] ?? plainIntegral?.[2];
    const highText = definite?.[2] ?? plainIntegral?.[3];
    let bounds: [MathNode, MathNode] | undefined;
    if (lowText && highText) {
      const low = parseMath(lowText.replace(/^\{|\}$/g, ""));
      const high = parseMath(highText.replace(/^\{|\}$/g, ""));
      if (
        !low ||
        !high ||
        constant(low) === undefined ||
        constant(high) === undefined
      ) {
        return undefined;
      }
      bounds = [low, high];
    }
    const name = variable ?? [...variablesOf(expr)][0] ?? "x";
    return { kind: "integral", expr, variable: name, bounds };
  }

  // Limits.
  const limit =
    source.match(
      /^\\lim_\{\s*([a-z])\s*(?:\\to|\\rightarrow|->|→)\s*(.+?)\}\s*(.+)$/,
    ) ??
    source.match(
      /^lim(?:it)?\s*_?\s*([a-z])\s*(?:->|→|\\to)\s*(\S+)\s+(.+)$/i,
    ) ??
    (() => {
      const words = source.match(
        /^(?:the\s+)?limit(?:\s+of)?\s+(.+?)\s+as\s+([a-z])\s*(?:->|→|\\to|approaches|goes to|tends to)\s*(.+)$/i,
      );
      return words ? [words[0], words[2], words[3], words[1]] : null;
    })();
  if (limit) {
    const point = parsePoint(limit[2]);
    const expr = parseMath(limit[3]);
    if (!point || !expr) return undefined;
    return {
      kind: "limit",
      expr,
      variable: limit[1],
      point: point.point,
      pointNode: point.node,
    };
  }

  // Equations and systems.
  const parts = splitTop(source, /^,|^;|^\\\\|^\band\b/);
  const equations = parts.filter((part) => equalsSplit(part));
  const constraints = parts.filter((part) => !equalsSplit(part));
  if (equations.length === 1) {
    const [leftText, rightText] = equalsSplit(equations[0]) as [string, string];
    const left = parseMath(leftText);
    const right = parseMath(rightText);
    if (!left || !right) return undefined;
    const variables = new Set([...variablesOf(left), ...variablesOf(right)]);
    if (variables.size !== 1) return undefined;
    const interval = constraints.map(parseInterval).find(Boolean);
    if (constraints.length > 0 && !interval) return undefined;
    return {
      kind: "equation",
      left,
      right,
      variable: [...variables][0],
      interval,
    };
  }
  if (equations.length >= 2) {
    const pairs = equations.map((part) => {
      const [leftText, rightText] = equalsSplit(part) as [string, string];
      return [parseMath(leftText), parseMath(rightText)] as const;
    });
    if (pairs.some(([left, right]) => !left || !right)) return undefined;
    const typed = pairs as Array<[MathNode, MathNode]>;
    const variables = [
      ...new Set(
        typed.flatMap(([l, r]) => [...variablesOf(l), ...variablesOf(r)]),
      ),
    ].sort();
    return { kind: "system", equations: typed, variables };
  }

  // A bare expression.
  if (parts.length !== 1) return undefined;
  const expr = parseMath(parts[0]);
  if (!expr) return undefined;
  const intent = /factor/.test(keywords)
    ? "factor"
    : /expand|multiply out/.test(keywords)
      ? "expand"
      : "simplify";
  return { kind: "expression", expr, intent };
}
