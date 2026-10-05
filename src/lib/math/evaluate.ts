// A small, dependency-free evaluator for instant answers and graphing. It
// reads plain calculator input ("3/4 + 5/6", "2sin(x)^2", "sqrt(2)") and the
// SymPy-style text produced by latexToSympy ("x**(2)log(x)"), with implicit
// multiplication, and compiles it to a JavaScript function of its variables.
// Anything it does not understand returns undefined rather than a guess.

import { latexToSympy } from "@/lib/verify/latexToSympy";

type Node =
  | { type: "num"; value: number }
  | { type: "var"; name: string }
  | { type: "neg"; arg: Node }
  | { type: "bin"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { type: "call"; name: string; arg: Node }
  | { type: "fact"; arg: Node };

type Token =
  | { kind: "num"; value: number }
  | { kind: "name"; value: string }
  | { kind: "func"; value: string }
  | { kind: "op"; value: string };

const FUNCTIONS: Record<string, (value: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sec: (v) => 1 / Math.cos(v),
  csc: (v) => 1 / Math.sin(v),
  cot: (v) => 1 / Math.tan(v),
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  arcsin: Math.asin,
  arccos: Math.acos,
  arctan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  log: Math.log,
  ln: Math.log,
  exp: Math.exp,
  sqrt: Math.sqrt,
  abs: Math.abs,
  Abs: Math.abs,
};

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  π: Math.PI,
  E: Math.E,
  e: Math.E,
  oo: Infinity,
};

// Longest names first so "sinh" wins over "sin" and "asin" over "a".
const NAMES = [...Object.keys(FUNCTIONS), "pi"].sort(
  (left, right) => right.length - left.length,
);

class ParseError extends Error {}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      const match = source.slice(index).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/);
      if (!match) throw new ParseError(`bad number at ${index}`);
      tokens.push({ kind: "num", value: Number(match[0]) });
      index += match[0].length;
      continue;
    }

    if (char === "√") {
      tokens.push({ kind: "func", value: "sqrt" });
      index += 1;
      continue;
    }

    if (char === "π") {
      tokens.push({ kind: "name", value: "pi" });
      index += 1;
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      const rest = source.slice(index);
      const known = NAMES.find((name) => rest.startsWith(name));
      if (known) {
        tokens.push({
          kind: known in FUNCTIONS ? "func" : "name",
          value: known,
        });
        index += known.length;
      } else if (rest.startsWith("oo")) {
        tokens.push({ kind: "name", value: "oo" });
        index += 2;
      } else {
        // Single letters: "xy" is x times y, as in SymPy's implicit parsing.
        tokens.push({ kind: "name", value: char });
        index += 1;
      }
      continue;
    }

    if (source.startsWith("**", index)) {
      tokens.push({ kind: "op", value: "^" });
      index += 2;
      continue;
    }

    if ("+-*/^()!".includes(char)) {
      tokens.push({ kind: "op", value: char });
      index += 1;
      continue;
    }

    if (char === "×" || char === "·") {
      tokens.push({ kind: "op", value: "*" });
      index += 1;
      continue;
    }

    if (char === "÷") {
      tokens.push({ kind: "op", value: "/" });
      index += 1;
      continue;
    }

    if (char === "−") {
      tokens.push({ kind: "op", value: "-" });
      index += 1;
      continue;
    }

    throw new ParseError(`unexpected ${char}`);
  }

  return tokens;
}

