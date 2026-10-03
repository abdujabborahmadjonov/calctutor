// Short explainers for the topic browser, keyed by topic id from alberta.ts.
// Plain data, like the curriculum map, so they can be corrected without
// touching any code. Inline math uses $...$.
export const topicExplainers: Record<string, string> = {
  "precalc-review":
    "Calculus builds on functions, so this review covers the tools every later topic leans on: domain and range, composing and inverting functions, exponent and log laws, and the unit circle. Most calculus mistakes are algebra or trig mistakes, so time here pays off later.",
  limits:
    "A limit describes the value $f(x)$ approaches as $x$ approaches a point, whether or not $f$ is defined there. You evaluate limits with the limit laws, algebraic simplification, the squeeze theorem, and by comparing growth rates at infinity.",
  continuity:
    "A function is continuous at $a$ when $\\lim_{x\\to a} f(x) = f(a)$: the limit exists, the function is defined, and the two agree. The Intermediate Value Theorem says a continuous function on $[a,b]$ takes every value between $f(a)$ and $f(b)$.",
  "epsilon-delta":
    "The precise definition says $\\lim_{x\\to a} f(x) = L$ when for every $\\varepsilon > 0$ there is a $\\delta > 0$ with $|f(x) - L| < \\varepsilon$ whenever $0 < |x - a| < \\delta$. Proofs work backwards from the $\\varepsilon$ inequality to find a $\\delta$ that works.",
  "derivative-definition":
    "The derivative $f'(a) = \\lim_{h\\to 0} \\frac{f(a+h)-f(a)}{h}$ is the slope of the tangent line and the instantaneous rate of change. Differentiable functions are continuous, but a continuous function can fail to be differentiable at a corner or cusp.",
  "differentiation-rules":
    "The power, constant multiple, sum, product, quotient and chain rules let you differentiate without going back to the limit definition. The chain rule, $\\frac{d}{dx} f(g(x)) = f'(g(x))\\,g'(x)$, is the one most often forgotten.",
  "transcendental-derivatives":
    "Learn the derivatives of $\\sin$, $\\cos$, $\\tan$, $\\sec$, $e^x$, $a^x$, $\\ln x$ and $\\log_a x$, then combine them with the chain rule. Logarithmic differentiation handles products, quotients and variable exponents such as $x^x$.",
  "implicit-differentiation":
    "When $y$ is defined by an equation instead of a formula, differentiate both sides with respect to $x$, treating $y$ as a function of $x$, and solve for $\\frac{dy}{dx}$. The same idea gives the derivatives of the inverse trig functions.",
  "related-rates":
    "Related-rates problems link quantities that change with time. Write an equation relating them, differentiate both sides with respect to $t$, and only then substitute the values at the moment asked about.",
  "linear-approximation":
    "Near $x = a$, a differentiable function is close to its tangent line $L(x) = f(a) + f'(a)(x - a)$. Differentials estimate small changes, and Taylor polynomials extend the idea to higher-degree approximations.",
  mvt: "The Mean Value Theorem says a function continuous on $[a,b]$ and differentiable on $(a,b)$ has some $c$ with $f'(c) = \\frac{f(b)-f(a)}{b-a}$. Rolle's theorem is the case $f(a) = f(b)$, and the theorem explains why $f' > 0$ means $f$ is increasing.",
  extrema:
    "Absolute extrema on a closed interval occur at critical points (where $f' = 0$ or does not exist) or at the endpoints, so check them all. The first and second derivative tests classify local maxima and minima.",
  "curve-sketching":
    "The second derivative describes concavity: $f'' > 0$ means concave up, $f'' < 0$ concave down, and a sign change marks an inflection point. A full sketch combines domain, intercepts, asymptotes, increasing intervals and concavity.",
  optimization:
    "Translate the word problem into a function of one variable using the constraint, find its domain, then find the absolute maximum or minimum. Always confirm the answer is a maximum or minimum and answer the question that was asked.",
  lhopital:
    "For a limit of the form $\\frac{0}{0}$ or $\\frac{\\infty}{\\infty}$, L'Hôpital's rule lets you replace $\\frac{f}{g}$ with $\\frac{f'}{g'}$. Other indeterminate forms such as $0\\cdot\\infty$, $1^\\infty$ and $\\infty - \\infty$ must first be rewritten as a quotient, often with logarithms.",
  "newtons-method":
    "Newton's method finds roots of $f(x) = 0$ by following tangent lines: $x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}$. It converges quickly from a good starting guess but can fail when $f'(x_n)$ is near zero.",
  antiderivatives:
    "An antiderivative of $f$ is a function $F$ with $F' = f$; the general antiderivative adds $+ C$. Initial-value problems use a given point to find the value of $C$.",
  "riemann-ftc":
    "The definite integral is the limit of Riemann sums and measures signed area. The Fundamental Theorem of Calculus connects it to antiderivatives: $\\int_a^b f(x)\\,dx = F(b) - F(a)$, and $\\frac{d}{dx}\\int_a^x f(t)\\,dt = f(x)$.",
  substitution:
    "u-substitution reverses the chain rule: choose $u$ so that $du$ appears in the integrand, rewrite everything in $u$, and integrate. For definite integrals, change the bounds to $u$-values or substitute back before evaluating.",
  "numerical-integration":
    "When an antiderivative is hard or impossible to find, approximate the integral. The midpoint and trapezoidal rules use rectangles and trapezoids, Simpson's rule uses parabolas, and error bounds tell you how many subintervals you need.",
  "integration-by-parts":
    "Integration by parts reverses the product rule: $\\int u\\,dv = uv - \\int v\\,du$. Choose $u$ to be the factor that gets simpler when differentiated; some integrals need parts twice or the cyclic trick.",
  "trig-integrals":
    "Integrals of powers of $\\sin$ and $\\cos$ (or $\\sec$ and $\\tan$) are handled by saving one factor for $du$ and converting the rest with a Pythagorean identity. Even powers use the half-angle identities.",
  "trig-substitution":
    "Expressions like $\\sqrt{a^2 - x^2}$, $\\sqrt{a^2 + x^2}$ and $\\sqrt{x^2 - a^2}$ call for $x = a\\sin\\theta$, $a\\tan\\theta$ or $a\\sec\\theta$. Completing the square first turns other quadratics into one of these forms.",
  "partial-fractions":
    "A proper rational function can be split into simpler fractions according to the factors of its denominator: linear, repeated linear, and irreducible quadratic. Each piece integrates to a log, a power, or an arctangent.",
  "integration-strategy":
    "Faced with an unfamiliar integral, simplify first, then look for a substitution, then classify the integrand: products suggest parts, trig powers suggest identities, radicals suggest trig substitution, rational functions suggest partial fractions.",
  "improper-integrals":
    "An integral is improper when a bound is infinite or the integrand is unbounded on the interval. Write it as a limit of proper integrals; it converges if the limit exists, and comparison tests decide convergence without computing it.",
  "area-between-curves":
    "The area between two curves is the integral of the top function minus the bottom one. Find the intersection points for the bounds, and integrate with respect to $y$ when the region is easier to describe left to right.",
  volumes:
    "Volumes come from slicing: integrate the cross-sectional area. Disks and washers slice perpendicular to the axis of rotation, while cylindrical shells use $2\\pi \\cdot \\text{radius} \\cdot \\text{height}$ parallel to it.",
  "arc-length-surface-area":
    "The length of $y = f(x)$ from $a$ to $b$ is $\\int_a^b \\sqrt{1 + (f'(x))^2}\\,dx$. Surface area of revolution multiplies the arc-length element by $2\\pi$ times the distance to the axis.",
  "applications-physics":
    "Integrals add up small contributions: work is force times distance, the average value of $f$ on $[a,b]$ is $\\frac{1}{b-a}\\int_a^b f(x)\\,dx$, and centres of mass divide moments by total mass. Which of these appear depends on your course.",
  "differential-equations-intro":
    "A separable equation $\\frac{dy}{dx} = g(x)h(y)$ is solved by moving all $y$ terms to one side and integrating both sides. Exponential growth and decay, logistic growth and Newton's law of cooling are the standard models.",
  sequences:
    "A sequence converges when its terms approach a single number. Use limit laws, the squeeze theorem, or the related function of $x$; a monotone and bounded sequence always converges.",
  "series-basics":
    "A series converges when its sequence of partial sums converges. Geometric series $\\sum ar^n$ converge exactly when $|r| < 1$, telescoping series collapse, and if the terms do not go to $0$ the series diverges.",
  "series-tests":
    "Choose a convergence test by the form of the terms: p-series and the integral test for powers, comparison and limit comparison for similar terms, the alternating series test for alternating signs, and ratio or root tests for factorials and powers. A convergent series that is not absolutely convergent converges conditionally.",
  "power-series":
    "A power series $\\sum c_n (x-a)^n$ converges on an interval centred at $a$. The ratio test gives the radius; test each endpoint separately. Inside the interval you can differentiate and integrate term by term.",
  "taylor-series":
    "The Taylor series of $f$ at $a$ is $\\sum \\frac{f^{(n)}(a)}{n!}(x-a)^n$; at $a = 0$ it is a Maclaurin series. Known series for $e^x$, $\\sin x$, $\\cos x$ and $\\frac{1}{1-x}$ build others, and the Lagrange remainder bounds the error.",
  "parametric-polar":
    "Parametric curves give $x$ and $y$ as functions of $t$, with slope $\\frac{dy/dt}{dx/dt}$. In polar coordinates the area inside $r = f(\\theta)$ is $\\frac12\\int r^2\\,d\\theta$. Coverage varies by course.",
  "complex-numbers":
    "Complex numbers $a + bi$ extend the reals so every polynomial has roots. Polar form and Euler's formula $e^{i\\theta} = \\cos\\theta + i\\sin\\theta$ make multiplication, powers and roots simple.",
};
