// Matrices, descriptive statistics and first-order differential equations.

import type { Solution, Step } from "@/lib/ai/schemas";
import {
  evaluateNode,
  formatNumber,
  type MathNode,
  parsePlain,
  toFraction,
} from "@/lib/math/evaluate";

import { algNode, solved, step, tex, Unsolved } from "./build";
import { matrixLatex } from "./algebra";
import { alg } from "./engine";
import { close, derivativeAt, exactLatex, fnOf, isDerivative } from "./numeric";
import type { StatName } from "./parse";
import { parseAlgebrite, parseAlgebriteList, toAlgebrite } from "./print";

const wrap = (text: string) => `\\left(${text}\\right)`;

// ---------------------------------------------------------------- matrices

function renameVariable(node: MathNode, from: string, to: string): MathNode {
  switch (node.type) {
    case "var":
      return node.name === from ? { type: "var", name: to } : node;
    case "neg":
    case "call":
    case "fact":
      return { ...node, arg: renameVariable(node.arg, from, to) };
    case "bin":
      return {
        ...node,
        left: renameVariable(node.left, from, to),
        right: renameVariable(node.right, from, to),
      };
    default:
      return node;
  }
}

function numericMatrix(rows: MathNode[][]) {
  return rows.map((row) => row.map((cell) => evaluateNode(cell, {})));
}

