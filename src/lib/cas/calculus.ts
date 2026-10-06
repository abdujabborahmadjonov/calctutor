// Derivatives, integrals and limits with worked steps.

import type { Solution, Step } from "@/lib/ai/schemas";
import { evaluateNode, type MathNode } from "@/lib/math/evaluate";

import { algNode, depends, solved, step, tex, Unsolved } from "./build";
import { nerdamerLimit } from "./engine";
import { close, exactLatex, fnOf, integrate, isDerivative } from "./numeric";
import { parseAlgebrite, toAlgebrite } from "./print";

const d = (node: MathNode, x: string) => algNode((a) => `d(${a},${x})`, node);
const antiderivative = (node: MathNode, x: string) =>
  algNode((a) => `integral(${a},${x})`, node);

function terms(
  node: MathNode,
  sign = 1,
): Array<{ node: MathNode; sign: number }> {
  if (node.type === "bin" && (node.op === "+" || node.op === "-")) {
    return [
      ...terms(node.left, sign),
      ...terms(node.right, node.op === "-" ? -sign : sign),
    ];
  }
  return [{ node, sign }];
}

function factors(node: MathNode): MathNode[] {
  if (node.type === "bin" && node.op === "*") {
    return [...factors(node.left), ...factors(node.right)];
  }
  return [node];
}

function product(nodes: MathNode[]): MathNode {
  return nodes.reduce((left, right) => ({ type: "bin", op: "*", left, right }));
}

const wrap = (text: string) => `\\left(${text}\\right)`;
const dd = (x: string) => `\\frac{d}{d${x}}`;

// The derivative rule a single factor needs, by its outermost form.
export function ruleName(node: MathNode, x: string): string {
  if (!depends(node, x)) return "Constant rule";
  if (node.type === "var") return "Power rule";
  if (node.type === "neg") return ruleName(node.arg, x);
  if (node.type === "bin") {
    if (node.op === "+" || node.op === "-") return "Sum and difference rules";
    if (node.op === "*") {
      const dependent = factors(node).filter((factor) => depends(factor, x));
      return dependent.length > 1 ? "Product rule" : "Constant multiple rule";
    }
    if (node.op === "/") {
      return depends(node.right, x)
        ? "Quotient rule"
        : "Constant multiple rule";
    }
    if (node.op === "^") {
      if (depends(node.right, x)) {
        return depends(node.left, x)
          ? "Logarithmic differentiation"
          : "Exponential rule with the chain rule";
      }
      return node.left.type === "var"
        ? "Power rule"
        : "Chain rule with the power rule";
    }
  }
  if (node.type === "call") {
    return node.arg.type === "var"
      ? derivativeOfFunction(node.name)
      : "Chain rule";
  }
  return "Standard derivatives";
}

function derivativeOfFunction(name: string) {
  if (["sin", "cos", "tan", "sec", "csc", "cot"].includes(name)) {
    return "Derivatives of trigonometric functions";
  }
  if (["log", "ln"].includes(name))
    return "Derivative of the natural logarithm";
  if (name === "exp") return "Derivative of the exponential function";
  if (["asin", "acos", "atan", "arcsin", "arccos", "arctan"].includes(name)) {
    return "Derivatives of inverse trigonometric functions";
  }
  if (name === "sqrt") return "Power rule";
  return "Standard derivatives";
}

// Algebrite's derivative is correct but not always tidy; keep the shorter
// of it and its simplified form.
function tidy(node: MathNode): MathNode {
  try {
    const simpler = algNode((e) => `simplify(${e})`, node);
    return tex(simpler).length < tex(node).length ? simpler : node;
  } catch {
    return node;
  }
}

