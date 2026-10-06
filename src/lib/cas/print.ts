// Converts parsed expressions (lib/math/evaluate) to Algebrite input and to
// display LaTeX, and reads Algebrite's output back into a tree.

import { type MathNode, parsePlain, toFraction } from "@/lib/math/evaluate";

export class Unprintable extends Error {}

const ALGEBRITE_FUNCTIONS: Record<string, string> = {
  sin: "sin",
  cos: "cos",
  tan: "tan",
  asin: "arcsin",
  acos: "arccos",
  atan: "arctan",
  arcsin: "arcsin",
  arccos: "arccos",
  arctan: "arctan",
  sinh: "sinh",
  cosh: "cosh",
  tanh: "tanh",
  log: "log",
  ln: "log",
  exp: "exp",
  sqrt: "sqrt",
  abs: "abs",
  Abs: "abs",
};

function numberText(value: number) {
  if (Number.isInteger(value)) return String(value);
  // Decimals become exact fractions so results stay exact: 0.5 is 1/2.
  const fraction = toFraction(value, 1_000_000);
  return fraction
    ? `(${fraction.numerator}/${fraction.denominator})`
    : String(value);
}

export function toAlgebrite(node: MathNode): string {
  switch (node.type) {
    case "num":
      return numberText(node.value);
    case "const":
      if (node.name === "pi") return "pi";
      if (node.name === "E") return "exp(1)";
      throw new Unprintable("infinity");
    case "var":
      return node.name === "e" ? "exp(1)" : node.name;
    case "neg":
      return `(-(${toAlgebrite(node.arg)}))`;
    case "fact":
      return `factorial(${toAlgebrite(node.arg)})`;
    case "call": {
      const arg = toAlgebrite(node.arg);
      if (node.name === "sec") return `(1/cos(${arg}))`;
      if (node.name === "csc") return `(1/sin(${arg}))`;
      if (node.name === "cot") return `(cos(${arg})/sin(${arg}))`;
      const name = ALGEBRITE_FUNCTIONS[node.name];
      if (!name) throw new Unprintable(node.name);
      return `${name}(${arg})`;
    }
    case "bin": {
      if (
        node.op === "^" &&
        ((node.left.type === "var" && node.left.name === "e") ||
          (node.left.type === "const" && node.left.name === "E"))
      ) {
        return `exp(${toAlgebrite(node.right)})`;
      }
      return `(${toAlgebrite(node.left)})${node.op}(${toAlgebrite(node.right)})`;
    }
  }
}