function numericDet(m: number[][]): number {
  if (m.length === 1) return m[0][0];
  if (m.length === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  return m[0].reduce(
    (sum, entry, j) =>
      sum +
      (j % 2 === 0 ? 1 : -1) *
        entry *
        numericDet(m.slice(1).map((row) => row.filter((_, k) => k !== j))),
    0,
  );
}

function algMatrix(rows: MathNode[][]) {
  return `[${rows.map((row) => `[${row.map(toAlgebrite).join(",")}]`).join(",")}]`;
}

function parseMatrixOutput(output: string): MathNode[][] | undefined {
  const rows = parseAlgebriteList(output);
  const parsed = rows?.map((row) =>
    parseAlgebriteList(row)?.map((cell) => parseAlgebrite(cell)),
  );
  if (!parsed || parsed.some((row) => !row || row.some((cell) => !cell)))
    return undefined;
  return parsed as MathNode[][];
}

export function solveMatrix(
  rows: MathNode[][],
  intent: "eigen" | "det" | "inverse" | "transpose",
): Solution {
  const n = rows.length;
  const square = rows.every((row) => row.length === n);
  const A = matrixLatex(rows);
  const values = numericMatrix(rows);
  if (values.flat().some((value) => !Number.isFinite(value)))
    throw new Unsolved("symbolic matrix");

  if (intent === "transpose") {
    const transposed = rows[0].map((_, j) => rows.map((row) => row[j]));
    return solved({
      restated: `${A}^{T}`,
      topic: "linear-algebra.transpose",
      type: "Matrix transpose",
      method: "Transpose",
      why: "The transpose swaps rows and columns.",
      alternatives:
        "Reading each column of the original as a row of the result gives the same matrix.",
      steps: [
        step(
          "Swap rows and columns",
          "Definition of the transpose",
          `${A}^{T} = ${matrixLatex(transposed)}`,
          "Entry $(i, j)$ of the transpose is entry $(j, i)$ of the original.",
        ),
      ],
      answer: matrixLatex(transposed),
      plain: "The transpose swaps rows and columns.",
      checkMethod: "Entry comparison",
      checkDetail:
        "Every entry $(i, j)$ of the result equals entry $(j, i)$ of the original.",
      hints: [
        "What happens to rows and columns in a transpose?",
        "Write each row as a column.",
        "The first row becomes the first column.",
      ],
    });
  }

  if (!square || n > 4) throw new Unsolved("not square");
  const detNode = parseAlgebrite(alg(`det(${algMatrix(rows)})`));
  if (!detNode) throw new Unsolved("det");
  const detValue = numericDet(values);
  if (!close(evaluateNode(detNode, {}), detValue, 1e-9))
    throw new Unsolved("det check");

  const detSteps: Step[] = [];
  if (n === 2) {
    const [[a, b], [c, d]] = rows;
    detSteps.push(
      step(
        "Use ad − bc",
        "Determinant of a 2 × 2 matrix",
        `\\det A = ${wrap(tex(a))}${wrap(tex(d))} - ${wrap(tex(b))}${wrap(tex(c))} = ${tex(detNode)}`,
        "Multiply down the main diagonal and subtract the product of the other diagonal.",
        "Adding the two diagonal products instead of subtracting.",
      ),
    );
  } else if (n === 3) {
    const minors = rows[0].map((entry, j) => {
      const minor = rows.slice(1).map((row) => row.filter((_, k) => k !== j));
      return {
        entry,
        minor,
        value: parseAlgebrite(alg(`det(${algMatrix(minor)})`)),
      };
    });
    detSteps.push(
      step(
        "Expand along the first row",
        "Cofactor expansion",
        `\\det A = ${minors
          .map(
            ({ entry, minor }, j) =>
              `${j === 0 ? "" : j === 1 ? " - " : " + "}${wrap(tex(entry))}\\det${matrixLatex(minor)}`,
          )
          .join("")}`,
        "Each entry of the first row multiplies the determinant of the matrix left after deleting its row and column, with signs alternating $+, -, +$.",
        "Forgetting the alternating signs.",
      ),
      step(
        "Evaluate the 2 × 2 determinants",
        "Determinant of a 2 × 2 matrix",
        `= ${minors
          .map(
            ({ entry, value }, j) =>
              `${j === 0 ? "" : j === 1 ? " - " : " + "}${wrap(tex(entry))}${wrap(value ? tex(value) : "?")}`,
          )
          .join("")} = ${tex(detNode)}`,
        "Each small determinant is $ad - bc$.",
      ),
    );
  } else {
    detSteps.push(
      step(
        "Compute the determinant",
        "Cofactor expansion",
        `\\det A = ${tex(detNode)}`,
        "Expand along a row or column, or row-reduce to a triangular matrix.",
      ),
    );
  }

  if (intent === "det") {
    return solved({
      restated: `\\det${A}`,
      topic: "linear-algebra.determinants",
      type: `Determinant of a ${n} × ${n} matrix`,
      method: n === 2 ? "ad − bc" : "Cofactor expansion",
      why:
        n === 2
          ? "A 2 × 2 determinant has a one-line formula."
          : "Cofactor expansion reduces the determinant to 2 × 2 ones.",
      alternatives:
        "Row reduction to a triangular matrix and multiplying the diagonal gives the same value.",
      steps: detSteps,
      answer: tex(detNode),
      plain: `The determinant is $${tex(detNode)}$.`,
      notes:
        detValue === 0
          ? "The determinant is zero, so the matrix is not invertible."
          : "",
      checkMethod: "Independent computation",
      checkDetail: `A separate numerical expansion also gives ${formatNumber(Number(detValue.toPrecision(10)))}.`,
      hints: [
        "Which formula gives a determinant of this size?",
        n === 2 ? "Use ad − bc." : "Expand along the first row.",
        detSteps[0].latex ? `$${detSteps[0].latex}$` : "",
      ],
    });
  }

  if (intent === "inverse") {
    if (detValue === 0) {
      return solved({
        restated: `${A}^{-1}`,
        topic: "linear-algebra.inverses",
        type: "Matrix inverse",
        method: "Determinant test",
        why: "A matrix is invertible exactly when its determinant is nonzero.",
        alternatives:
          "Row reducing $[A \\mid I]$ shows the same: a row of zeros appears.",
        steps: detSteps,
        answer: "\\text{not invertible}",
        plain: "The matrix has determinant 0, so it has no inverse.",
        checkMethod: "Determinant",
        checkDetail: "The determinant is 0.",
        hints: [
          "When does a matrix have an inverse?",
          "Compute the determinant.",
          "The determinant is 0.",
        ],
      });
    }
    const inverse = parseMatrixOutput(alg(`inv(${algMatrix(rows)})`));
    if (!inverse) throw new Unsolved("inverse");
    const inv = numericMatrix(inverse);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const entry = values[i].reduce(
          (sum, value, k) => sum + value * inv[k][j],
          0,
        );
        if (!close(entry, i === j ? 1 : 0, 1e-9))
          throw new Unsolved("inverse check");
      }
    }
    const steps = [...detSteps];
    if (n === 2) {
      const [[a, b], [c, d]] = rows;
      steps.push(
        step(
          "Swap, negate and divide by the determinant",
          "Inverse of a 2 × 2 matrix",
          `A^{-1} = \\frac{1}{${tex(detNode)}}\\begin{pmatrix} ${tex(d)} & ${tex(algNode((x) => `-(${x})`, b))} \\\\ ${tex(algNode((x) => `-(${x})`, c))} & ${tex(a)} \\end{pmatrix}`,
          "Swap the diagonal entries, change the signs of the off-diagonal entries, and divide by the determinant.",
          "Forgetting to divide by the determinant.",
        ),
      );
    } else {
      steps.push(
        step(
          "Form the adjugate and divide by the determinant",
          "Inverse via the adjugate",
          `A^{-1} = \\frac{1}{\\det A}\\operatorname{adj}(A)`,
          "The adjugate is the transpose of the matrix of cofactors. Row reducing $[A \\mid I]$ to $[I \\mid A^{-1}]$ gives the same result.",
        ),
      );
    }
    steps.push(
      step(
        "Simplify",
        "Scalar multiplication",
        `A^{-1} = ${matrixLatex(inverse)}`,
        "Divide every entry by the determinant.",
      ),
    );
    return solved({
      restated: `${A}^{-1}`,
      topic: "linear-algebra.inverses",
      type: `Inverse of a ${n} × ${n} matrix`,
      method: n === 2 ? "2 × 2 inverse formula" : "Adjugate",
      why: "The determinant is nonzero, so the inverse exists and can be written with the determinant and the adjugate.",
      alternatives:
        "Gauss–Jordan elimination on $[A \\mid I]$ gives the same inverse.",
      steps,
      answer: matrixLatex(inverse),
      plain: "The inverse is shown above.",
      checkMethod: "Multiplication",
      checkDetail:
        "Multiplying the matrix by the inverse gives the identity matrix.",
      hints: [
        "Is the matrix invertible? Check its determinant.",
        n === 2
          ? "Swap the diagonal, negate the off-diagonal, divide by the determinant."
          : "Row reduce $[A \\mid I]$.",
        `The determinant is $${tex(detNode)}$.`,
      ],
    });
  }

  // Eigenvalues from the characteristic polynomial.
  const shifted = rows.map((row, i) =>
    row.map((cell, j) =>
      i === j ? `(${toAlgebrite(cell)})-l` : toAlgebrite(cell),
    ),
  );
  const charPoly = parseAlgebrite(
    alg(
      `expand(det([${shifted.map((row) => `[${row.join(",")}]`).join(",")}]))`,
    ),
  );
  if (!charPoly) throw new Unsolved("characteristic polynomial");
  const charLatex = tex(renameVariable(charPoly, "l", "\\lambda"));
  const list = parseAlgebriteList(alg(`roots(${toAlgebrite(charPoly)},l)`));
  let eigen = list
    ?.map((item) => parseAlgebrite(item))
    .filter((node): node is MathNode => Boolean(node));
  if (
    !eigen ||
    eigen.length === 0 ||
    list?.some((item) => item.includes("(-1)^"))
  ) {
    const numeric = parseAlgebriteList(
      alg(`nroots(${toAlgebrite(charPoly)},l)`),
    );
    eigen = numeric
      ?.map((item) => parsePlain(item.replaceAll("...", "")))
      .filter((node): node is MathNode => Boolean(node));
  }
  if (!eigen || eigen.length === 0) throw new Unsolved("eigenvalues");
  for (const value of eigen) {
    const lambda = evaluateNode(value, {});
    if (!Number.isFinite(lambda)) continue;
    const shiftedValues = values.map((row, i) =>
      row.map((entry, j) => (i === j ? entry - lambda : entry)),
    );
    if (
      Math.abs(numericDet(shiftedValues)) >
      1e-6 * Math.max(1, Math.abs(detValue))
    ) {
      throw new Unsolved("eigen check");
    }
  }
  const shown = eigen.map((node) => {
    const value = evaluateNode(node, {});
    return Number.isFinite(value) && !/\./.test(toAlgebrite(node))
      ? tex(node)
      : exactLatex(value).latex;
  });
  const lambdaMatrix = `\\begin{pmatrix} ${rows.map((row, i) => row.map((cell, j) => (i === j ? `${tex(cell)} - \\lambda` : tex(cell))).join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
  const trace = values.reduce((sum, row, i) => sum + row[i], 0);
  const steps: Step[] = [
    step(
      "Set up the characteristic equation",
      "Definition of an eigenvalue",
      `\\det(A - \\lambda I) = \\det${lambdaMatrix} = 0`,
      "$\\lambda$ is an eigenvalue exactly when $A - \\lambda I$ is not invertible, so its determinant is zero. Subtract $\\lambda$ on the diagonal only.",
      "Subtracting $\\lambda$ from every entry instead of only the diagonal.",
    ),
    step(
      "Expand the determinant",
      n === 2 ? "Determinant of a 2 × 2 matrix" : "Cofactor expansion",
      `${charLatex} = 0`,
      "This is the characteristic polynomial; its degree equals the size of the matrix.",
    ),
    step(
      "Solve for λ",
      "Roots of the characteristic polynomial",
      shown
        .map((value, k) => `\\lambda_{${k + 1}} = ${value}`)
        .join(", \\quad "),
      `As a check, the eigenvalues add up to the trace (${formatNumber(Number(trace.toPrecision(10)))}) and multiply to the determinant (${formatNumber(Number(detValue.toPrecision(10)))}).`,
    ),
  ];
  return solved({
    restated: `\\text{Eigenvalues of } ${A}`,
    topic: "linear-algebra.eigenvalues",
    type: `Eigenvalues of a ${n} × ${n} matrix`,
    method: "Characteristic polynomial",
    why: "Eigenvalues are the roots of $\\det(A - \\lambda I) = 0$, a polynomial whose degree is the size of the matrix.",
    alternatives:
      "For a 2 × 2 matrix, the trace and determinant give the sum and product of the eigenvalues directly.",
    steps,
    answer: shown.map((value) => `\\lambda = ${value}`).join(", \\; "),
    plain: `The eigenvalues are ${shown.map((value) => `$${value}$`).join(" and ")}.`,
    checkMethod: "Determinant test",
    checkDetail:
      "For each eigenvalue, $\\det(A - \\lambda I)$ evaluates to zero.",
    hints: [
      "Which equation do the eigenvalues of a matrix satisfy?",
      "Subtract λ on the diagonal and take the determinant.",
      `The characteristic polynomial is $${charLatex}$.`,
    ],
  });
}

// -------------------------------------------------------------- statistics

function fractionLatex(value: number) {
  const fraction = toFraction(value, 10_000);
  if (fraction && fraction.denominator !== 1) {
    return `${fraction.numerator < 0 ? "-" : ""}\\frac{${Math.abs(fraction.numerator)}}{${fraction.denominator}} \\approx ${formatNumber(Number(value.toPrecision(6)))}`;
  }
  return formatNumber(Number(value.toPrecision(10)));
}

export function solveStats(
  values: number[],
  requested: Set<StatName>,
  sample?: boolean,
): Solution {
  const wants = new Set(requested);
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((total, value) => total + value, 0);
  const mean = sum / n;
  const median =
    n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const top = Math.max(...counts.values());
  const modes =
    top > 1
      ? [...counts].filter(([, count]) => count === top).map(([value]) => value)
      : [];
  const squares = values.reduce(
    (total, value) => total + (value - mean) ** 2,
    0,
  );
  const populationVariance = squares / n;
  const sampleVariance = n > 1 ? squares / (n - 1) : NaN;
  const show = (value: number) => fractionLatex(value);

  const steps: Step[] = [
    step(
      "Order the data and count it",
      "Ordered data",
      `${sorted.map(formatNumber).join(",\\ ")} \\qquad (n = ${n})`,
      "Sorting makes the median, the range and repeated values easy to see.",
    ),
  ];
  const results: string[] = [];
  const plain: string[] = [];

  if (
    wants.has("sum") ||
    wants.has("mean") ||
    wants.has("variance") ||
    wants.has("sd")
  ) {
    steps.push(
      step(
        "Add the values",
        "Sum",
        `\\sum x_i = ${formatNumber(sum)}`,
        "The sum is needed for the mean.",
      ),
    );
  }
  if (wants.has("sum")) {
    results.push(`\\Sigma = ${formatNumber(sum)}`);
    plain.push(`sum ${formatNumber(sum)}`);
  }
  if (wants.has("mean") || wants.has("variance") || wants.has("sd")) {
    steps.push(
      step(
        "Compute the mean",
        "Arithmetic mean",
        `\\bar{x} = \\frac{\\sum x_i}{n} = \\frac{${formatNumber(sum)}}{${n}} = ${show(mean)}`,
        "The mean is the sum divided by the number of values.",
      ),
    );
    if (wants.has("mean")) {
      results.push(`\\bar{x} = ${show(mean)}`);
      plain.push(`mean ${formatNumber(Number(mean.toPrecision(8)))}`);
    }
  }
  if (wants.has("median")) {
    steps.push(
      step(
        "Find the median",
        "Median",
        n % 2
          ? `\\text{middle value} = ${formatNumber(median)}`
          : `\\frac{${formatNumber(sorted[n / 2 - 1])} + ${formatNumber(sorted[n / 2])}}{2} = ${show(median)}`,
        n % 2
          ? "With an odd number of values, the median is the middle one."
          : "With an even number of values, the median is the mean of the two middle ones.",
        "Taking the middle of the unsorted list.",
      ),
    );
    results.push(`\\text{median} = ${show(median)}`);
    plain.push(`median ${formatNumber(median)}`);
  }
  if (wants.has("mode")) {
    steps.push(
      step(
        "Find the mode",
        "Mode",
        modes.length
          ? `\\text{mode} = ${modes.map(formatNumber).join(", ")}`
          : "\\text{no mode}",
        modes.length
          ? "The mode is the most frequent value."
          : "Every value occurs once, so there is no mode.",
      ),
    );
    results.push(
      modes.length
        ? `\\text{mode} = ${modes.map(formatNumber).join(", ")}`
        : "\\text{no mode}",
    );
    plain.push(
      modes.length ? `mode ${modes.map(formatNumber).join(", ")}` : "no mode",
    );
  }
  if (wants.has("range")) {
    const range = sorted[n - 1] - sorted[0];
    steps.push(
      step(
        "Find the range",
        "Range",
        `${formatNumber(sorted[n - 1])} - ${formatNumber(sorted[0])} = ${formatNumber(range)}`,
        "The range is the largest value minus the smallest.",
      ),
    );
    results.push(`\\text{range} = ${formatNumber(range)}`);
    plain.push(`range ${formatNumber(range)}`);
  }
  if (wants.has("variance") || wants.has("sd")) {
    steps.push(
      step(
        "Sum the squared deviations",
        "Squared deviations from the mean",
        `\\sum (x_i - \\bar{x})^2 = ${show(squares)}`,
        "Subtract the mean from each value, square, and add. Squaring stops positive and negative deviations from cancelling.",
        "Squaring the values instead of their deviations from the mean.",
      ),
    );
    const both = sample === undefined;
    if (sample !== true) {
      steps.push(
        step(
          "Population variance and standard deviation",
          "Population variance",
          `\\sigma^2 = \\frac{${show(squares).split(" \\approx")[0]}}{${n}} = ${show(populationVariance)}, \\qquad \\sigma = ${exactLatex(Math.sqrt(populationVariance)).latex}${exactLatex(Math.sqrt(populationVariance)).exact ? ` \\approx ${formatNumber(Number(Math.sqrt(populationVariance).toPrecision(6)))}` : ""}`,
          "For a whole population, divide by $n$.",
        ),
      );
    }
    if (sample !== false && n > 1) {
      steps.push(
        step(
          "Sample variance and standard deviation",
          "Sample variance",
          `s^2 = \\frac{${show(squares).split(" \\approx")[0]}}{${n - 1}} = ${show(sampleVariance)}, \\qquad s = ${exactLatex(Math.sqrt(sampleVariance)).latex}${exactLatex(Math.sqrt(sampleVariance)).exact ? ` \\approx ${formatNumber(Number(Math.sqrt(sampleVariance).toPrecision(6)))}` : ""}`,
          "For a sample from a larger population, divide by $n - 1$ (Bessel's correction).",
          "Dividing by $n$ for a sample, which underestimates the spread.",
        ),
      );
    }
    if (wants.has("variance")) {
      if (sample !== true)
        results.push(`\\sigma^2 = ${show(populationVariance)}`);
      if (sample !== false && n > 1)
        results.push(`s^2 = ${show(sampleVariance)}`);
      plain.push(
        `variance ${both ? "(population, sample) " : ""}${[
          sample !== true ? populationVariance : NaN,
          sample !== false ? sampleVariance : NaN,
        ]
          .filter(Number.isFinite)
          .map((v) => formatNumber(Number(v.toPrecision(6))))
          .join(", ")}`,
      );
    }
    if (wants.has("sd")) {
      if (sample !== true)
        results.push(
          `\\sigma \\approx ${formatNumber(Number(Math.sqrt(populationVariance).toPrecision(6)))}`,
        );
      if (sample !== false && n > 1)
        results.push(
          `s \\approx ${formatNumber(Number(Math.sqrt(sampleVariance).toPrecision(6)))}`,
        );
      plain.push(
        `standard deviation ${both ? "(population, sample) " : ""}${[
          sample !== true ? populationVariance : NaN,
          sample !== false ? sampleVariance : NaN,
        ]
          .filter(Number.isFinite)
          .map((v) => formatNumber(Number(Math.sqrt(v).toPrecision(6))))
          .join(", ")}`,
      );
    }
  }

  return solved({
    restated: `\\text{${[...wants].map((name) => ({ mean: "mean", median: "median", mode: "mode", range: "range", variance: "variance", sd: "standard deviation", sum: "sum" })[name]).join(", ")} of } ${values.map(formatNumber).join(",\\ ")}`,
    topic: "statistics.descriptive",
    type: "Descriptive statistics",
    method: "Summary statistics",
    why: "Each statistic has a direct formula from the data: centre (mean, median, mode) and spread (range, variance, standard deviation).",
    alternatives:
      "A spreadsheet or calculator's statistics mode gives the same values; the formulas show where they come from.",
    steps,
    answer: results.join(", \\; "),
    plain: plain.join("; "),
    notes:
      sample === undefined && (wants.has("sd") || wants.has("variance"))
        ? "σ treats the data as a whole population (divide by n); s treats it as a sample (divide by n − 1). Use s unless the data is the entire population."
        : "",
    checkMethod: "Recomputation",
    checkDetail: `The mean times n gives back the sum, ${formatNumber(sum)}.`,
    hints: [
      "Start by putting the data in order.",
      "Each statistic has its own formula; begin with the mean.",
      `The mean is $${show(mean)}$.`,
    ],
  });
}

// ------------------------------------------------- differential equations

export function solveOde(
  rhs: MathNode,
  initial?: { x: number; y: number },
): Solution {
  const g = (x: number, y: number) => evaluateNode(rhs, { x, y });
  const restated = `y' = ${tex(rhs)}${initial ? `, \\; y(${formatNumber(initial.x)}) = ${formatNumber(initial.y)}` : ""}`;
  const dependsOnY = [0.3, 1.7, -2.1].some(
    (x) => !close(g(x, 0.4), g(x, 2.9), 1e-12),
  );

  if (!dependsOnY) {
    // y' = f(x): integrate directly.
    const F = algNode((a) => `integral(${a},x)`, rhs);
    if (!isDerivative(fnOf(F, "x"), (x) => g(x, 0)))
      throw new Unsolved("ode integral");
    const C = initial
      ? initial.y - evaluateNode(F, { x: initial.x })
      : undefined;
    const constant = C === undefined ? "C" : exactLatex(C).latex;
    const answer =
      C === undefined
        ? `y = ${tex(F)} + C`
        : `y = ${tex(F)}${C < 0 ? ` - ${exactLatex(-C).latex}` : C === 0 ? "" : ` + ${constant}`}`;
    return solved({
      restated,
      topic: "differential-equations.direct-integration",
      type: "First-order ODE (direct integration)",
      method: "Direct integration",
      why: "The right side depends only on x, so y is an antiderivative of it.",
      alternatives: "Separation of variables gives the same result here.",
      steps: [
        step(
          "Recognize the form",
          "y' = f(x)",
          restated,
          "The derivative is given as a function of x alone.",
        ),
        step(
          "Integrate both sides",
          "Antiderivative",
          `y = \\int ${tex(rhs)}\\,dx = ${tex(F)} + C`,
          "Integrating the derivative gives the function back, up to a constant.",
          "Forgetting the constant of integration.",
        ),
        ...(initial
          ? [
              step(
                "Use the initial condition",
                "Initial value",
                `${formatNumber(initial.y)} = ${tex(F).replaceAll(/\bx\b/g, wrap(formatNumber(initial.x)))} + C \\Rightarrow C = ${constant}`,
                "Substitute the given point to find C.",
              ),
            ]
          : []),
      ],
      answer,
      plain: `$${answer}$`,
      checkMethod: "Substitution",
      checkDetail:
        "Differentiating the solution numerically gives back the right side.",
      hints: [
        "What kind of first-order equation is it?",
        "Integrate both sides with respect to x.",
        `An antiderivative is $${tex(F)}$.`,
      ],
    });
  }

  // y' = a y + b with constants a, b.
  const b = g(0.7, 0);
  const a = g(0.7, 1) - b;
  const linear = [-1.3, 0.4, 2.2].every((x) =>
    [-2, 0.5, 3].every((y) => close(g(x, y), a * y + b, 1e-10)),
  );
  if (!linear || a === 0) throw new Unsolved("ode form");
  const equilibrium = -b / a;
  const C = initial
    ? (initial.y - equilibrium) * Math.exp(-a * initial.x)
    : undefined;
  const aText = exactLatex(a).latex;
  const shift =
    equilibrium === 0
      ? ""
      : ` ${equilibrium < 0 ? "-" : "+"} ${exactLatex(Math.abs(equilibrium)).latex}`;
  const exponent = a === 1 ? "x" : a === -1 ? "-x" : `${aText}x`;
  const constantText = C === undefined ? "C" : exactLatex(C).latex;
  const answer = `y = ${C === 1 ? "" : C === -1 ? "-" : constantText}e^{${exponent}}${shift}`;
  const solution = (x: number) => (C ?? 1) * Math.exp(a * x) + equilibrium;
  const residualOk = [-0.5, 0.2, 0.9].every((x) =>
    close(derivativeAt(solution, x), g(x, solution(x)), 1e-5),
  );
  if (!residualOk) throw new Unsolved("ode check");

  return solved({
    restated,
    topic: "differential-equations.first-order-linear",
    type: b === 0 ? "Exponential growth or decay" : "First-order linear ODE",
    method: "Separation of variables",
    why: "The right side is a constant multiple of y (plus a constant), so the variables separate and integrate to an exponential.",
    alternatives: "An integrating factor gives the same solution.",
    steps: [
      step(
        "Separate the variables",
        "Separation of variables",
        b === 0
          ? `\\frac{dy}{y} = ${aText}\\,dx`
          : `\\frac{dy}{y ${equilibrium > 0 ? "-" : "+"} ${exactLatex(Math.abs(equilibrium)).latex}} = ${aText}\\,dx`,
        "Move every y to the left and every x to the right.",
      ),
      step(
        "Integrate both sides",
        "Antiderivatives",
        `\\ln\\left|y${shift ? (equilibrium > 0 ? ` - ${exactLatex(equilibrium).latex}` : ` + ${exactLatex(-equilibrium).latex}`) : ""}\\right| = ${exponent} + K`,
        "The left side integrates to a logarithm and the right side to a linear function of x.",
        "Forgetting the constant of integration.",
      ),
      step(
        "Solve for y",
        "Exponentiate",
        `y = Ce^{${exponent}}${shift}`,
        "Exponentiating both sides turns the constant $K$ into a multiplicative constant $C = \\pm e^{K}$.",
      ),
      ...(initial
        ? [
            step(
              "Use the initial condition",
              "Initial value",
              `${formatNumber(initial.y)} = Ce^{${exponent.replace("x", `(${formatNumber(initial.x)})`)}}${shift} \\Rightarrow C = ${constantText}`,
              "Substitute the given point and solve for C.",
            ),
          ]
        : []),
    ],
    answer: C === undefined ? `y = Ce^{${exponent}}${shift}` : answer,
    plain: `$${C === undefined ? `y = Ce^{${exponent}}${shift}` : answer}$`,
    notes:
      b === 0
        ? a > 0
          ? "Exponential growth."
          : "Exponential decay."
        : `The equilibrium solution is y = ${exactLatex(equilibrium).latex}.`,
    checkMethod: "Substitution",
    checkDetail:
      "The derivative of the solution equals the right side at several points.",
    hints: [
      "Can you get all the y terms on one side and all the x terms on the other?",
      "Separate the variables and integrate.",
      "The left side integrates to a natural logarithm.",
    ],
  });
}