export function solveDerivative(expr: MathNode, x: string): Solution {
  const result = tidy(d(expr, x));
  const f = fnOf(expr, x);
  const fPrime = fnOf(result, x);
  if (!isDerivative(f, fPrime)) throw new Unsolved("derivative check failed");

  const problem = `${dd(x)}${wrap(tex(expr))}`;
  const rule = ruleName(expr, x);
  const steps: Step[] = [
    step(
      "Identify the outer structure",
      rule,
      problem,
      `Look at the last operation in the expression: it decides the first rule. Here that is the ${rule.toLowerCase()}.`,
    ),
  ];

  const parts = terms(expr);
  if (parts.length > 1) {
    const pieces = parts.map(({ node, sign }) => ({
      node,
      sign,
      derivative: d(node, x),
    }));
    steps.push(
      step(
        "Differentiate term by term",
        "Sum and difference rules",
        `${problem} = ${pieces
          .map(
            ({ node, sign }, index) =>
              `${index === 0 ? (sign < 0 ? "-" : "") : sign < 0 ? " - " : " + "}${dd(x)}${wrap(tex(node))}`,
          )
          .join("")}`,
        "The derivative of a sum is the sum of the derivatives, so each term can be handled on its own.",
      ),
      step(
        "Differentiate each term",
        [...new Set(pieces.map(({ node }) => ruleName(node, x)))].join("; "),
        `= ${pieces
          .map(({ derivative, sign }, index) => {
            const text = tex(derivative);
            const signed = sign < 0 ? `-${wrap(text)}` : text;
            return index === 0
              ? signed
              : signed.startsWith("-")
                ? ` ${signed}`
                : ` + ${signed}`;
          })
          .join("")}`,
        pieces
          .map(
            ({ node, derivative }) =>
              `$${tex(node)}$ becomes $${tex(derivative)}$ (${ruleName(node, x).toLowerCase()}).`,
          )
          .join(" "),
      ),
    );
  } else if (
    expr.type === "bin" &&
    expr.op === "*" &&
    rule === "Product rule"
  ) {
    const all = factors(expr);
    const first = all.findIndex((factor) => depends(factor, x));
    const u = product(all.slice(0, first + 1));
    const v = product(all.slice(first + 1));
    const du = d(u, x);
    const dv = d(v, x);
    steps.push(
      step(
        "Name the two factors",
        "Product rule",
        `u = ${tex(u)}, \\qquad v = ${tex(v)}`,
        "The product rule needs each factor and its derivative: $(uv)' = u'v + uv'$.",
      ),
      step(
        "Differentiate each factor",
        [...new Set([ruleName(u, x), ruleName(v, x)])].join("; "),
        `u' = ${tex(du)}, \\qquad v' = ${tex(dv)}`,
        "Differentiate the two factors separately; the chain rule applies inside any function of something other than the plain variable.",
        "Forgetting the inner derivative when a factor such as $\\sin(3x)$ has an inside function.",
      ),
      step(
        "Assemble u′v + uv′",
        "Product rule",
        `${wrap(tex(du))}${wrap(tex(v))} + ${wrap(tex(u))}${wrap(tex(dv))}`,
        "Multiply each derivative by the other, original factor and add.",
        "Multiplying the two derivatives, $u'v'$, which is not the product rule.",
      ),
    );
  } else if (
    expr.type === "bin" &&
    expr.op === "/" &&
    rule === "Quotient rule"
  ) {
    const u = expr.left;
    const v = expr.right;
    const du = d(u, x);
    const dv = d(v, x);
    steps.push(
      step(
        "Name the numerator and denominator",
        "Quotient rule",
        `u = ${tex(u)}, \\qquad v = ${tex(v)}`,
        "The quotient rule is $\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}$.",
      ),
      step(
        "Differentiate each part",
        [...new Set([ruleName(u, x), ruleName(v, x)])].join("; "),
        `u' = ${tex(du)}, \\qquad v' = ${tex(dv)}`,
        "Differentiate the top and the bottom separately.",
      ),
      step(
        "Assemble (u′v − uv′)/v²",
        "Quotient rule",
        `\\frac{${wrap(tex(du))}${wrap(tex(v))} - ${wrap(tex(u))}${wrap(tex(dv))}}{${wrap(tex(v))}^{2}}`,
        "The order in the numerator matters: the derivative of the top comes first.",
        "Reversing the numerator to $uv' - u'v$, which flips the sign.",
      ),
    );
  } else if (
    (expr.type === "call" && expr.arg.type !== "var" && depends(expr.arg, x)) ||
    (expr.type === "bin" &&
      expr.op === "^" &&
      expr.left.type !== "var" &&
      depends(expr.left, x) &&
      !depends(expr.right, x))
  ) {
    const inner =
      expr.type === "call" ? expr.arg : (expr as { left: MathNode }).left;
    const innerPrime = d(inner, x);
    steps.push(
      step(
        "Name the inside function",
        "Chain rule",
        `u = ${tex(inner)}, \\qquad \\frac{du}{d${x}} = ${tex(innerPrime)}`,
        "The chain rule differentiates the outside function at $u$, then multiplies by the derivative of the inside.",
        "Forgetting to multiply by the derivative of the inside function.",
      ),
    );
  }

  steps.push(
    step(
      "Simplify",
      "Algebraic simplification",
      `${problem} = ${tex(result)}`,
      "Collect the pieces into the final derivative.",
    ),
  );

  return solved({
    restated: problem,
    topic: "calculus.derivatives",
    type: `Derivative (${rule.toLowerCase()})`,
    method: rule,
    why: `The expression's outermost operation is handled by the ${rule.toLowerCase()}, so that rule comes first and the simpler rules finish the inside.`,
    alternatives:
      "You could also expand or simplify first when that removes a product or quotient; the derivative is the same.",
    steps,
    answer: tex(result),
    plain: `The derivative is $${tex(result)}$.`,
    checkMethod: "Numerical differentiation",
    checkDetail: `A central-difference estimate of the derivative matches the answer at ${9} sample points.`,
    hints: [
      "What is the last operation performed in the expression?",
      `Use the ${rule.toLowerCase()}.`,
      steps[1]?.latex
        ? `Start with: $${steps[1].latex}$`
        : `The first move gives $${tex(result)}$ after simplifying.`,
    ],
  });
}

