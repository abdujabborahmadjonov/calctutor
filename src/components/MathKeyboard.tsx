"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Delete } from "lucide-react";

import { cn } from "@/lib/utils";

// Where the caret lands after a key is inserted.
export const CARET = "§";

export type MathKey = {
  label: string;
  insert: string;
  name: string;
  wide?: boolean;
};

const key = (label: string, insert: string, name = label, wide = false) => ({
  label,
  insert,
  name,
  wide,
});

const PAGES: Array<{ id: string; name: string; keys: MathKey[] }> = [
  {
    id: "basic",
    name: "123",
    keys: [
      key("x", "x"),
      key("y", "y"),
      key("7", "7"),
      key("8", "8"),
      key("9", "9"),
      key("÷", "/", "divide"),
      key("a/b", `\\frac{${CARET}}{}`, "fraction"),
      key("x²", "^{2}", "square"),
      key("4", "4"),
      key("5", "5"),
      key("6", "6"),
      key("×", "\\cdot ", "times"),
      key("xⁿ", `^{${CARET}}`, "power"),
      key("√", `\\sqrt{${CARET}}`, "square root"),
      key("1", "1"),
      key("2", "2"),
      key("3", "3"),
      key("−", "-", "minus"),
      key("(", "("),
      key(")", ")"),
      key("0", "0"),
      key(".", ".", "decimal point"),
      key("=", "=", "equals"),
      key("+", "+", "plus"),
      key("π", "\\pi ", "pi"),
      key("e", "e"),
      key("ⁿ√", `\\sqrt[${CARET}]{}`, "nth root"),
      key("|x|", `\\left|${CARET}\\right|`, "absolute value"),
      key("±", "\\pm ", "plus or minus"),
      key("%", "\\%", "percent"),
    ],
  },
  {
    id: "functions",
    name: "f(x)",
    keys: [
      key("sin", `\\sin(${CARET})`, "sine"),
      key("cos", `\\cos(${CARET})`, "cosine"),
      key("tan", `\\tan(${CARET})`, "tangent"),
      key("sin⁻¹", `\\arcsin(${CARET})`, "arcsine"),
      key("cos⁻¹", `\\arccos(${CARET})`, "arccosine"),
      key("tan⁻¹", `\\arctan(${CARET})`, "arctangent"),
      key("ln", `\\ln(${CARET})`, "natural log"),
      key("log", `\\log_{10}(${CARET})`, "log base 10"),
      key("logₐ", `\\log_{${CARET}}()`, "log base a"),
      key("eˣ", `e^{${CARET}}`, "e to the power"),
      key("sec", `\\sec(${CARET})`, "secant"),
      key("csc", `\\csc(${CARET})`, "cosecant"),
      key("cot", `\\cot(${CARET})`, "cotangent"),
      key("n!", "!", "factorial"),
      key("°", "^{\\circ}", "degrees"),
      key("θ", "\\theta ", "theta"),
      key("<", "<", "less than"),
      key(">", ">", "greater than"),
      key("≤", "\\le ", "less than or equal"),
      key("≥", "\\ge ", "greater than or equal"),
      key("≠", "\\ne ", "not equal"),
      key("≈", "\\approx ", "approximately"),
      key("f(x)", "f(x)", "f of x"),
      key("x₁", `_{${CARET}}`, "subscript"),
    ],
  },
  {
    id: "calculus",
    name: "∫ d/dx",
    keys: [
      key("d/dx", `\\frac{d}{dx}\\left(${CARET}\\right)`, "derivative"),
      key(
        "∂/∂x",
        `\\frac{\\partial}{\\partial x}\\left(${CARET}\\right)`,
        "partial derivative",
      ),
      key("∫", `\\int ${CARET}\\,dx`, "integral"),
      key("∫ₐᵇ", `\\int_{${CARET}}^{}\\,dx`, "definite integral"),
      key("lim", `\\lim_{x \\to ${CARET}}`, "limit"),
      key("Σ", `\\sum_{n=1}^{${CARET}}`, "sum"),
      key("∞", "\\infty ", "infinity"),
      key("y′", "y'", "y prime"),
      key("y″", "y''", "y double prime"),
      key("dy/dx", "\\frac{dy}{dx}", "dy over dx"),
      key("∬", `\\iint ${CARET}\\,dA`, "double integral"),
      key("→", "\\to ", "approaches"),
    ],
  },
  {
    id: "algebra",
    name: "[ ] αβ",
    keys: [
      key(
        "2×2",
        `\\begin{pmatrix} ${CARET} & \\\\ & \\end{pmatrix}`,
        "2 by 2 matrix",
        true,
      ),
      key(
        "3×3",
        `\\begin{pmatrix} ${CARET} & & \\\\ & & \\\\ & & \\end{pmatrix}`,
        "3 by 3 matrix",
        true,
      ),
      key(
        "{ system",
        `\\begin{cases} ${CARET} \\\\ \\end{cases}`,
        "system of equations",
        true,
      ),
      key("det", `\\det`, "determinant"),
      key("vec", `\\vec{${CARET}}`, "vector"),
      key("α", "\\alpha ", "alpha"),
      key("β", "\\beta ", "beta"),
      key("λ", "\\lambda ", "lambda"),
      key("μ", "\\mu ", "mu"),
      key("σ", "\\sigma ", "sigma"),
      key("Δ", "\\Delta ", "delta"),
      key("ω", "\\omega ", "omega"),
      key("∈", "\\in ", "element of"),
      key("∪", "\\cup ", "union"),
      key("∩", "\\cap ", "intersection"),
      key("ℝ", "\\mathbb{R}", "real numbers"),
      key("nCr", `\\binom{${CARET}}{}`, "choose"),
      key("i", "i", "imaginary unit"),
    ],
  },
];

