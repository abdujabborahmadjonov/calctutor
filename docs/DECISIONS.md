# CalcTutor decisions

## 2026-10-02 — Phase 0 scaffold

- Use Next.js 16.3.8, React 19.2.8, Tailwind CSS 4.3.3, and TypeScript 5.9.3,
  which were the current stable npm releases when Phase 0 was scaffolded. All
  direct dependencies are pinned exactly.
- Use the official shadcn/ui `base-nova` initialization and its generated
  Button primitive. Its direct support packages are retained because they are
  required by the selected shadcn/ui style.
- Require `ANTHROPIC_API_KEY` whenever `MOCK_AI=false`. Mock mode permits local
  UI and test work without a secret; `.env.example` enables mock mode.
- Keep `/api/health` independent of AI configuration so infrastructure can
  distinguish application health from a missing or exhausted upstream AI
  service.
- Use jsdom 29.1.1 rather than jsdom 30 because the current environment runs
  Node.js 22.14 and jsdom 30 requires Node.js 22.22.2 or newer.
- Defer `scripts/smoke.ts` to Phase 1, where the specification introduces its
  golden-problem fixtures and real Claude API path. Phase 0 has no solve path
  and therefore no measurable cost per solve.

## 2026-10-02 — Phase 1 text solver

- Golden smoke uses `SMOKE_EXPECT_MODE` (`mock` or `anthropic`) and asserts the
  `X-CalcTutor-AI-Mode` response header matches, so fixture runs cannot be
  mistaken for live API results.
- Root layout uses an explicit `ReactNode` children prop instead of generated
  `LayoutProps`, keeping `tsc --noEmit` reliable before the first production
  build generates `.next/types`.
- Real-API smoke was not executed in the cloud agent environment because
  `ANTHROPIC_API_KEY` was unavailable; mock smoke (8/8) validates fixtures and
  the solve HTTP path.

## 2026-10-03 — Phase 2 photos and streaming

- `AI_STREAMING` now defaults to `true` (and `.env.example` sets it), because
  Phase 2 makes streaming the primary solve path. `AI_STREAMING=false` keeps
  the Phase 1 non-streaming JSON response; the client handles both.
- The streamed `/api/solve` response is NDJSON with five event types
  (`start`, `delta`, `reset`, `done`, `error`), defined once in
  `lib/ai/stream-events.ts` and validated on both sides. `delta` carries the
  raw structured-output JSON text; the browser parses it with `partial-json`
  and renders the strategy and each step only once that object is complete.
  `done` carries the server-validated solution, which replaces the partial
  view. `reset` tells the client to discard text when the one allowed retry
  (after `max_tokens` or an invalid first answer) starts.
- Streaming routes pull the first event before sending the HTTP response, so
  budget and missing-key failures still return 503 instead of a 200 stream
  that fails on its first line. Failures after streaming starts become an
  `error` event with the same `{ code, message }` shape.
- `partial-json` 0.1.7 was added; the spec names it for incremental parsing.
- `/api/transcribe` checks the image server-side as well as in the browser:
  the magic bytes must match the declared type (JPEG, PNG or WebP), and the
  header dimensions must be at most 2000 px on the long edge. This bounds cost
  even if a client skips the resize. The image is never logged or stored.
- A resized 2000 px JPEG at quality 0.9 is about 0.5–1.5 MB (under 2 MB as
  base64), which fits within Vercel's 4.5 MB request-body limit.
- The confirmation screen flags low- and medium-confidence readings with a
  badge and lists each ambiguity note above an editable LaTeX box. It does not
  highlight individual symbols inside the rendered math, because the
  transcription schema reports ambiguities as sentences, not character ranges.
- `/api/explain-step` uses Haiku 4.5 with no `effort` (unsupported there) and
  no `cache_control`: its system prompt is far below Haiku's minimum cacheable
  length, so caching would silently do nothing. It shares the solve rate limit
  under its own key.
- The mock transcription fixture holds two problems from the existing solve
  fixtures (integration by parts and the sine limit), so the multi-problem
  picker and the downstream solve both work offline.
- The transcription golden case uses
  `scripts/fixtures/handwritten-x2-lnx.jpg`, an image rendered in a
  handwriting font on lined paper. It is a stand-in that makes the smoke
  script reproducible; it does not replace the spec's device test with real
  handwritten photos on iOS Safari and Android Chrome.
- Fixed a Phase 1 bug: `ANTHROPIC_API_KEY=` (blank, as in `.env.example`)
  failed env validation and crashed every AI route under `next dev`. A blank
  key now counts as unset.
- On phone widths, starting a solve scrolls the solution into view, since it
  sits below both inputs.

## 2026-10-03 — Phase 3 learning features

- **Pyodide is self-hosted, not loaded from a CDN.** `scripts/vendor-pyodide.ts`
  (run by `predev` and `prebuild`) copies the runtime from the pinned `pyodide`
  npm package (314.0.7) into `public/pyodide/` and downloads the SymPy 1.14.0
  and mpmath 1.3.0 wheels from PyPI, checking each against a pinned sha256.
  Reasons: no third-party script at runtime, and it works in networks that
  block jsdelivr (this build environment does). The folder is gitignored.
  mpmath is pinned to 1.3.0 because SymPy 1.14 requires `mpmath<1.4`.