function parse(tokens: Token[]): Node {
  let position = 0;
  const peek = () => tokens[position];
  const isOp = (value: string) => {
    const token = peek();
    return token?.kind === "op" && token.value === value;
  };
  const expect = (value: string) => {
    if (!isOp(value)) throw new ParseError(`expected ${value}`);
    position += 1;
  };

  // A token that can start a factor, for implicit multiplication.
  const startsFactor = () => {
    const token = peek();
    if (!token) return false;
    return token.kind !== "op" || token.value === "(";
  };

  const expression = (): Node => {
    let node = term();
    while (isOp("+") || isOp("-")) {
      const op = (peek() as { value: "+" | "-" }).value;
      position += 1;
      node = { type: "bin", op, left: node, right: term() };
    }
    return node;
  };

  const term = (): Node => {
    let node = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = (peek() as { value: "*" | "/" }).value;
        position += 1;
        node = { type: "bin", op, left: node, right: unary() };
      } else if (startsFactor()) {
        node = { type: "bin", op: "*", left: node, right: power() };
      } else {
        return node;
      }
    }
  };

  const unary = (): Node => {
    if (isOp("-")) {
      position += 1;
      return { type: "neg", arg: unary() };
    }
    if (isOp("+")) {
      position += 1;
      return unary();
    }
    return power();
  };

  const power = (): Node => {
    let base = postfix();
    if (isOp("^")) {
      position += 1;
      base = { type: "bin", op: "^", left: base, right: unary() };
    }
    return base;
  };

  const postfix = (): Node => {
    let node = atom();
    while (isOp("!")) {
      position += 1;
      node = { type: "fact", arg: node };
    }
    return node;
  };

  const atom = (): Node => {
    const token = peek();
    if (!token) throw new ParseError("unexpected end");
    position += 1;

    if (token.kind === "num") return { type: "num", value: token.value };
    if (token.kind === "name") {
      return token.value in CONSTANTS && token.value !== "e"
        ? { type: "num", value: CONSTANTS[token.value] }
        : { type: "var", name: token.value };
    }
    if (token.kind === "func") {
      // "sin^2(x)" is sin(x)^2; "sin x" takes the next factor.
      let exponent: Node | undefined;
      if (isOp("^")) {
        position += 1;
        exponent = unary();
      }
      const arg = isOp("(") ? atom() : power();
      const call: Node = { type: "call", name: token.value, arg };
      return exponent
        ? { type: "bin", op: "^", left: call, right: exponent }
        : call;
    }
    if (token.value === "(") {
      const inner = expression();
      expect(")");
      return inner;
    }
    throw new ParseError(`unexpected ${token.value}`);
  };

  const tree = expression();
  if (position < tokens.length) throw new ParseError("trailing input");
  return tree;
}

function factorial(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 170) return NaN;
  let result = 1;
  for (let k = 2; k <= value; k += 1) result *= k;
  return result;
}

function evaluateNode(node: Node, scope: Record<string, number>): number {
  switch (node.type) {
    case "num":
      return node.value;
    case "var":
      if (node.name in scope) return scope[node.name];
      // "e" is Euler's number unless it is the variable.
      if (node.name === "e") return Math.E;
      return NaN;
    case "neg":
      return -evaluateNode(node.arg, scope);
    case "fact":
      return factorial(evaluateNode(node.arg, scope));
    case "call":
      return FUNCTIONS[node.name](evaluateNode(node.arg, scope));
    case "bin": {
      const left = evaluateNode(node.left, scope);
      const right = evaluateNode(node.right, scope);
      switch (node.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "^":
          // Real odd roots of negatives: (-8)^(1/3) = -2.
          if (left < 0 && !Number.isInteger(right)) {
            const inverse = 1 / right;
            if (Number.isInteger(inverse) && Math.abs(inverse) % 2 === 1) {
              return -Math.pow(-left, right);
            }
          }
          return Math.pow(left, right);
      }
    }
  }
}

function variablesOf(node: Node, found = new Set<string>()): Set<string> {
  if (node.type === "var" && node.name !== "e") found.add(node.name);
  if (node.type === "neg" || node.type === "call" || node.type === "fact") {
    variablesOf(node.arg, found);
  }
  if (node.type === "bin") {
    variablesOf(node.left, found);
    variablesOf(node.right, found);
  }
  return found;
}

export type Compiled = {
  variables: string[];
  evaluate: (scope?: Record<string, number>) => number;
};