// ------------------------------------------------------------- integrals

const TRANSCENDENTAL = new Set([
  "exp",
  "sin",
  "cos",
  "log",
  "ln",
  "atan",
  "arctan",
  "asin",
  "arcsin",
]);

function isPolynomialIn(node: MathNode, x: string): boolean {
  if (!depends(node, x)) return true;
  if (node.type === "var") return true;
  if (node.type === "neg") return isPolynomialIn(node.arg, x);
  if (node.type === "bin") {
    if (node.op === "^") {
      return (
        node.left.type === "var" &&
        node.right.type === "num" &&
        Number.isInteger(node.right.value) &&
        node.right.value > 0
      );
    }
    if (node.op === "/")
      return isPolynomialIn(node.left, x) && !depends(node.right, x);
    return isPolynomialIn(node.left, x) && isPolynomialIn(node.right, x);
  }
  return false;
}

function transcendentalKind(node: MathNode): string | undefined {
  if (node.type === "call" && TRANSCENDENTAL.has(node.name)) return node.name;
  if (
    node.type === "bin" &&
    node.op === "^" &&
    node.left.type === "var" &&
    node.left.name === "e"
  ) {
    return "exp";
  }
  return undefined;
}

function integrationByParts(expr: MathNode, x: string) {
  const all = factors(expr);
  if (all.length !== 2) return undefined;
  const [a, b] = all;
  const kindA = transcendentalKind(a);
  const kindB = transcendentalKind(b);
  const poly = kindA ? b : a;
  const other = kindA ? a : b;
  const kind = kindA ?? kindB;
  if (!kind || !isPolynomialIn(poly, x) || !depends(poly, x)) return undefined;
  // LIATE: logarithms and inverse trig are better as u; otherwise the
  // polynomial is u because differentiating lowers its degree.
  const logLike = ["log", "ln", "atan", "arctan", "asin", "arcsin"].includes(
    kind,
  );
  const u = logLike ? other : poly;
  const dv = logLike ? poly : other;
  return { u, dv };
}

