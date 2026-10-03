// Python that runs inside Pyodide. It receives expressions already converted
// from LaTeX to SymPy syntax by latexToSympy.ts and only does the math.
// Every check is one-sided: it can confirm an answer, never declare one wrong,
// because a failure might come from the conversion rather than the answer.
export const CAS_PYTHON = String.raw`
import json, random
from sympy import (E, oo, pi, Symbol, Abs, sqrt, exp, log, sin, cos, tan, sec,
    csc, cot, asin, acos, atan, sinh, cosh, tanh, diff, limit, simplify, nsimplify,
    integrate, lambdify, N, zoo, nan)
from sympy.parsing.sympy_parser import (parse_expr, standard_transformations,
    implicit_multiplication_application)
import mpmath

TRANSFORMS = standard_transformations + (implicit_multiplication_application,)
NAMES = {"E": E, "e": E, "pi": pi, "oo": oo, "sqrt": sqrt, "exp": exp,
    "log": log, "ln": log, "sin": sin, "cos": cos, "tan": tan, "sec": sec,
    "csc": csc, "cot": cot, "asin": asin, "acos": acos, "atan": atan,
    "sinh": sinh, "cosh": cosh, "tanh": tanh, "Abs": Abs}
SAMPLES = [0.137, 0.291, 0.443, 0.618, 0.779, 0.905, 1.37, 2.11]

def parse(text, var):
    names = dict(NAMES)
    names[var] = Symbol(var)
    return parse_expr(text, local_dict=names, transformations=TRANSFORMS)

def is_zero(expr, x):
    extra = expr.free_symbols - {x}
    if extra:
        return False
    try:
        if simplify(expr) == 0:
            return True
    except Exception:
        pass
    f = lambdify(x, expr, "mpmath")
    checked = 0
    for point in SAMPLES:
        try:
            value = complex(f(mpmath.mpf(point)))
        except Exception:
            continue
        if value != value or abs(value) == float("inf"):
            continue
        if abs(value) > 1e-9:
            return False
        checked += 1
    return checked >= 4

def same_number(a, b):
    try:
        left, right = complex(N(a, 30)), complex(N(b, 30))
    except Exception:
        return False
    return abs(left - right) <= 1e-9 * max(1.0, abs(right))

def run(plan):
    x = Symbol(plan["variable"])
    kind = plan["kind"]
    answer = parse(plan["answer"], plan["variable"])
    if kind == "equivalent":
        return is_zero(parse(plan["expected"], plan["variable"]) - answer, x)
    expr = parse(plan["expr"], plan["variable"])
    if kind == "antiderivative":
        return is_zero(diff(answer, x) - expr, x)
    if kind == "derivative":
        return is_zero(diff(expr, x) - answer, x)
    if kind == "limit":
        point = parse(plan["point"], plan["variable"])
        return limit(expr, x, point) == simplify(answer)
    if kind == "definite":
        lower = parse(plan["lower"], plan["variable"])
        upper = parse(plan["upper"], plan["variable"])
        f = lambdify(x, expr, "mpmath")
        bounds = [mpmath.mpf(float(b)) if b.is_finite else (mpmath.inf if b > 0 else -mpmath.inf) for b in (lower, upper)]
        mpmath.mp.dps = 30
        numeric = mpmath.quad(f, bounds)
        target = complex(N(answer, 30))
        return abs(complex(numeric) - target) <= 1e-8 * max(1.0, abs(target))
    return False

def verify(plan_json):
    try:
        return json.dumps({"verified": bool(run(json.loads(plan_json)))})
    except Exception as error:
        return json.dumps({"verified": False, "error": type(error).__name__})
`;
