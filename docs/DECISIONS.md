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
