# Phase 1: Text solver

## Plan

1. Add the Phase 1 dependencies from the approved stack: Anthropic SDK,
   Markdown/math rendering, IndexedDB storage, and testing support.
2. Build the Alberta curriculum data and course-block generator, then cover the
   allowed-method boundary with unit tests.
3. Define Zod request/solution schemas, the exact tutor prompt, mock fixtures,
   and the non-streaming Anthropic solve boundary.
4. Add bounded/rate-limited `POST /api/solve` handling with typed errors and
   token-budget accounting.
5. Build the text-first UI: persisted course settings, covered-up-to selector,
   Learn mode, LaTeX palette and preview, solving state, strategy, hint ladder,
   step reveal, final answer, and local history.
6. Add LaTeX normalization tests, schema tests, route/component tests, and the
   eight-problem golden smoke runner with explicit mock and real modes.
7. Run formatting, lint, typecheck, unit tests, production build, mock smoke,
   real-API smoke when credentials are available, and desktop/mobile browser
   checks.
8. Update the README, decisions, and this phase report with exact results,
   commit each logical change, and push the existing branch.

## Phase report

### Done

- Text solver MVP on the Phase 0 foundation: curriculum data, Zod schemas,
  tutor prompt, mock fixtures, `lib/ai/solve.ts` (non-streaming), rate-limited
  `POST /api/solve`, and the solver UI (input palette, KaTeX preview, course
  settings, Learn mode, strategy, hint ladder, step reveal, final answer,
  local history).
- Eight golden-problem fixtures and `scripts/smoke.ts` with `SMOKE_EXPECT_MODE`
  to distinguish mock (`mock`) from real API (`anthropic`) responses via
  `X-CalcTutor-AI-Mode`.
- Fixed root layout typing so `npm run typecheck` passes without generated
  `LayoutProps` from an uninitialized `.next` types pass.

### Verification

Final verification on 2026-10-02 (branch `cursor/phase-zero-scaffold-c182`):

| Check                       | Exact result                                                                                                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`      | Exit 0; all matched files use Prettier formatting                                                                                                                                                                          |
| `npm run lint`              | Exit 0; ESLint reported no errors or warnings                                                                                                                                                                              |
| `npm run typecheck`         | Exit 0; `tsc --noEmit` reported no errors                                                                                                                                                                                  |
| `npm test`                  | Exit 0; Vitest 5.0.3: 7 test files, 18 tests passed                                                                                                                                                                        |
| `npm run build`             | Exit 0; Next.js 16.3.8; routes `/`, `/history`, `/about`, `/api/health`, `/api/solve`                                                                                                                                      |
| Mock smoke                  | `MOCK_AI=true PORT=43127 npm run start` then `SMOKE_EXPECT_MODE=mock npm run smoke` — **8/8 passed**, `input_tokens=0`, `output_tokens=0`, `estimated_cost_usd=0.0000`                                                     |
| Real-API smoke              | **Not run** — `ANTHROPIC_API_KEY` is not set in this cloud environment (credential blocker). To run locally: `MOCK_AI=false`, set `ANTHROPIC_API_KEY`, start the server, then `SMOKE_EXPECT_MODE=anthropic npm run smoke`. |
| Browser, desktop (1280×900) | Pass; solver page renders with header controls, problem input, and footer disclaimer (headless Chrome screenshot)                                                                                                          |
| Browser, mobile (390×844)   | Pass; stacked layout; controls remain visible (headless Chrome screenshot)                                                                                                                                                 |

Mock smoke output (fixture path, not Anthropic):

```
PASS sine limit avoids early L'Hôpital
PASS product and chain rules are separate
PASS integration by parts includes constant and check
PASS endpoint singularity is treated as improper
PASS alternating harmonic series is conditional
PASS ladder rate includes sign and direction
PASS missing bound asks for clarification
PASS linear algebra is out of scope
RESULT mode=mock passed=8/8 input_tokens=0 output_tokens=0 estimated_cost_usd=0.0000
```

### How to test by hand

1. `npm install` and `cp .env.example .env.local` (keeps `MOCK_AI=true` by default).
2. `npm run dev` and open the local URL.
3. Pick a course and covered-up-to topic, paste or choose an example problem, click **Solve problem**.
4. Step through the solution, toggle Learn mode, open **History**, and reopen a saved problem.
5. For real Claude: set `MOCK_AI=false` and `ANTHROPIC_API_KEY`, restart the dev server, solve once, then run `SMOKE_EXPECT_MODE=anthropic npm run smoke` against a running server.

### Not done (Phase 2+)

- Photo capture, transcription, streaming solve, explain-step API.
- Check-work, similar problems, SymPy verification, topic browser.
- Accounts, cloud history, deployment hardening.

### Open questions and blockers

- **Credential blocker:** Real-API golden smoke was not executed here because no valid `ANTHROPIC_API_KEY` is available in the agent environment. Mock smoke fully validates fixtures and the HTTP solve path; real-API smoke remains a manual gate before prompt changes ship.
- Measured cost per real solve: not available until real-API smoke runs.
