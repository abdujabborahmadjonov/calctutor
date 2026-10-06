// Numeric checks for the built-in solver: every symbolic result is tested at
// sample points before it is shown, so a library bug becomes "could not
// solve offline" rather than a wrong answer.

import {
  evaluateNode,
  formatNumber,
  type MathNode,
  toFraction,
} from "@/lib/math/evaluate";

// Points avoid integers and simple fractions, where special cases hide.
export const SAMPLES = [
  -2.37, -1.41, -0.73, -0.29, 0.31, 0.77, 1.29, 1.93, 2.61,
];

export type Fn = (x: number) => number;

export function fnOf(node: MathNode, variable: string): Fn {
  return (x) => evaluateNode(node, { [variable]: x });
}

export function close(a: number, b: number, tolerance = 1e-7) {
  return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
}

// True when f and g agree wherever both are defined, at enough points.
export function sameFunction(f: Fn, g: Fn, points = SAMPLES, tolerance = 1e-7) {
  let compared = 0;
  for (const x of points) {
    const a = f(x);
    const b = g(x);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (!close(a, b, tolerance)) return false;
    compared += 1;
  }
  return compared >= 3;
}

export function derivativeAt(f: Fn, x: number) {
  const h = 1e-5 * Math.max(1, Math.abs(x));
  return (f(x + h) - f(x - h)) / (2 * h);
}

// The symbolic derivative matches a central difference of f.
export function isDerivative(f: Fn, derivative: Fn) {
  return sameFunction((x) => derivativeAt(f, x), derivative, SAMPLES, 1e-5);
}

// Adaptive Simpson's rule on a finite interval.
export function integrate(f: Fn, a: number, b: number): number {
  const simpson = (
    lo: number,
    hi: number,
    flo: number,
    fmid: number,
    fhi: number,
  ) => ((hi - lo) / 6) * (flo + 4 * fmid + fhi);
  const recurse = (
    lo: number,
    hi: number,
    flo: number,
    fmid: number,
    fhi: number,
    whole: number,
    depth: number,
  ): number => {
    const mid = (lo + hi) / 2;
    const leftMid = f((lo + mid) / 2);
    const rightMid = f((mid + hi) / 2);
    const left = simpson(lo, mid, flo, leftMid, fmid);
    const right = simpson(mid, hi, fmid, rightMid, fhi);
    if (depth <= 0 || Math.abs(left + right - whole) < 1e-11) {
      return left + right + (left + right - whole) / 15;
    }
    return (
      recurse(lo, mid, flo, leftMid, fmid, left, depth - 1) +
      recurse(mid, hi, fmid, rightMid, fhi, right, depth - 1)
    );
  };
  const fa = f(a);
  const fb = f(b);
  const fm = f((a + b) / 2);
  return recurse(a, b, fa, fm, fb, simpson(a, b, fa, fm, fb), 40);
}

// Real roots of f in [low, high] by sign change and bisection.
export function realRoots(f: Fn, low: number, high: number, samples = 4000) {
  const roots: number[] = [];
  const step = (high - low) / samples;
  let x0 = low;
  let y0 = f(x0);
  for (let index = 1; index <= samples; index += 1) {
    const x1 = low + index * step;
    const y1 = f(x1);
    if (Number.isFinite(y0) && Number.isFinite(y1)) {
      if (y0 === 0) roots.push(x0);
      else if (y0 * y1 < 0) {
        let [a, b, fa] = [x0, x1, y0];
        for (let iteration = 0; iteration < 80; iteration += 1) {
          const mid = (a + b) / 2;
          const fm = f(mid);
          if (fa * fm <= 0) b = mid;
          else [a, fa] = [mid, fm];
        }
        const root = (a + b) / 2;
        // A sign change across a pole is not a root.
        if (Math.abs(f(root)) < 1e-6) roots.push(root);
      }
    }
    [x0, y0] = [x1, y1];
  }
  return roots.filter(
    (root, index) => index === 0 || Math.abs(root - roots[index - 1]) > step,
  );
}

// Recognizes a decimal as an exact value: a fraction, a rational multiple
// of pi, a square root of a rational, or a multiple of e. Falls back to a
// rounded decimal.
export function exactLatex(value: number): { latex: string; exact: boolean } {
  if (!Number.isFinite(value)) {
    return { latex: value > 0 ? "\\infty" : "-\\infty", exact: true };
  }
  const sign = value < 0 ? "-" : "";
  const magnitude = Math.abs(value);
  const fraction = toFraction(magnitude, 1000);
  if (
    fraction &&
    Math.abs(fraction.numerator / fraction.denominator - magnitude) < 1e-12
  ) {
    const { numerator, denominator } = fraction;
    return {
      latex:
        denominator === 1
          ? `${sign}${numerator}`
          : `${sign}\\frac{${numerator}}{${denominator}}`,
      exact: true,
    };
  }
  const multiple = (constant: number, symbol: string) => {
    const ratio = toFraction(magnitude / constant, 24);
    if (
      !ratio ||
      Math.abs((ratio.numerator / ratio.denominator) * constant - magnitude) >
        1e-11
    ) {
      return undefined;
    }
    const top = ratio.numerator === 1 ? symbol : `${ratio.numerator}${symbol}`;
    return ratio.denominator === 1
      ? `${sign}${top}`
      : `${sign}\\frac{${top}}{${ratio.denominator}}`;
  };
  const piForm = multiple(Math.PI, "\\pi");
  if (piForm) return { latex: piForm, exact: true };
  const square = toFraction(magnitude * magnitude, 400);
  if (
    square &&
    Math.abs(Math.sqrt(square.numerator / square.denominator) - magnitude) <
      1e-12
  ) {
    const { numerator, denominator } = square;
    // sqrt(p/q) shown as a simplified radical when q is 1.
    if (denominator === 1)
      return { latex: `${sign}${radical(numerator)}`, exact: true };
    return {
      latex: `${sign}\\frac{${radical(numerator * denominator)}}{${denominator}}`,
      exact: true,
    };
  }
  const eForm = multiple(Math.E, "e");
  if (eForm) return { latex: eForm, exact: true };
  // e^k for a simple rational k, and ln k for a whole number k.
  const power = toFraction(Math.log(magnitude), 12);
  if (
    power &&
    Math.abs(Math.exp(power.numerator / power.denominator) - magnitude) <
      1e-10 * magnitude
  ) {
    const exponent =
      power.denominator === 1
        ? `${power.numerator}`
        : `\\frac{${power.numerator}}{${power.denominator}}`;
    return { latex: `${sign}e^{${exponent}}`, exact: true };
  }
  const exponential = Math.exp(magnitude);
  if (
    Math.abs(exponential - Math.round(exponential)) < 1e-9 * exponential &&
    Math.round(exponential) <= 10_000
  ) {
    return { latex: `${sign}\\ln ${Math.round(exponential)}`, exact: true };
  }
  return {
    latex: `${sign}${formatNumber(Number(magnitude.toPrecision(8)))}`,
    exact: false,
  };
}

// sqrt(12) as 2\sqrt{3}.
function radical(n: number) {
  let outside = 1;
  let inside = n;
  for (let k = 2; k * k <= inside; k += 1) {
    while (inside % (k * k) === 0) {
      outside *= k;
      inside /= k * k;
    }
  }
  if (inside === 1) return String(outside);
  return `${outside === 1 ? "" : outside}\\sqrt{${inside}}`;
}