// Algebrite prints floats as "3.000000..." and vectors as "[a,b]".
export function parseAlgebrite(output: string): MathNode | undefined {
  const cleaned = output.replaceAll("...", "").trim();
  if (!cleaned || /^Stop|nil|\[/.test(cleaned)) return undefined;
  return parsePlain(cleaned);
}

// "[2,3]" or "[[1,2],[3,4]]" as rows of entries.
export function parseAlgebriteList(output: string): string[] | undefined {
  const trimmed = output.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return undefined;
  const inner = trimmed.slice(1, -1);
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index];
    if (char === "[" || char === "(") depth += 1;
    else if (char === "]" || char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      parts.push(inner.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(inner.slice(start).trim());
  return parts.filter(Boolean);
}

// ---------------------------------------------------------------- LaTeX

const LATEX_FUNCTIONS: Record<string, string> = {
  sin: "\\sin",
  cos: "\\cos",
  tan: "\\tan",
  sec: "\\sec",
  csc: "\\csc",
  cot: "\\cot",
  asin: "\\arcsin",
  acos: "\\arccos",
  atan: "\\arctan",
  arcsin: "\\arcsin",
  arccos: "\\arccos",
  arctan: "\\arctan",
  sinh: "\\sinh",
  cosh: "\\cosh",
  tanh: "\\tanh",
  log: "\\ln",
  ln: "\\ln",
};

type Product = { negative: boolean; top: MathNode[]; bottom: MathNode[] };

// Flattens a product or quotient into factors above and below the line,
// moving x^(-n) below it.
function flatten(node: MathNode, into: Product, bottom = false) {
  if (node.type === "neg") {
    into.negative = !into.negative;
    flatten(node.arg, into, bottom);
    return;
  }
  if (node.type === "bin" && node.op === "*") {
    flatten(node.left, into, bottom);
    flatten(node.right, into, bottom);
    return;
  }
  if (node.type === "bin" && node.op === "/") {
    flatten(node.left, into, bottom);
    flatten(node.right, into, !bottom);
    return;
  }
  if (
    node.type === "bin" &&
    node.op === "^" &&
    node.right.type === "neg" &&
    !(node.left.type === "var" && node.left.name === "e")
  ) {
    const exponent = node.right.arg;
    const positive =
      exponent.type === "num" && exponent.value === 1
        ? node.left
        : ({ type: "bin", op: "^", left: node.left, right: exponent } as const);
    flatten(positive, into, !bottom);
    return;
  }
  if (node.type === "num" && node.value < 0) {
    into.negative = !into.negative;
    (bottom ? into.bottom : into.top).push({ type: "num", value: -node.value });
    return;
  }
  (bottom ? into.bottom : into.top).push(node);
}

function isAtom(node: MathNode) {
  return (
    node.type === "num" ||
    node.type === "var" ||
    node.type === "const" ||
    node.type === "call"
  );
}

function joinFactors(factors: MathNode[], alone = false): string {
  const numbers = factors.filter((factor) => factor.type === "num");
  const others = factors.filter((factor) => factor.type !== "num");
  const coefficient = numbers.reduce(
    (product, factor) => product * (factor as { value: number }).value,
    1,
  );
  const parts: string[] = [];
  if (coefficient !== 1 || others.length === 0) {
    parts.push(formatCoefficient(coefficient));
  }
  for (const factor of others) {
    const text = latex(factor);
    // A sum alone above or below a fraction bar needs no brackets.
    const needsParens =
      !(alone && factors.length === 1) &&
      factor.type === "bin" &&
      (factor.op === "+" || factor.op === "-");
    parts.push(needsParens ? `\\left(${text}\\right)` : text);
  }
  return parts.reduce((joined, part, index) => {
    if (index === 0) return part;
    // A digit after a digit needs an explicit dot: 2 \cdot 3.
    return /\d$/.test(joined) && /^\d/.test(part)
      ? `${joined} \\cdot ${part}`
      : `${joined} ${part}`;
  }, "");
}

function formatCoefficient(value: number) {
  if (Number.isInteger(value)) return String(value);
  const fraction = toFraction(value);
  if (fraction) return `\\frac{${fraction.numerator}}{${fraction.denominator}}`;
  return String(Number(value.toPrecision(10)));
}

function productLatex(node: MathNode): string {
  const product: Product = { negative: false, top: [], bottom: [] };
  flatten(node, product);
  const sign = product.negative ? "-" : "";
  if (product.bottom.length === 0) return sign + joinFactors(product.top);

  const top = product.top.length ? joinFactors(product.top, true) : "1";
  const bottom = joinFactors(product.bottom, true);
  return `${sign}\\frac{${top}}{${bottom}}`;
}

function powerLatex(base: MathNode, exponent: MathNode): string {
  if (base.type === "var" && base.name === "e") return `e^{${latex(exponent)}}`;
  if (base.type === "const" && base.name === "E") {
    return `e^{${latex(exponent)}}`;
  }
  // x^(1/2) is a square root, x^(1/n) an nth root.
  if (
    exponent.type === "bin" &&
    exponent.op === "/" &&
    exponent.left.type === "num" &&
    exponent.right.type === "num"
  ) {
    const { value: p } = exponent.left;
    const { value: q } = exponent.right;
    const radicand = latex(base);
    if (p === 1)
      return q === 2 ? `\\sqrt{${radicand}}` : `\\sqrt[${q}]{${radicand}}`;
    if (q === 2) return `\\sqrt{${radicand}}^{${p}}`;
  }
  if (
    base.type === "call" &&
    exponent.type === "num" &&
    Number.isInteger(exponent.value) &&
    exponent.value > 0 &&
    LATEX_FUNCTIONS[base.name]
  ) {
    return `${LATEX_FUNCTIONS[base.name]}^{${exponent.value}}${callArgument(base.arg)}`;
  }
  const baseText =
    isAtom(base) && base.type !== "call"
      ? latex(base)
      : `\\left(${latex(base)}\\right)`;
  return `${baseText}^{${latex(exponent)}}`;
}

function callArgument(arg: MathNode) {
  const text = latex(arg);
  return arg.type === "var" || (arg.type === "num" && arg.value >= 0)
    ? ` ${text}`
    : `\\left(${text}\\right)`;
}

export function latex(node: MathNode): string {
  switch (node.type) {
    case "num":
      return node.value < 0
        ? `-${formatCoefficient(-node.value)}`
        : formatCoefficient(node.value);
    case "const":
      return node.name === "pi" ? "\\pi" : node.name === "E" ? "e" : "\\infty";
    case "var":
      return node.name;
    case "fact":
      return isAtom(node.arg)
        ? `${latex(node.arg)}!`
        : `\\left(${latex(node.arg)}\\right)!`;
    case "neg":
    case "bin":
      if (node.type === "bin" && (node.op === "+" || node.op === "-")) {
        const left = latex(node.left);
        let right = latex(node.right);
        let op = node.op;
        if (right.startsWith("-")) {
          op = op === "+" ? "-" : "+";
          right = right.slice(1);
        } else if (
          node.op === "-" &&
          node.right.type === "bin" &&
          (node.right.op === "+" || node.right.op === "-")
        ) {
          right = `\\left(${right}\\right)`;
        }
        return `${left} ${op} ${right}`;
      }
      if (node.type === "bin" && node.op === "^") {
        return powerLatex(node.left, node.right);
      }
      if (
        node.type === "neg" &&
        node.arg.type === "bin" &&
        (node.arg.op === "+" || node.arg.op === "-")
      ) {
        return `-\\left(${latex(node.arg)}\\right)`;
      }
      return productLatex(node);
    case "call": {
      if (node.name === "sqrt") return `\\sqrt{${latex(node.arg)}}`;
      if (node.name === "abs" || node.name === "Abs") {
        return `\\left|${latex(node.arg)}\\right|`;
      }
      if (node.name === "exp") return `e^{${latex(node.arg)}}`;
      const name = LATEX_FUNCTIONS[node.name] ?? `\\operatorname{${node.name}}`;
      return `${name}${callArgument(node.arg)}`;
    }
  }
}

// Algebrite output straight to LaTeX; falls back to the raw text.
export function algebriteToLatex(output: string): string {
  const tree = parseAlgebrite(output);
  return tree ? latex(tree) : output;
}
