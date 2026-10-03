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
