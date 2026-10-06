// Equations, systems, arithmetic and simplification with worked steps.

import type { Solution, Step } from "@/lib/ai/schemas";
import {
  evaluateNode,
  formatNumber,
  type MathNode,
  toFraction,
  variablesOf,
} from "@/lib/math/evaluate";

import { algNode, solved, step, tex, Unsolved } from "./build";
import { alg, CasError } from "./engine";
import type { Interval } from "./parse";
import { close, exactLatex, fnOf, realRoots, SAMPLES } from "./numeric";
import { parseAlgebrite, parseAlgebriteList, toAlgebrite } from "./print";

const wrap = (text: string) => `\\left(${text}\\right)`;

// Polynomial degree in x, or undefined when the expression is not one.
export function polynomialDegree(
  node: MathNode,
  x: string,
): number | undefined {
  if (!variablesOf(node).has(x)) return 0;
  switch (node.type) {
    case "var":
      return 1;
    case "neg":
      return polynomialDegree(node.arg, x);
    case "bin": {
      const left = polynomialDegree(node.left, x);
      const right = polynomialDegree(node.right, x);
      if (node.op === "+" || node.op === "-") {
        return left === undefined || right === undefined
          ? undefined
          : Math.max(left, right);
      }
      if (node.op === "*") {
        return left === undefined || right === undefined
          ? undefined
          : left + right;
      }
      if (node.op === "/") return right === 0 ? left : undefined;
      if (node.op === "^") {
        return node.right.type === "num" &&
          Number.isInteger(node.right.value) &&
          node.right.value >= 0 &&
          left !== undefined
          ? left * node.right.value
          : undefined;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

const coeff = (poly: MathNode, x: string, power: number) =>
  algNode((p) => `coeff(${p},${x},${power})`, poly);

function rootsOf(poly: MathNode, x: string): MathNode[] | undefined {
  try {
    const list = parseAlgebriteList(alg(`roots(${toAlgebrite(poly)},${x})`));
    const nodes = list?.map((item) => parseAlgebrite(item));
    // Cube roots of -1 mean Algebrite took the complex route; leave it.
    if (
      !nodes ||
      nodes.some((node) => !node) ||
      list?.some((item) => item.includes("(-1)^"))
    ) {
      return undefined;
    }
    return nodes as MathNode[];
  } catch (error) {
    if (error instanceof CasError) return undefined;
    throw error;
  }
}

function isReal(node: MathNode) {
  return !variablesOf(node).has("i");
}

function answerList(x: string, values: string[]) {
  return values.map((value) => `${x} = ${value}`).join(", \\; ");
}

const HINT_STANDARD =
  "Move every term to one side so the equation reads (something) = 0.";

export function solveEquation(
  left: MathNode,
  right: MathNode,
  x: string,
  interval?: Interval,
): Solution {
  const restated = `${tex(left)} = ${tex(right)}`;
  const difference: MathNode = { type: "bin", op: "-", left, right };
  const residual = fnOf(difference, x);
  const steps: Step[] = [];

  const rational = algNode((e) => `rationalize(${e})`, difference);
  const numerator = algNode((e) => `expand(numerator(${e}))`, rational);
  const denominator = algNode((e) => `denominator(${e})`, rational);
  const hasDenominator = variablesOf(denominator).has(x);
  const degree = polynomialDegree(numerator, x);

  if (degree !== undefined && degree >= 1) {
    if (hasDenominator) {
      steps.push(
        step(
          "Clear the denominators",
          "Multiply both sides by the common denominator",
          `${tex(numerator)} = 0, \\qquad ${tex(denominator)} \\ne 0`,
          "Multiplying by the common denominator removes the fractions. Any solution that makes the denominator zero must be rejected at the end.",
          "Keeping a solution that makes an original denominator zero.",
        ),
      );
    } else {
      steps.push(
        step(
          "Move every term to one side",
          "Standard form",
          `${tex(numerator)} = 0`,
          "Subtract the right side from both sides and collect like terms, so the equation is a polynomial set equal to zero.",
          "Changing the sign of only some terms when moving them across the equals sign.",
        ),
      );
    }

    let roots: Array<{ latex: string; value: number }> = [];
    let complex: string[] = [];
    let method = "Solving a polynomial equation";
    let why = "";

    if (degree === 1) {
      const a = coeff(numerator, x, 1);
      const b = coeff(numerator, x, 0);
      const solution = algNode((p, q) => `-(${q})/(${p})`, a, b);
      method = "Inverse operations";
      why =
        "The equation is linear, so isolating the variable with inverse operations solves it in two moves.";
      steps.push(
        step(
          `Isolate the ${x}-term`,
          "Addition property of equality",
          `${tex(a)}${x} = ${tex(algNode((q) => `-(${q})`, b))}`,
          "Move the constant term to the other side by doing the opposite operation to both sides.",
        ),
        step(
          `Divide by the coefficient of ${x}`,
          "Multiplication property of equality",
          `${x} = ${tex(solution)}`,
          `Dividing both sides by ${tex(a)} leaves ${x} on its own.`,
          "Dividing only one side, or dividing by the wrong sign.",
        ),
      );
      roots = [{ latex: tex(solution), value: evaluateNode(solution, {}) }];
    } else if (degree === 2) {
      const a = coeff(numerator, x, 2);
      const b = coeff(numerator, x, 1);
      const c = coeff(numerator, x, 0);
      const disc = algNode((p, q, r) => `(${q})^2-4*(${p})*(${r})`, a, b, c);
      const discValue = evaluateNode(disc, {});
      steps.push(
        step(
          "Identify a, b and c",
          "Standard form of a quadratic",
          `a = ${tex(a)}, \\quad b = ${tex(b)}, \\quad c = ${tex(c)}`,
          `The quadratic is in the form $a${x}^2 + b${x} + c = 0$.`,
        ),
        step(
          "Compute the discriminant",
          "Discriminant",
          `\\Delta = b^2 - 4ac = ${wrap(tex(b))}^{2} - 4${wrap(tex(a))}${wrap(tex(c))} = ${tex(disc)}`,
          discValue > 0
            ? "A positive discriminant means two different real solutions."
            : discValue === 0
              ? "A zero discriminant means one repeated real solution."
              : "A negative discriminant means no real solutions; the two solutions are complex.",
        ),
      );
      const found = rootsOf(numerator, x) ?? [];
      const realRootsFound = found.filter(isReal);
      const rationalRoots =
        discValue >= 0 &&
        realRootsFound.length > 0 &&
        realRootsFound.every(
          (root) =>
            !/\^/.test(toAlgebrite(root)) && !/sqrt/.test(toAlgebrite(root)),
        );
      if (rationalRoots) {
        const factored = algNode((p) => `factor(${p})`, numerator);
        method = "Factoring";
        why =
          "The discriminant is a perfect square, so the quadratic factors over the rationals and the zero product property finishes it.";
        steps.push(
          step(
            "Factor",
            "Factoring a quadratic",
            `${tex(factored)} = 0`,
            "Find two factors whose product is the quadratic; expanding them gives it back.",
          ),
          step(
            "Set each factor to zero",
            "Zero product property",
            realRootsFound
              .map((root) => `${x} = ${tex(root)}`)
              .join(" \\quad\\text{or}\\quad "),
            "A product is zero only when one of its factors is zero.",
            "Using the zero product property when the right side is not zero.",
          ),
        );
      } else {
        method = "Quadratic formula";
        why =
          "The quadratic does not factor nicely, so the quadratic formula gives the exact solutions.";
        steps.push(
          step(
            "Apply the quadratic formula",
            "Quadratic formula",
            `${x} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{-${wrap(tex(b))} \\pm \\sqrt{${tex(disc)}}}{2${wrap(tex(a))}}`,
            "Substitute a, b and the discriminant into the formula.",
            "Writing $-b^2$ instead of $b^2$ inside the discriminant, or dividing only part of the numerator by $2a$.",
          ),
          step(
            "Simplify the two solutions",
            "Simplifying radicals",
            found.map((root) => `${x} = ${tex(root)}`).join(", \\quad "),
            discValue < 0
              ? "The square root of a negative number is imaginary, so the solutions are complex conjugates."
              : "Simplify the radical and split the $\\pm$ into two solutions.",
          ),
        );
      }
      roots = realRootsFound.map((root) => ({
        latex: tex(root),
        value: evaluateNode(root, {}),
      }));
      complex = found.filter((root) => !isReal(root)).map(tex);
    } else {
      const found = rootsOf(numerator, x);
      let factored: MathNode | undefined;
      try {
        factored = algNode((p) => `factor(${p})`, numerator);
      } catch (error) {
        if (!(error instanceof CasError)) throw error;
      }
      method = "Factoring";
      why =
        "Factoring a higher-degree polynomial splits it into simpler factors, each giving solutions by the zero product property.";
      if (factored) {
        steps.push(
          step(
            "Factor the polynomial",
            "Factor theorem",
            `${tex(factored)} = 0`,
            "Test small integer divisors of the constant term (rational root theorem), then divide out each factor found.",
          ),
        );
      }
      if (found) {
        roots = found
          .filter(isReal)
          .map((root) => ({ latex: tex(root), value: evaluateNode(root, {}) }));
        complex = found.filter((root) => !isReal(root)).map(tex);
      } else {
        method = "Numerical root finding";
        roots = realRoots(fnOf(numerator, x), -100, 100, 20_000).map(
          (value) => ({
            ...exactLatexValue(value),
            value,
          }),
        );
      }
      steps.push(
        step(
          "Set each factor to zero",
          "Zero product property",
          roots
            .map((root) => `${x} = ${root.latex}`)
            .join(" \\quad\\text{or}\\quad ") || "\\text{no real solutions}",
          "Each factor that can be zero gives a solution.",
        ),
      );
    }

    // Reject roots that make a denominator zero.
    const rejected = roots.filter(
      (root) =>
        hasDenominator &&
        Math.abs(evaluateNode(denominator, { [x]: root.value })) < 1e-12,
    );
    roots = roots.filter((root) => !rejected.includes(root));
    if (rejected.length > 0) {
      steps.push(
        step(
          "Reject extraneous solutions",
          "Domain of a rational equation",
          rejected.map((root) => `${x} \\ne ${root.latex}`).join(", "),
          "These values make an original denominator zero, so they are not solutions.",
        ),
      );
    }

    return finishEquation({
      restated,
      x,
      roots,
      complex,
      residual,
      steps,
      method,
      why,
      degree,
      interval,
    });
  }

  // Not a polynomial: find the real roots numerically, then recognize exact
  // values such as pi/6.
  const [low, high] = interval ?? [-20, 20];
  let found = realRoots(residual, low, high, 40_000);
  // Nothing nearby: look further out before giving up.
  if (found.length === 0 && !interval)
    found = realRoots(residual, -1000, 1000, 200_000);
  const values = found.filter(
    (value) => !interval || (value >= low - 1e-12 && value < high - 1e-12),
  );
  if (values.length === 0 || values.length > 12)
    throw new Unsolved("no roots found");
  const roots = values.map((value) => ({ ...exactLatexValue(value), value }));
  const periodic = /sin|cos|tan/.test(toAlgebrite(difference));
  steps.push(
    step(
      "Rewrite as f(x) = 0",
      "Standard form",
      `f(${x}) = ${tex(difference)} = 0`,
      "The solutions are the points where the graph of $f$ crosses the horizontal axis.",
    ),
    step(
      `Find where f(${x}) = 0${interval ? " in the given interval" : ""}`,
      periodic
        ? "Inverse trigonometric functions and periodicity"
        : "Bisection (numerical root finding)",
      roots.map((root) => `${x} = ${root.latex}`).join(", \\quad "),
      periodic
        ? "Isolate the trigonometric function, take the inverse to get the reference angle, then use the symmetry of the unit circle for the other solutions in the interval."
        : "Each sign change of $f$ brackets a root, and halving the bracket repeatedly pins it down.",
      periodic
        ? "Stopping at the calculator's single inverse value and missing the second solution in each period."
        : "",
    ),
  );
  return finishEquation({
    restated,
    x,
    roots,
    complex: [],
    residual,
    steps,
    method: periodic
      ? "Inverse trigonometric functions"
      : "Numerical root finding",
    why: periodic
      ? "The equation involves a trigonometric function, so its solutions come from the unit circle and repeat with the period."
      : "The equation is not polynomial, so its solutions are located where the function changes sign.",
    interval,
    periodic: periodic && !interval,
  });
}

function exactLatexValue(value: number) {
  return { latex: exactLatex(value).latex };
}

function finishEquation({
  restated,
  x,
  roots,
  complex,
  residual,
  steps,
  method,
  why,
  degree,
  interval,
  periodic,
}: {
  restated: string;
  x: string;
  roots: Array<{ latex: string; value: number }>;
  complex: string[];
  residual: (value: number) => number;
  steps: Step[];
  method: string;
  why: string;
  degree?: number;
  interval?: Interval;
  periodic?: boolean;
}): Solution {
  if (interval) {
    roots = roots.filter(
      (root) =>
        root.value >= interval[0] - 1e-12 && root.value < interval[1] - 1e-12,
    );
  }
  for (const root of roots) {
    const r = residual(root.value);
    if (
      !Number.isFinite(r) ||
      Math.abs(r) > 1e-7 * Math.max(1, Math.abs(root.value))
    ) {
      throw new Unsolved("root check failed");
    }
  }
  if (roots.length === 0 && complex.length === 0)
    throw new Unsolved("no solutions");

  const answer =
    roots.length > 0
      ? answerList(
          x,
          roots.map((root) => root.latex),
        )
      : `\\text{no real solutions}`;
  const plain =
    roots.length > 0
      ? roots.map((root) => `$${x} = ${root.latex}$`).join(" or ")
      : `There are no real solutions; the complex solutions are ${complex.map((value) => `$${value}$`).join(" and ")}.`;
  steps.push(
    step(
      "State the solutions",
      "Solution set",
      roots.length > 0 ? answer : `${x} = ${complex.join(", \\; ")}`,
      roots.length > 0
        ? "Substituting each value back into the original equation makes both sides equal."
        : "There is no real number that satisfies the equation.",
    ),
  );

  const intervalText = interval
    ? `Solutions in the interval $[${formatNumber(interval[0])}, ${formatNumber(Number(interval[1].toPrecision(6)))})$.`
    : "";
  const notes = [
    intervalText,
    periodic
      ? "The equation is periodic; adding whole periods gives every other solution. Solutions shown are those in [-20, 20]."
      : "",
    complex.length > 0 && roots.length > 0
      ? `Complex solutions: ${complex.map((c) => `$${c}$`).join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return solved({
    restated,
    topic:
      degree === 1
        ? "algebra.linear-equations"
        : degree === 2
          ? "algebra.quadratic-equations"
          : degree
            ? "algebra.polynomial-equations"
            : periodic || /sin|cos|tan/.test(restated)
              ? "trigonometry.equations"
              : "precalculus.equations",
    type:
      degree === 1
        ? "Linear equation"
        : degree === 2
          ? "Quadratic equation"
          : degree
            ? `Polynomial equation of degree ${degree}`
            : "Equation",
    method,
    why,
    alternatives:
      degree === 2
        ? "Completing the square gives the same solutions, and the graph of the left side crosses zero at them."
        : "Graphing both sides and reading off the intersections confirms the solutions.",
    steps,
    answer,
    plain,
    notes,
    checkMethod: "Substitution",
    checkDetail: `Substituting ${roots.length > 0 ? roots.map((root) => `$${x} = ${root.latex}$`).join(" and ") : "the solutions"} back makes both sides equal.`,
    hints: [
      HINT_STANDARD,
      `Use ${method.toLowerCase()}.`,
      steps[0] ? `Start with: $${steps[0].latex}$` : "Isolate the variable.",
    ],
  });
}

// ------------------------------------------------------------ systems

function det(matrix: MathNode[][]): MathNode {
  const rows = matrix
    .map((row) => `[${row.map(toAlgebrite).join(",")}]`)
    .join(",");
  const output = alg(`det([${rows}])`);
  const node = parseAlgebrite(output);
  if (!node) throw new CasError(output);
  return node;
}

// 2x + y - 3z as a tree, so coefficients of 1 and signs print naturally.
function linearCombination(
  coefficients: MathNode[],
  variables: string[],
): MathNode {
  const terms = coefficients
    .map((coefficient, index) => ({ coefficient, name: variables[index] }))
    .filter(({ coefficient }) => evaluateNode(coefficient, {}) !== 0)
    .map(({ coefficient, name }): MathNode => ({
      type: "bin",
      op: "*",
      left: coefficient,
      right: { type: "var", name },
    }));
  return terms.length === 0
    ? { type: "num", value: 0 }
    : terms.reduce((sum, term) => ({
        type: "bin",
        op: "+",
        left: sum,
        right: term,
      }));
}

export function matrixLatex(rows: MathNode[][]) {
  return `\\begin{pmatrix} ${rows.map((row) => row.map(tex).join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
}

export function solveSystem(
  equations: Array<[MathNode, MathNode]>,
  variables: string[],
): Solution {
  const n = variables.length;
  if (n < 2 || n > 3 || equations.length !== n)
    throw new Unsolved("system shape");

  const restated = `\\begin{cases} ${equations.map(([l, r]) => `${tex(l)} = ${tex(r)}`).join(" \\\\ ")} \\end{cases}`;
  const A: MathNode[][] = [];
  const b: MathNode[] = [];
  for (const [left, right] of equations) {
    const expr: MathNode = { type: "bin", op: "-", left, right };
    const expanded = algNode((e) => `expand(${e})`, expr);
    const row = variables.map((name) => coeff(expanded, name, 1));
    let constantTerm = expanded;
    for (const name of variables) {
      constantTerm = algNode((e) => `subst(0,${name},${e})`, constantTerm);
    }
    // Linear only: the expression equals its linear part.
    const rebuilt = row.reduce<MathNode>(
      (sum, coefficient, index) => ({
        type: "bin",
        op: "+",
        left: sum,
        right: {
          type: "bin",
          op: "*",
          left: coefficient,
          right: { type: "var", name: variables[index] },
        },
      }),
      constantTerm,
    );
    const check = algNode((e, r) => `expand((${e})-(${r}))`, expanded, rebuilt);
    if (evaluateNode(check, {}) !== 0 || variablesOf(check).size > 0) {
      throw new Unsolved("not linear");
    }
    if (row.some((entry) => variablesOf(entry).size > 0))
      throw new Unsolved("not linear");
    A.push(row);
    b.push(algNode((c) => `-(${c})`, constantTerm));
  }

  const D = det(A);
  const Dv = evaluateNode(D, {});
  const steps: Step[] = [
    step(
      "Write each equation in standard form",
      "Standard form of a linear equation",
      `\\begin{cases} ${A.map((row, i) => `${tex(linearCombination(row, variables))} = ${tex(b[i])}`).join(" \\\\ ")} \\end{cases}`,
      "Put the variables on the left in the same order in every equation and the constants on the right.",
    ),
    step(
      "Write the system as a matrix equation",
      "Matrix form",
      `${matrixLatex(A)}\\begin{pmatrix} ${variables.join(" \\\\ ")} \\end{pmatrix} = \\begin{pmatrix} ${b.map(tex).join(" \\\\ ")} \\end{pmatrix}`,
      "The coefficient matrix holds the coefficients; the right-hand column holds the constants.",
    ),
    step(
      "Compute the determinant of the coefficient matrix",
      "Determinant",
      `\\det A = ${tex(D)}`,
      Dv !== 0
        ? "A nonzero determinant means there is exactly one solution."
        : "A zero determinant means there is no unique solution: either none or infinitely many.",
    ),
  ];

  if (Dv === 0) {
    return solved({
      restated,
      topic: "algebra.systems",
      type: "System of linear equations",
      method: "Determinants",
      why: "The determinant decides whether a unique solution exists.",
      alternatives:
        "Row reduction shows whether the system is inconsistent or has infinitely many solutions.",
      steps,
      answer: "\\text{no unique solution}",
      plain: "The system has no unique solution (the determinant is zero).",
      checkMethod: "Determinant",
      checkDetail: "The coefficient matrix has determinant 0.",
      hints: [
        "Write the system as a matrix equation.",
        "Compute the determinant of the coefficient matrix.",
        "The determinant is 0.",
      ],
    });
  }

  const values: MathNode[] = variables.map((_, k) => {
    const Ak = A.map((row, i) =>
      row.map((entry, j) => (j === k ? b[i] : entry)),
    );
    const Dk = det(Ak);
    const value = algNode((top, bottom) => `(${top})/(${bottom})`, Dk, D);
    steps.push(
      step(
        `Solve for ${variables[k]}`,
        "Cramer's rule",
        `${variables[k]} = \\frac{\\det A_{${variables[k]}}}{\\det A} = \\frac{${tex(Dk)}}{${tex(D)}} = ${tex(value)}`,
        `Replace the ${variables[k]}-column of the coefficient matrix with the constants and divide its determinant by $\\det A$.`,
      ),
    );
    return value;
  });

  const scope = Object.fromEntries(
    variables.map((name, k) => [name, evaluateNode(values[k], {})]),
  );
  for (const [left, right] of equations) {
    if (!close(evaluateNode(left, scope), evaluateNode(right, scope), 1e-9)) {
      throw new Unsolved("system check failed");
    }
  }
  const answer = variables
    .map((name, k) => `${name} = ${tex(values[k])}`)
    .join(", \\; ");
  return solved({
    restated,
    topic: "algebra.systems",
    type: `System of ${n} linear equations`,
    method: "Cramer's rule",
    why: "With as many equations as unknowns and a nonzero determinant, Cramer's rule gives each variable directly as a ratio of determinants.",
    alternatives:
      "Elimination or substitution gives the same solution; for larger systems, row reduction is faster.",
    steps,
    answer,
    plain: `$${answer}$`,
    checkMethod: "Substitution",
    checkDetail:
      "Substituting the values into every original equation makes both sides equal.",
    hints: [
      "Line up the variables in the same order in each equation.",
      "Eliminate one variable, or use Cramer's rule with determinants.",
      `The coefficient determinant is $${tex(D)}$.`,
    ],
  });
}

// ------------------------------------------------- arithmetic and algebra

export function solveExpression(
  expr: MathNode,
  intent: "simplify" | "factor" | "expand",
): Solution {
  const variables = [...variablesOf(expr)].filter((name) => name !== "i");
  const restated = tex(expr);

  if (variables.length === 0) {
    const exact = algNode((e) => e, expr);
    const value = evaluateNode(expr, {});
    const exactValue = evaluateNode(exact, {});
    if (!Number.isFinite(value) || !close(value, exactValue, 1e-9)) {
      throw new Unsolved("arithmetic check failed");
    }
    const steps: Step[] = [
      step(
        "Follow the order of operations",
        "Order of operations",
        restated,
        "Brackets first, then exponents and roots, then multiplication and division from left to right, then addition and subtraction.",
        "Working strictly left to right and adding before multiplying.",
      ),
    ];
    const fractionTerms = fractionSum(expr);
    if (fractionTerms) {
      steps.push(
        step(
          "Rewrite over a common denominator",
          "Least common denominator",
          fractionTerms,
          "Fractions can only be added or subtracted when their denominators match. Scale each one to the least common denominator.",
          "Adding the denominators as well as the numerators.",
        ),
      );
    }
    const fraction = toFraction(exactValue);
    const isWhole = Number.isInteger(exactValue);
    steps.push(
      step(
        "Simplify",
        "Simplest form",
        `${restated} = ${tex(exact)}${isWhole ? "" : ` \\approx ${formatNumber(Number(exactValue.toPrecision(10)))}`}`,
        fraction &&
          fraction.denominator > 1 &&
          Math.abs(fraction.numerator) > fraction.denominator
          ? `In lowest terms this is $${tex(exact)}$, or $${mixedNumber(fraction.numerator, fraction.denominator)}$ as a mixed number.`
          : "Reduce to lowest terms and simplify any radicals.",
      ),
    );
    return solved({
      restated,
      topic: fractionTerms ? "arithmetic.fractions" : "arithmetic.evaluation",
      type: fractionTerms ? "Fraction arithmetic" : "Arithmetic",
      method: fractionTerms ? "Common denominator" : "Order of operations",
      why: fractionTerms
        ? "The terms are fractions with different denominators, so they need a common denominator before they combine."
        : "Evaluating in the standard order of operations gives the exact value.",
      alternatives:
        "A calculator gives the decimal; working exactly keeps fractions and radicals precise.",
      steps,
      answer: tex(exact),
      plain: `$${tex(exact)}$${isWhole ? "" : `, about ${formatNumber(Number(exactValue.toPrecision(8)))}`}`,
      checkMethod: "Decimal evaluation",
      checkDetail: `Evaluating the original expression as decimals gives ${formatNumber(Number(value.toPrecision(10)))}, which matches.`,
      hints: [
        "What does the order of operations say to do first?",
        fractionTerms
          ? "Find the least common denominator."
          : "Work inside brackets first.",
        steps[1]
          ? `$${steps[1].latex}$`
          : `The answer is a ${isWhole ? "whole number" : "fraction"}.`,
      ],
    });
  }

  const command =
    intent === "factor"
      ? "factor"
      : intent === "expand"
        ? "expand"
        : "simplify";
  const result = algNode((e) => `${command}(${e})`, expr);
  const original = (scope: Record<string, number>) => evaluateNode(expr, scope);
  const transformed = (scope: Record<string, number>) =>
    evaluateNode(result, scope);
  let compared = 0;
  for (const [index, point] of SAMPLES.entries()) {
    const scope = Object.fromEntries(
      variables.map((name, k) => [name, point + k * 0.37 + index * 0.01]),
    );
    const a = original(scope);
    const b = transformed(scope);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (!close(a, b, 1e-8)) throw new Unsolved("simplify check failed");
    compared += 1;
  }
  if (compared < 3) throw new Unsolved("simplify check failed");

  const rule =
    intent === "factor"
      ? "Factoring"
      : intent === "expand"
        ? "Distributive property"
        : "Algebraic simplification";
  return solved({
    restated,
    topic: "algebra.expressions",
    type:
      intent === "factor"
        ? "Factoring"
        : intent === "expand"
          ? "Expanding"
          : "Simplifying",
    method: rule,
    why:
      intent === "factor"
        ? "Factoring writes the expression as a product, which shows its zeros and common factors."
        : intent === "expand"
          ? "Expanding multiplies out every bracket and collects like terms."
          : "Cancelling common factors and collecting like terms gives the simplest equivalent form.",
    alternatives:
      "Substituting a test value into both forms is a quick way to check they agree.",
    steps: [
      step(
        "Read the structure",
        rule,
        restated,
        intent === "factor"
          ? "Look for a common factor first, then for patterns: a difference of squares, a perfect square, or a trinomial."
          : intent === "expand"
            ? "Multiply every term in one bracket by every term in the other."
            : "Look for common factors in a numerator and denominator, and like terms to combine.",
      ),
      step(
        intent === "factor"
          ? "Factor"
          : intent === "expand"
            ? "Expand and collect like terms"
            : "Simplify",
        rule,
        `${restated} = ${tex(result)}`,
        "The two forms are equal for every value where both are defined.",
        intent === "simplify"
          ? "Cancelling terms that are added rather than factors that are multiplied."
          : "",
      ),
    ],
    answer: tex(result),
    plain: `$${tex(result)}$`,
    notes:
      intent === "simplify" && /\//.test(toAlgebrite(expr))
        ? "Values that make an original denominator zero stay excluded."
        : "",
    checkMethod: "Test values",
    checkDetail: "Both forms give the same value at several test points.",
    hints: [
      "What is the structure of the expression?",
      `Use ${rule.toLowerCase()}.`,
      `The result is $${tex(result)}$.`,
    ],
  });
}

function mixedNumber(numerator: number, denominator: number) {
  const sign = numerator < 0 ? "-" : "";
  const whole = Math.floor(Math.abs(numerator) / denominator);
  const rest = Math.abs(numerator) % denominator;
  return `${sign}${whole}\\tfrac{${rest}}{${denominator}}`;
}

// a/b + c/d - ... rewritten over the least common denominator, or undefined
// when the expression is not a sum of numeric fractions.
function fractionSum(expr: MathNode): string | undefined {
  const parts: Array<{ sign: number; top: number; bottom: number }> = [];
  const visit = (node: MathNode, sign: number): boolean => {
    if (node.type === "bin" && (node.op === "+" || node.op === "-")) {
      return (
        visit(node.left, sign) &&
        visit(node.right, node.op === "-" ? -sign : sign)
      );
    }
    if (
      node.type === "bin" &&
      node.op === "/" &&
      node.left.type === "num" &&
      node.right.type === "num"
    ) {
      parts.push({ sign, top: node.left.value, bottom: node.right.value });
      return true;
    }
    if (node.type === "num" && Number.isInteger(node.value)) {
      parts.push({ sign, top: node.value, bottom: 1 });
      return true;
    }
    return false;
  };
  if (!visit(expr, 1) || parts.length < 2) return undefined;
  if (
    !parts.every(
      (part) => Number.isInteger(part.top) && Number.isInteger(part.bottom),
    )
  )
    return undefined;
  const bottoms = new Set(parts.map((part) => part.bottom));
  if (bottoms.size < 2) return undefined;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const lcd = [...bottoms].reduce((a, b) => (a * b) / gcd(a, b));
  const scaled = parts.map((part) => ({
    ...part,
    top: part.top * (lcd / part.bottom),
  }));
  const total = scaled.reduce((sum, part) => sum + part.sign * part.top, 0);
  const terms = scaled
    .map(
      (part, index) =>
        `${index === 0 ? (part.sign < 0 ? "-" : "") : part.sign < 0 ? " - " : " + "}\\frac{${part.top}}{${lcd}}`,
    )
    .join("");
  return `${terms} = \\frac{${total}}{${lcd}}`;
}