// Compiles plain or SymPy-style input.
export function compilePlain(source: string): Compiled | undefined {
  const trimmed = source.trim();
  if (!trimmed) return undefined;
  try {
    const tree = parse(tokenize(trimmed));
    return {
      variables: [...variablesOf(tree)].sort(),
      evaluate: (scope = {}) => evaluateNode(tree, scope),
    };
  } catch (error) {
    if (error instanceof ParseError) return undefined;
    throw error;
  }
}

// Compiles LaTeX or plain input. LaTeX goes through latexToSympy first, so
// fractions, roots and trig in either notation work.
export function compileMath(source: string): Compiled | undefined {
  const trimmed = source
    .trim()
    .replace(/^\$+|\$+$/g, "")
    .trim();
  if (!trimmed) return undefined;
  if (/[\\{}]/.test(trimmed)) {
    const sympy = latexToSympy(trimmed);
    return sympy ? compilePlain(sympy) : undefined;
  }
  return compilePlain(trimmed);
}

// Splits "y = x^2", "f(x) = x^2" and "x^2" into the expression to graph.
export function graphExpression(source: string): string {
  return source
    .trim()
    .replace(/^(?:y|[a-zA-Z]\s*\(\s*[a-z]\s*\))\s*=\s*/, "")
    .trim();
}

// Best fraction within tolerance, by continued fractions.
export function toFraction(
  value: number,
  maxDenominator = 10_000,
): { numerator: number; denominator: number } | undefined {
  if (!Number.isFinite(value)) return undefined;
  const sign = value < 0 ? -1 : 1;
  let x = Math.abs(value);
  let [h0, h1, k0, k1] = [0, 1, 1, 0];
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const a = Math.floor(x);
    [h0, h1] = [h1, a * h1 + h0];
    [k0, k1] = [k1, a * k1 + k0];
    if (k1 > maxDenominator) return undefined;
    if (
      Math.abs(h1 / k1 - Math.abs(value)) <=
      1e-12 * Math.max(1, Math.abs(value))
    ) {
      return { numerator: sign * h1, denominator: k1 };
    }
    const fraction = x - a;
    if (fraction < 1e-15) break;
    x = 1 / fraction;
  }
  return Math.abs(h1 / k1 - Math.abs(value)) <= 1e-12
    ? { numerator: sign * h1, denominator: k1 }
    : undefined;
}

export function formatNumber(value: number) {
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  if (Math.abs(value) >= 1e10 || Math.abs(value) < 1e-6) {
    return value.toExponential(6).replace(/\.?0+e/, "e");
  }
  return String(Number(value.toPrecision(10)));
}

export type InstantAnswer = { latex: string; approximate: boolean };

// Evaluates input that has no variables and no equals sign, the way a
// calculator would: exact as a fraction when it is one, otherwise a decimal.
export function instantAnswer(source: string): InstantAnswer | undefined {
  if (/[=<>]|\\(?:le|ge|lt|gt|int|lim|sum|prod|frac\{d\}|text)/.test(source)) {
    return undefined;
  }
  // A bare number is not worth answering.
  if (/^\s*-?\d+(\.\d+)?\s*$/.test(source)) return undefined;

  const compiled = compileMath(source);
  if (!compiled || compiled.variables.length > 0) return undefined;
  const value = compiled.evaluate();
  if (!Number.isFinite(value)) return undefined;

  const fraction = toFraction(value);
  if (fraction && fraction.denominator === 1) {
    return { latex: String(fraction.numerator), approximate: false };
  }
  // Show a fraction only when the input itself was rational arithmetic.
  const rationalInput = !/[a-zA-Z\\π√]/.test(
    source.replace(/\\frac|\\cdot|\\times|\\div|\\left|\\right/g, ""),
  );
  if (fraction && rationalInput) {
    const { numerator, denominator } = fraction;
    const sign = numerator < 0 ? "-" : "";
    return {
      latex: `${sign}\\frac{${Math.abs(numerator)}}{${denominator}} \\approx ${formatNumber(value)}`,
      approximate: false,
    };
  }
  return { latex: `\\approx ${formatNumber(value)}`, approximate: true };
}