export function solveIntegral(
  expr: MathNode,
  x: string,
  bounds?: [MathNode, MathNode],
): Solution {
  const F = antiderivative(expr, x);
  const f = fnOf(expr, x);
  const big = fnOf(F, x);
  if (!isDerivative(big, f)) throw new Unsolved("antiderivative check failed");

  const integrandTex = tex(expr);
  const steps: Step[] = [];
  let method = "Standard antiderivatives";
  let why =
    "The integrand matches a standard antiderivative directly, so no substitution or splitting is needed.";

  const parts = terms(expr);
  const parts2 = parts.length === 1 ? integrationByParts(expr, x) : undefined;

  if (parts.length > 1) {
    method = "Linearity of the integral";
    why =
      "The integral of a sum is the sum of the integrals, so each term is integrated with its own standard rule.";
    const pieces = parts.map(({ node, sign }) => ({
      node,
      sign,
      F: antiderivative(node, x),
    }));
    steps.push(
      step(
        "Split the integral term by term",
        "Linearity of the integral",
        `\\int ${integrandTex}\\,d${x} = ${pieces
          .map(
            ({ node, sign }, index) =>
              `${index === 0 ? (sign < 0 ? "-" : "") : sign < 0 ? " - " : " + "}\\int ${tex(node)}\\,d${x}`,
          )
          .join("")}`,
        "Constants factor out and sums split, so each term is a smaller, standard integral.",
      ),
      step(
        "Integrate each term",
        "Power rule for integrals and standard antiderivatives",
        pieces
          .map(
            ({ node, F: piece }) =>
              `\\int ${tex(node)}\\,d${x} = ${tex(piece)}`,
          )
          .join(", \\quad "),
        "For $x^n$ with $n \\ne -1$ the antiderivative is $\\frac{x^{n+1}}{n+1}$; the other terms use the table of standard antiderivatives.",
        "Using the power rule on $x^{-1}$, which instead integrates to $\\ln|x|$.",
      ),
    );
  } else if (parts2) {
    method = "Integration by parts";
    why = `The integrand is a product of a polynomial and a ${parts2.u === parts2.dv ? "" : "transcendental "}function. Choosing $u = ${tex(parts2.u)}$ (LIATE order) makes $\\int v\\,du$ simpler than the original.`;
    const du = d(parts2.u, x);
    const v = antiderivative(parts2.dv, x);
    const vdu: MathNode = { type: "bin", op: "*", left: v, right: du };
    const rest = antiderivative(vdu, x);
    steps.push(
      step(
        "Choose u and dv",
        "Integration by parts (LIATE)",
        `u = ${tex(parts2.u)}, \\qquad dv = ${tex(parts2.dv)}\\,d${x}`,
        "LIATE (logarithmic, inverse trig, algebraic, trigonometric, exponential) suggests which factor to differentiate: pick the one earlier in the list as $u$.",
        "Choosing $u$ as the exponential or trig factor, which makes the new integral harder.",
      ),
      step(
        "Find du and v",
        "Differentiate u; integrate dv",
        `du = ${tex(du)}\\,d${x}, \\qquad v = ${tex(v)}`,
        "Differentiate $u$ and integrate $dv$. Any antiderivative works for $v$, so leave out the constant.",
      ),
      step(
        "Apply the parts formula",
        "Integration by parts",
        `\\int u\\,dv = uv - \\int v\\,du = ${wrap(tex(parts2.u))}${wrap(tex(v))} - \\int ${tex(vdu)}\\,d${x}`,
        "The formula comes from the product rule: $\\int u\\,dv = uv - \\int v\\,du$.",
        "Dropping the minus sign in front of the remaining integral.",
      ),
      step(
        "Evaluate the remaining integral",
        "Standard antiderivatives",
        `\\int ${tex(vdu)}\\,d${x} = ${tex(rest)}`,
        "The new integral is simpler than the original, which is the point of choosing $u$ well.",
      ),
    );
  } else if (
    expr.type === "call" &&
    depends(expr.arg, x) &&
    expr.arg.type !== "var"
  ) {
    const inner = expr.arg;
    const du = d(inner, x);
    if (!depends(du, x)) {
      method = "Substitution";
      why =
        "The function's inside is linear, so $u = " +
        tex(inner) +
        "$ turns it into a standard integral with a constant factor.";
      steps.push(
        step(
          "Substitute for the inside",
          "u-substitution",
          `u = ${tex(inner)}, \\qquad du = ${tex(du)}\\,d${x}`,
          "Replacing the inside function by $u$ leaves a standard integral; $dx$ becomes $du$ divided by the constant.",
          "Forgetting to divide by the constant from $du$.",
        ),
      );
    }
  }

  const withC = `${tex(F)} + C`;
  if (!bounds) {
    steps.push(
      step(
        "Write the antiderivative with + C",
        "Indefinite integral",
        `\\int ${integrandTex}\\,d${x} = ${withC}`,
        "Every antiderivative differs from this one by a constant, so the general answer adds $+ C$.",
        "Leaving out $+ C$ on an indefinite integral.",
      ),
    );
    const notes = /log/.test(toAlgebrite(F))
      ? "Where a logarithm appears, the result holds where its argument is positive; for negative arguments use the absolute value."
      : "";
    return solved({
      restated: `\\int ${integrandTex}\\,d${x}`,
      topic: "calculus.integrals",
      type: `Indefinite integral (${method.toLowerCase()})`,
      method,
      why,
      alternatives:
        method === "Integration by parts"
          ? "A tabular (DI) method gives the same result faster when the polynomial has a high degree."
          : "Substitution or a table of integrals also works; differentiating the answer checks it.",
      steps:
        steps.length > 0
          ? [
              step(
                "Identify the integrand's form",
                method,
                `\\int ${integrandTex}\\,d${x}`,
                why,
              ),
              ...steps,
            ]
          : steps,
      answer: withC,
      plain: `The antiderivative is $${tex(F)}$ plus a constant $C$.`,
      notes,
      checkMethod: "Differentiation",
      checkDetail:
        "Differentiating the answer numerically gives back the integrand at every sample point.",
      hints: [
        "Look at the integrand: is it a sum, a product, or a function of something inside?",
        `Use ${method.toLowerCase()}.`,
        steps[0]
          ? `Start with: $${steps[0].latex}$`
          : `Antiderivative: $${tex(F)}$ (+ C).`,
      ],
    });
  }

  // Definite integral: FTC part 2.
  const [low, high] = bounds;
  const a = evaluateNode(low, {});
  const b = evaluateNode(high, {});
  const subst = (point: MathNode) =>
    algNode((value, body) => `subst(${value},${x},${body})`, point, F);
  const Fb = subst(high);
  const Fa = subst(low);
  const value = algNode((top, bottom) => `(${top})-(${bottom})`, Fb, Fa);
  const numeric = integrate(f, a, b);
  const exact = evaluateNode(value, {});
  if (!Number.isFinite(exact) || !close(exact, numeric, 1e-6)) {
    throw new Unsolved("definite integral check failed");
  }
  const restated = `\\int_{${tex(low)}}^{${tex(high)}} ${integrandTex}\\,d${x}`;
  steps.push(
    step(
      "Find an antiderivative",
      method,
      `F(${x}) = ${tex(F)}`,
      "For a definite integral any antiderivative works, so the constant is left out.",
    ),
    step(
      "Evaluate at the bounds",
      "Fundamental Theorem of Calculus, Part 2",
      `${restated} = F(${tex(high)}) - F(${tex(low)}) = ${wrap(tex(Fb))} - ${wrap(tex(Fa))}`,
      "Subtract the value at the lower bound from the value at the upper bound.",
      "Subtracting in the wrong order, $F(a) - F(b)$.",
    ),
    step(
      "Simplify",
      "Arithmetic",
      `= ${tex(value)} \\approx ${Number(exact.toPrecision(8))}`,
      "Combine the two values into an exact number, with a decimal for reference.",
    ),
  );
  return solved({
    restated,
    topic: "calculus.definite-integrals",
    type: "Definite integral",
    method: `${method} and the Fundamental Theorem of Calculus`,
    why: `${why} Then the Fundamental Theorem of Calculus turns the antiderivative into the exact area.`,
    alternatives:
      "A Riemann sum or Simpson's rule approximates the same value numerically.",
    steps: [
      step("Identify the integrand's form", method, restated, why),
      ...steps,
    ],
    answer: tex(value),
    plain: `The integral equals $${tex(value)}$, about ${Number(exact.toPrecision(6))}.`,
    checkMethod: "Numerical integration",
    checkDetail: `Simpson's rule gives ${Number(numeric.toPrecision(10))}, which matches.`,
    hints: [
      "First find any antiderivative of the integrand.",
      `Use ${method.toLowerCase()}, then evaluate F at both bounds.`,
      `An antiderivative is $${tex(F)}$.`,
    ],
  });
}

