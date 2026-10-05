// Pure helpers for the graph: sampling with breaks at asymptotes, tick
// spacing, key points, and which curves a solution should show.

import type { Solution } from "@/lib/ai/schemas";
import { cleanAnswerLatex } from "@/lib/verify/plan";

import { compileMath, graphExpression } from "./evaluate";

export type Fn = (x: number) => number;

export type Curve = {
  label: string;
  latex: string;
  fn: Fn;
  // Shade the area under this curve between two x values.
  shade?: [number, number];
};

export type View = { xMin: number; xMax: number; yMin: number; yMax: number };

export const DEFAULT_VIEW: View = { xMin: -10, xMax: 10, yMin: -7, yMax: 7 };

// Compiles a one-variable function of x (any single letter is accepted as
// the variable). Returns undefined for constants with no variable only when
// allowConstant is false.
export function compileFunction(
  source: string,
  { allowConstant = true } = {},
): Fn | undefined {
  const compiled = compileMath(graphExpression(source));
  if (!compiled) return undefined;
  if (compiled.variables.length > 1) return undefined;
  if (compiled.variables.length === 0 && !allowConstant) return undefined;
  const variable = compiled.variables[0] ?? "x";
  return (x) => compiled.evaluate({ [variable]: x });
}

// Splits a curve into polyline segments in data coordinates, breaking where
// the function is undefined or jumps across an asymptote.
export function sampleCurve(fn: Fn, view: View, samples = 600) {
  const segments: Array<Array<[number, number]>> = [];
  let current: Array<[number, number]> = [];
  const span = view.yMax - view.yMin;
  const step = (view.xMax - view.xMin) / samples;
  let previous: number | undefined;

  for (let index = 0; index <= samples; index += 1) {
    const x = view.xMin + index * step;
    let y: number;
    try {
      y = fn(x);
    } catch {
      y = NaN;
    }
    const jump =
      previous !== undefined &&
      Number.isFinite(y) &&
      Math.abs(y - previous) > span * 4;
    if (!Number.isFinite(y) || jump) {
      if (current.length > 1) segments.push(current);
      current = [];
      previous = Number.isFinite(y) ? y : undefined;
      if (Number.isFinite(y)) current.push([x, y]);
      continue;
    }
    current.push([x, y]);
    previous = y;
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

// Tick spacing of 1, 2 or 5 times a power of ten, about `target` per axis.
export function tickStep(span: number, target = 8) {
  const raw = span / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const scaled = raw / power;
  const nice = scaled < 1.5 ? 1 : scaled < 3.5 ? 2 : scaled < 7.5 ? 5 : 10;
  return nice * power;
}

export function ticks(min: number, max: number, step: number) {
  const values: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max; value += step) {
    values.push(
      Math.abs(value) < step / 1e6 ? 0 : Number(value.toPrecision(12)),
    );
  }
  return values;
}

export type KeyPoint = { x: number; y: number; kind: "root" | "y-intercept" };

// Roots by sign change and bisection, plus the y-intercept, inside the view.
export function keyPoints(fn: Fn, view: View, samples = 800): KeyPoint[] {
  const points: KeyPoint[] = [];
  const safe = (x: number) => {
    try {
      return fn(x);
    } catch {
      return NaN;
    }
  };
  const step = (view.xMax - view.xMin) / samples;
  const span = view.yMax - view.yMin;

  let x0 = view.xMin;
  let y0 = safe(x0);
  for (let index = 1; index <= samples; index += 1) {
    const x1 = view.xMin + index * step;
    const y1 = safe(x1);
    if (Number.isFinite(y0) && Number.isFinite(y1)) {
      if (y0 === 0) {
        points.push({ x: x0, y: 0, kind: "root" });
      } else if (y0 * y1 < 0 && Math.abs(y1 - y0) < span) {
        let [a, b, fa] = [x0, x1, y0];
        for (let iteration = 0; iteration < 60; iteration += 1) {
          const mid = (a + b) / 2;
          const fm = safe(mid);
          if (!Number.isFinite(fm)) break;
          if (fa * fm <= 0) b = mid;
          else [a, fa] = [mid, fm];
        }
        points.push({ x: (a + b) / 2, y: 0, kind: "root" });
      }
    }
    [x0, y0] = [x1, y1];
  }

  const yIntercept = safe(0);
  if (
    view.xMin <= 0 &&
    view.xMax >= 0 &&
    Number.isFinite(yIntercept) &&
    !points.some((point) => Math.abs(point.x) < 1e-9)
  ) {
    points.push({ x: 0, y: yIntercept, kind: "y-intercept" });
  }

  // Merge near-duplicates from tangent roots.
  return points.filter(
    (point, index) =>
      !points
        .slice(0, index)
        .some(
          (other) =>
            other.kind === point.kind && Math.abs(other.x - point.x) < step,
        ),
  );
}

// Fits the y range to the curves over the x range, ignoring spikes.
export function fitView(fns: Fn[], xMin = -10, xMax = 10): View {
  const values: number[] = [];
  for (const fn of fns) {
    for (let index = 0; index <= 200; index += 1) {
      const x = xMin + ((xMax - xMin) * index) / 200;
      let y: number;
      try {
        y = fn(x);
      } catch {
        continue;
      }
      if (Number.isFinite(y)) values.push(y);
    }
  }
  if (values.length < 10) return { ...DEFAULT_VIEW, xMin, xMax };
  values.sort((left, right) => left - right);
  const low = values[Math.floor(values.length * 0.05)];
  const high = values[Math.ceil(values.length * 0.95) - 1];
  const yMin = Math.min(low, 0);
  const yMax = Math.max(high, 0);
  const span = Math.max(yMax - yMin, 2);
  const padding = span * 0.15;
  return {
    xMin,
    xMax,
    yMin: yMin - padding,
    yMax: Math.max(yMax, yMin + 2) + padding,
  };
}

const SPACING = /\\[,;!: ]|\\quad|\\qquad|\\displaystyle/g;

function stripOuter(latex: string) {
  const trimmed = latex.trim();
  const brackets = trimmed
    .replace(/^\\left\s*[[(]/, "(")
    .replace(/\\right\s*[\])]$/, ")");
  return /^[[(].*[\])]$/.test(brackets) ? brackets.slice(1, -1) : trimmed;
}

function splitEquals(latex: string) {
  let depth = 0;
  const positions: number[] = [];
  for (let index = 0; index < latex.length; index += 1) {
    const char = latex[index];
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (char === "=" && depth === 0) positions.push(index);
  }
  return positions.length === 1
    ? [latex.slice(0, positions[0]), latex.slice(positions[0] + 1)]
    : undefined;
}

const BOUND = String.raw`(\{[^{}]*\}|[^\s{}\\]|\\pi)`;

// The curves that illustrate a solution: both sides of an equation, a
// function and its derivative, an integrand and its antiderivative (with the
// area shaded for a definite integral), or the answer when it is a function.
export function curvesForSolution(solution: Solution): Curve[] {
  if (solution.status !== "solved") return [];
  const problem = solution.problem.restated_latex
    .replaceAll(SPACING, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
  if (/\\text|\\begin|\\sum|\\lim|,/.test(problem)) return [];

  const answerLatex = cleanAnswerLatex(solution.final_answer.latex);
  const answerFn = /\\text|DNE/.test(answerLatex)
    ? undefined
    : compileFunction(answerLatex, { allowConstant: false });

  const curve = (label: string, latex: string, fn?: Fn): Curve[] =>
    fn ? [{ label, latex, fn }] : [];

  // "\frac{dx}{g}" puts the differential in the numerator.
  const integrand = (body: string) => {
    const fraction = body.match(/^\\frac\{\s*d[a-z]\s*\}\{(.+)\}$/);
    if (fraction) return `\\frac{1}{${fraction[1]}}`;
    return body.match(/^(.+?)\s*d[a-z]$/)?.[1];
  };

  const definite = problem.match(
    new RegExp(String.raw`^\\int_${BOUND}\^${BOUND}\s*(.+)$`),
  );
  if (definite) {
    const unwrap = (value: string) => value.replace(/^\{|\}$/g, "");
    const lower = compileMath(unwrap(definite[1]))?.evaluate();
    const upper = compileMath(unwrap(definite[2]))?.evaluate();
    const body = integrand(definite[3].trim());
    const fn = body ? compileFunction(body) : undefined;
    if (!body || !fn) return [];
    const shade =
      lower !== undefined &&
      upper !== undefined &&
      Number.isFinite(lower) &&
      Number.isFinite(upper)
        ? ([lower, upper] as [number, number])
        : undefined;
    return [{ label: "Integrand", latex: body, fn, shade }];
  }

  const indefinite = problem.match(/^\\int\s*(.+)$/);
  const indefiniteBody = indefinite && integrand(indefinite[1].trim());
  if (indefiniteBody) {
    return [
      ...curve("Integrand", indefiniteBody, compileFunction(indefiniteBody)),
      ...curve("Antiderivative (C = 0)", answerLatex, answerFn),
    ];
  }

  const derivative = problem.match(/^\\frac\{d\}\{d([a-z])\}\s*(.+)$/);
  if (derivative) {
    const inner = stripOuter(derivative[2]);
    return [
      ...curve(
        "Function",
        inner,
        compileFunction(inner, { allowConstant: false }),
      ),
      ...curve("Derivative", answerLatex, answerFn),
    ];
  }

  const sides = splitEquals(problem);
  if (sides) {
    const [left, right] = sides.map((side) => side.trim());
    const leftFn = compileFunction(left);
    const rightFn = compileFunction(right);
    if (!leftFn || !rightFn) return [];
    // An equation with no variable, or in two variables, is not graphed.
    if (!compileFunction(`${left}-(${right})`, { allowConstant: false })) {
      return [];
    }
    const rightIsZero = /^0$/.test(right);
    return [
      { label: "Left side", latex: left, fn: leftFn },
      ...(rightIsZero
        ? []
        : [{ label: "Right side", latex: right, fn: rightFn }]),
    ];
  }

  return curve("Answer", answerLatex, answerFn);
}

// A view that frames the interesting part: the shaded interval, or the
// roots of the first curve, or the default window.
export function suggestView(curves: Curve[]): View {
  const fns = curves.map((curve) => curve.fn);
  const shaded = curves.find((curve) => curve.shade)?.shade;
  let focus: [number, number] | undefined = shaded;

  if (!focus && curves[0]) {
    const roots = keyPoints(curves[0].fn, DEFAULT_VIEW)
      .filter((point) => point.kind === "root")
      .map((point) => point.x);
    if (roots.length > 0) focus = [Math.min(...roots), Math.max(...roots)];
  }
  if (!focus) return fitView(fns);

  const [low, high] = focus;
  const margin = Math.max(3, (high - low) * 0.75);
  return fitView(fns, Math.min(low - margin, -1), Math.max(high + margin, 1));
}