type MathKeyboardProps = {
  onKey: (insert: string) => void;
  onBackspace: () => void;
  onMove: (delta: number) => void;
  className?: string;
};

export function MathKeyboard({
  onKey,
  onBackspace,
  onMove,
  className,
}: MathKeyboardProps) {
  const [page, setPage] = useState(PAGES[0].id);
  const current = PAGES.find((item) => item.id === page) ?? PAGES[0];

  // Keys never take focus, so the caret stays in the problem box.
  const keep = (event: React.PointerEvent | React.MouseEvent) =>
    event.preventDefault();

  return (
    <div
      className={cn(
        "rounded-2xl border bg-muted/50 p-2 select-none dark:bg-muted/30",
        className,
      )}
      role="group"
      aria-label="Math keyboard"
    >
      <div className="mb-2 flex items-center gap-1">
        <div className="flex flex-1 gap-1 overflow-x-auto" role="tablist">
          {PAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === page}
              onPointerDown={keep}
              onClick={() => setPage(item.id)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                item.id === page
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Move left"
          onPointerDown={keep}
          onClick={() => onMove(-1)}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Move right"
          onPointerDown={keep}
          onClick={() => onMove(1)}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <ArrowRight className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Delete"
          onPointerDown={keep}
          onClick={onBackspace}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <Delete className="size-4" />
        </button>
      </div>
      <div
        className={cn(
          "grid gap-1.5",
          current.id === "basic" ? "grid-cols-6" : "grid-cols-4 sm:grid-cols-6",
        )}
      >
        {current.keys.map((item) => {
          const digit = /^[0-9.]$/.test(item.label);
          return (
            <button
              key={item.name + item.label}
              type="button"
              aria-label={`Insert ${item.name}`}
              onPointerDown={keep}
              onClick={() => onKey(item.insert)}
              className={cn(
                "h-11 rounded-xl text-[15px] font-medium shadow-[0_1px_0_0] shadow-foreground/10 transition active:scale-95",
                digit
                  ? "bg-background text-foreground"
                  : "bg-background/70 text-foreground/90 hover:bg-background",
                item.wide && "col-span-2",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Inserts a key into text at the selection; returns the new text and caret.
export function insertKey(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  insert: string,
) {
  const marker = insert.indexOf(CARET);
  const clean = insert.replace(CARET, "");
  const next =
    value.slice(0, selectionStart) + clean + value.slice(selectionEnd);
  const caret = selectionStart + (marker >= 0 ? marker : clean.length);
  return { value: next, caret };
}