// ---------------------------------------------------------------- limits

function pointLatex(point: number, node?: MathNode) {
  if (point === Infinity) return "\\infty";
  if (point === -Infinity) return "-\\infty";
  return node ? tex(node) : exactLatex(point).latex;
}

function valueLatex(value: number) {
  return exactLatex(value).latex;
}

export function solveLimit(
  expr: MathNode,
  x: string,
  point: number,
  pointNode?: MathNode,
): Solution {
  const f = fnOf(expr, x);
  const at = pointLatex(point, pointNode);
  const restated = `\\lim_{${x} \\to ${at}} ${tex(expr)}`;
  const steps: Step[] = [];
  let answer: number | undefined;
  let method = "Direct substitution";
  let why =
    "The function is continuous at the point, so the limit is its value there.";

  const near = (h: number) =>
    Number.isFinite(point)
      ? [f(point - h), f(point + h)]
      : [f(Math.sign(point) / h)];

  if (Number.isFinite(point)) {
    const direct = f(point);
    const [left, right] = near(1e-7);
    if (
      Number.isFinite(direct) &&
      close(left, direct, 1e-5) &&
      close(right, direct, 1e-5)
    ) {
      answer = direct;
      steps.push(
        step(
          "Substitute the point",
          "Direct substitution (continuity)",
          `${restated} = ${tex(expr).replaceAll(new RegExp(`\\b${x}\\b`, "g"), wrap(at))} = ${valueLatex(direct)}`,
          "Polynomials, rational functions where the denominator is not zero, and the standard functions are continuous, so the limit is the value.",
        ),
      );
    } else if (expr.type === "bin" && expr.op === "/") {
      let top = expr.left;
      let bottom = expr.right;
      const topValue = evaluateNode(top, { [x]: point });
      const bottomValue = evaluateNode(bottom, { [x]: point });
      steps.push(
        step(
          "Try direct substitution",
          "Direct substitution",
          `\\frac{${valueLatex(topValue)}}{${valueLatex(bottomValue)}}`,
          Math.abs(topValue) < 1e-12 && Math.abs(bottomValue) < 1e-12
            ? "Both the top and the bottom are zero: the indeterminate form $\\frac{0}{0}$. The limit may still exist."
            : "The denominator is zero but the numerator is not, so the function grows without bound near the point.",
          "Concluding that $\\frac{0}{0}$ means the limit is 0 or does not exist.",
        ),
      );
      if (Math.abs(topValue) < 1e-12 && Math.abs(bottomValue) < 1e-12) {
        method = "L'Hôpital's rule";
        why =
          "Substitution gives $\\frac{0}{0}$; L'Hôpital's rule replaces the quotient with the quotient of derivatives, which has the same limit.";
        for (let round = 0; round < 3 && answer === undefined; round += 1) {
          const topPrime = d(top, x);
          const bottomPrime = d(bottom, x);
          const tp = evaluateNode(topPrime, { [x]: point });
          const bp = evaluateNode(bottomPrime, { [x]: point });
          steps.push(
            step(
              round === 0
                ? "Differentiate the top and the bottom"
                : "Apply L'Hôpital's rule again",
              "L'Hôpital's rule",
              `\\lim_{${x} \\to ${at}} \\frac{${tex(topPrime)}}{${tex(bottomPrime)}}`,
              "Differentiate numerator and denominator separately, not as a quotient.",
              "Using the quotient rule here; L'Hôpital differentiates top and bottom separately.",
            ),
          );
          if (Math.abs(bp) > 1e-12) {
            answer = tp / bp;
            steps.push(
              step(
                "Substitute again",
                "Direct substitution",
                `\\frac{${valueLatex(tp)}}{${valueLatex(bp)}} = ${valueLatex(answer)}`,
                "The new quotient is continuous at the point, so substitution now works.",
              ),
            );
          }
          top = topPrime;
          bottom = bottomPrime;
        }
      }
    }
  }

  if (answer === undefined) {
    // Fall back to the CAS, then confirm numerically.
    const text = nerdamerLimit(
      toAlgebrite(expr),
      x,
      point === Infinity
        ? "Infinity"
        : point === -Infinity
          ? "-Infinity"
          : String(point),
    );
    const node = parseAlgebrite(text.replaceAll("Infinity", "oo"));
    const value = node ? evaluateNode(node, {}) : NaN;
    if (Number.isNaN(value)) throw new Unsolved("limit not found");
    answer = value;
    if (steps.length === 0) {
      method = Number.isFinite(point) ? "Limit laws" : "Limits at infinity";
      why = Number.isFinite(point)
        ? "Direct substitution does not work, so the limit is found from the behaviour of the function near the point."
        : "As the variable grows, only the dominant terms matter.";
      steps.push(
        step(
          Number.isFinite(point)
            ? "Examine the behaviour near the point"
            : "Compare the dominant terms",
          method,
          restated,
          Number.isFinite(point)
            ? "Look at what the function approaches from both sides."
            : "Divide through by the highest power, or compare growth rates: exponentials beat powers, which beat logarithms.",
        ),
      );
    }
    steps.push(
      step(
        "State the limit",
        method,
        `${restated} = ${valueLatex(value)}`,
        "The limit is the value the function approaches.",
      ),
    );
  }

  // Confirm numerically from both sides.
  const approach = near(1e-6).concat(near(1e-5));
  const target = answer;
  const confirmed = Number.isFinite(target)
    ? approach.every((value) => close(value, target, 1e-3))
    : approach.every(
        (value) =>
          Math.abs(value) > 1e4 && Math.sign(value) === Math.sign(target),
      );
  if (!confirmed) throw new Unsolved("limit check failed");

  return solved({
    restated,
    topic: "calculus.limits",
    type: "Limit",
    method,
    why,
    alternatives:
      method === "L'Hôpital's rule"
        ? "Factoring and cancelling, or a known standard limit, often gives the same answer without derivatives."
        : "A table of values approaching the point shows the same trend.",
    steps,
    answer: valueLatex(answer),
    plain: `The limit is $${valueLatex(answer)}$.`,
    checkMethod: "Values near the point",
    checkDetail:
      "Evaluating the function very close to the point from both sides gives values that approach the answer.",
    hints: [
      "Try substituting the point first. What do you get?",
      `Use ${method.toLowerCase()}.`,
      steps[0] ? `First: $${steps[0].latex}$` : "Substitute and simplify.",
    ],
  });
}