- **The CAS worker is started from a Blob, not bundled.** Pyodide only runs in
  module workers, and Turbopack emitted the bundled worker as a classic
  script. The worker source is a small JavaScript string in
  `lib/verify/sympy.worker.ts`; it receives the asset paths and the Python
  program in each message.
- **LaTeX is converted in TypeScript, not by SymPy's LaTeX parser.** SymPy's
  `lark` backend misread ordinary input (for example
  `2x\sin(3x)+3x^2\cos(3x)` became `2x·sin(3x²+3x)·cos(3x)`), and the `antlr`
  backend needs an extra runtime. `lib/verify/latexToSympy.ts` handles the
  notation solutions use and refuses anything else; Python only runs
  `parse_expr` and the math.
- **Verification is one-sided.** A check can confirm an answer ("Verified with
  SymPy") but never declare one wrong, because a failed check might come from
  the conversion rather than the answer; everything else shows "Could not
  verify". Equalities are confirmed symbolically (`simplify`) or at four or
  more numeric sample points; definite integrals are compared with
  `mpmath.quad`, which handles endpoint singularities such as
  $\int_0^1 dx/\sqrt{1-x^2}$. Series verdicts, word problems and prose
  answers are not attempted.
- **Pyodide loads only when needed.** The badge mounts with the final answer
  and imports the CAS client lazily; solutions without a checkable form never
  load it. The first check downloads about 19 MB (cached afterwards) and took
  about 6 s in headless Chromium; later checks take milliseconds.
- **Graded compare uses the same worker.** Practice problems and Learn mode
  compare the student's answer with the expected one. A failed comparison says
  SymPy "could not match" the answers rather than "wrong", and an answer that
  cannot be read, or a check that could not run, asks the student to compare by
  eye. Learn mode hides the "Show the answer" link, since "Reveal solution"
  already exists there.
- **`/api/similar` uses the light model (Haiku 4.5)** per the spec, with no
  effort setting. It takes an optional problem: empty for topic practice. An
  unknown `topic_id` from a solve falls back to the covered-up-to topic.
- **`/api/check-work` uses the solve model at high effort**, a dedicated system
  prompt, and the solve rate limit under its own key. The confirmation screen
  offers "Check my work" whenever a photo includes the student's own working.
- **One helper for structured calls.** `lib/ai/structured.ts` holds the
  parse-call rules (max_tokens retry with double the limit, refusal handling,
  Zod validation, usage logging); transcribe, similar and check-work use it.
- **PDF export uses the browser's print dialog** ("Print or save as PDF") with
  print styles that hide everything but the solution. This needs no new
  dependency. Markdown export is generated in the browser.
- **Topic browser** pages are static (`generateStaticParams`), with explainers
  kept as editable data in `lib/curriculum/explainers.ts` (a test checks every
  topic has one). "Report a wrong topic" opens a prefilled GitHub issue on
  this repository, since the app has no contact address yet.

## 2026-10-03 — Autonomous build run (docs/RUN.md)

- The run started from the Phase 0–3 branch instead of an empty repository,
  so it closed the gaps RUN.md names rather than rebuilding phases.
- No API key was available in the run's session, so everything ran with
  `MOCK_AI=true` (RUN.md's fallback). The real-API smoke run is open.
- The app's key is read from `CALCTUTOR_ANTHROPIC_API_KEY`, falling back to
  `ANTHROPIC_API_KEY`, and validated on the first AI call
  (`getAnthropicApiKey`), not at import.
- Golden-problem inputs live in `src/fixtures/problems.json`, next to the
  existing solution fixtures, rather than a top-level `fixtures/` folder, so
  every fixture stays under the `@/` alias.
- The smoke script calls `lib/ai` directly with tsx under the
  `react-server` condition; `server-only` is installed as a package (it is the
  package Next.js expects for `import "server-only"`) so it resolves outside
  Next.
- The mock-mode banner asks `/api/mode` at runtime: pages are prerendered, so a
  server-rendered banner would show the build-time setting. `/api/health`
  stays independent of AI configuration.
- `@playwright/test` is pinned to 1.56.1 to match the pre-installed Chromium;
  CI installs its own browser. `tsx` runs the scripts.
- Every finished AI attempt counts against `DAILY_TOKEN_BUDGET`, including one
  cut off at `max_tokens` or refused, and a stream the student abandons is
  aborted upstream and its reported usage recorded.
- The SymPy equivalence check samples negative as well as positive points, so
  answers that agree only for x > 0 (such as `2\ln x` and `\ln(x^2)`) are not
  graded as equal.
- Card titles render as `h2` so solutions are navigable by heading, and every
  page has a "Skip to content" link.

## 2026-10-03 — Handwriting mode (iPad and Apple Pencil)

- Handwriting reuses the photo pipeline: the pad renders the ink on white,
  cropped to the writing, and sends it through the same transcription and
  confirmation screen. That gives "Solve this" and, when working is written
  under the problem, "Check my work" without a second AI path.
- Strokes are captured with Pointer Events, including coalesced events for
  full-rate Apple Pencil samples; pen strokes vary in width with pressure.
- Palm rejection: once a `pen` pointer has been seen, `touch` pointers are
  ignored for the rest of that pad session. Before that, a finger or a mouse
  can write, so the pad also works without a stylus.
- The eraser removes whole strokes it touches (stroke eraser), which keeps
  undo and redo simple: every change commits a new stroke list.
- The pad is a real modal rendered at the top level: the rest of the page is
  `inert` and cannot scroll while you write, and Escape closes it.
- iPad text fields already support Scribble (handwriting into text), so the
  problem box accepts Apple Pencil input natively as well.

## 2026-10-05 — Every subject, Photomath-style tools, redesign

- Scope widened from Calculus I and II to all math, science and other
  homework or general-knowledge questions. `out_of_scope` is now only for
  requests that are not questions or ask for something harmful.
- A pseudo-course `open` (covered up to `all`) is the default: no method
  restrictions. The Alberta courses still work as before for calculus. The
  course block for `open` tells the model to use the clearest standard method
  for the problem's level.
- The solve request gained `subject` (default `auto`, steers notation and
  method, never refuses another subject) and `avoidMethod` (for "Solve
  another way": the method of the solution already shown).
- Outside a course, `topic_id` is `<subject>.<topic>` (for example
  `algebra.quadratic-equations`), which labels the solution and feeds
  practice problems. Practice from a solved problem accepts such ids; the
  topic browser still requires a course topic.
- A solved response may now report `check.result: "not_applicable"` (for a
  concept or definition question with nothing to check). A failed self-check
  is still never shown as solved.
- SymPy checks equations in one variable by substituting each listed root
  back in (`roots` plan, `x = \pm 2` and "or" lists supported). It confirms
  the listed roots; it does not prove that none is missing. Inequalities,
  constrained domains and systems are left to the model's own check.
- Instant answers and graphs use a small evaluator in TypeScript
  (`lib/math/evaluate.ts`), not SymPy: it is synchronous, needs no 30 MB
  Pyodide download, and refuses anything it does not understand. It reads
  plain calculator input and the output of `latexToSympy`, with implicit
  multiplication, and shows a fraction only for rational input.
- Graphs are SVG with pan, pinch and wheel zoom, trace, roots and the
  y-intercept. A solution is graphed only when it has a clear picture: both
  sides of an equation, a function and its derivative, an integrand and its
  antiderivative (with the area shaded for a definite integral), or a
  function answer. Limits, matrices and word problems are not graphed.
- The math keyboard keeps focus in the problem box (keys never take focus)
  and sets `inputMode="none"` while it is open, so phones and iPads do not
  also raise the system keyboard; "Math keys" turns it off for typing words.
- The theme moved from grayscale to an indigo-to-violet brand gradient, with
  the Geist font actually applied (`--font-sans` previously pointed at
  itself).
- `npm run screenshots` now fails if a page is wider than the viewport.

## 2026-10-06 — Built-in math engine (no AI)

- Without an API key the app now solves many problems itself instead of
  answering "no fixture". `lib/cas` reads the problem (`parse.ts`), solves it
  with Algebrite (algebra, calculus, matrices) or nerdamer (limits only,
  which Algebrite lacks), and writes the same `Solution` shape as the AI,
  with named rules, explanations, common mistakes and three hints.
- Both libraries have known gaps and bugs (nerdamer integrated `x ln x`
  wrongly in testing; Algebrite has no `sec`). So every result is checked
  numerically in TypeScript before it is shown: derivatives against central
  differences, antiderivatives by differentiating back, definite integrals
  against adaptive Simpson, roots by substitution, limits by values near the
  point, eigenvalues by `det(A - λI) = 0`, inverses by `A·A⁻¹ = I`. A failed
  check returns nothing, and the app says the problem needs the AI.
- Steps follow the structure of the problem rather than a fixed template:
  the derivative rule comes from the outermost operation (product, quotient,
  chain, sum), integrals pick linearity, integration by parts (LIATE) or a
  linear substitution, limits try substitution then L'Hôpital, quadratics
  factor when the discriminant is a perfect square and use the formula
  otherwise, and 2×2 and 3×3 systems use Cramer's rule.
- Non-polynomial equations are solved numerically (sign change and
  bisection), then exact values such as π/6, √2, e², ln 5 and fractions are
  recognized; anything else is shown as a decimal.
- Fixtures still win when they match, so the golden mock answers and the
  e2e tests are unchanged. Engine answers report the model
  `calctutor-math-engine` and are labelled "Solved offline by the built-in
  math engine (no AI)".
- `TopicDetail` was split out of the topic page so the static demo can render
  topics without a server.
