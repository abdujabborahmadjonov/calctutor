# CalcTutor

CalcTutor is a step-by-step tutor for any math problem (arithmetic, algebra,
geometry, trigonometry, precalculus, Calculus I to III, linear algebra,
differential equations, statistics, discrete math) and for physics,
chemistry and other homework questions:

- Type a problem (plain English or LaTeX) with the on-screen math keyboard,
  scan a photo, or write it with Apple Pencil on the handwriting pad, confirm
  what was read, and get a solution that streams in step by step.
- A subject picker (or "Auto"), instant answers for plain arithmetic, an
  interactive graph of each solution, "Solve another way", and a graphing
  calculator at `/graph`.
- Strategy card, hint ladder, Learn mode, "Explain this step more", and a
  final answer checked by SymPy in the browser (integrals, derivatives,
  limits, and the roots of one-variable equations).
- Check my work, graded practice problems, Markdown and PDF export, a topic
  browser, and local history.
- A built-in math engine (Algebrite, with nerdamer for limits) that solves
  many problems with worked steps and no AI: equations and systems,
  arithmetic, simplifying and factoring, derivatives, integrals, limits,
  matrices, statistics and simple differential equations. It answers in mock
  mode when no saved example matches, and every result is checked
  numerically before it is shown.
- Optional Alberta course mode for calculus: pick a course and how far your
  class has got, and only the methods covered so far are used. The default,
  "Any level · no restrictions", solves everything.

The product and build contract is [`docs/SPEC.md`](docs/SPEC.md). The latest
build run and its results are in [`docs/REPORT.md`](docs/REPORT.md) and
[`docs/RUNLOG.md`](docs/RUNLOG.md).

## Run it locally

Requires Node.js 22.13 or newer.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. `.env.example` sets `MOCK_AI=true`, so the app
serves saved example solutions, solves other math problems with the built-in
engine, and shows a "Mock mode" banner; no API key is needed. Word problems,
proofs and science questions need the AI. For real Claude answers, set these in `.env.local`:

```
CALCTUTOR_ANTHROPIC_API_KEY=sk-ant-...
MOCK_AI=false
```

`ANTHROPIC_API_KEY` also works as a fallback. The key is only checked on the
first AI call, so builds and CI never need it.

`npm run dev` and `npm run build` first run `npm run vendor:pyodide`, which
copies the Pyodide runtime into `public/pyodide/` and downloads the pinned
SymPy and mpmath wheels from PyPI (checked by sha256). The first run needs
network access to PyPI.

Other settings (all optional, see `.env.example`): `AI_STREAMING` (default
`true`), the three model ids, `DAILY_TOKEN_BUDGET`,
`RATE_LIMIT_SOLVES_PER_HOUR`, `RATE_LIMIT_TRANSCRIBES_PER_HOUR`.

## Checks

| Command                | What it does                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm run format:check` | Prettier                                                                                                          |
| `npm run lint`         | ESLint                                                                                                            |
| `npm run typecheck`    | `tsc --noEmit`                                                                                                    |
| `npm test`             | Vitest unit and route tests                                                                                       |
| `npm run build`        | Production build                                                                                                  |
| `npm run test:e2e`     | Playwright, after `npm run build`: starts the app in mock mode and solves the integration-by-parts golden problem |
| `npm run smoke`        | Golden problems (SPEC section 7) through `lib/ai`, printed as a table; exits non-zero on any failure              |
| `npm run screenshots`  | Every screen and state at 390 and 1280 px into `screenshots/`; needs the app running on port 3000                 |

CI (`.github/workflows/ci.yml`) runs format, lint, typecheck, unit tests, a
mock-mode build and the e2e test on every push and pull request, with no
secrets.

The smoke script reads its inputs from `src/fixtures/problems.json` and uses
the same settings as the app. Run it against the real API with
`MOCK_AI=false SMOKE_EXPECT_MODE=anthropic npm run smoke`; a full run makes 12
Claude calls. `npx tsx scripts/make-test-images.ts` regenerates the
transcription test images.

## Deploy to Vercel

Import the repository in Vercel and set these environment variables:

- `CALCTUTOR_ANTHROPIC_API_KEY` (your key) and `MOCK_AI=false`
- optionally `DAILY_TOKEN_BUDGET` and the rate limits

The build downloads the SymPy wheels from PyPI, so the build environment needs
internet access. The in-memory rate limiter and token budget reset on each deploy and
are per instance; SPEC Phase 4 replaces them with Upstash Redis.

## Docs

- [`docs/SPEC.md`](docs/SPEC.md): product and build contract
- [`docs/DECISIONS.md`](docs/DECISIONS.md): implementation choices
- [`docs/PHASE-0.md`](docs/PHASE-0.md) to [`docs/PHASE-3.md`](docs/PHASE-3.md):
  phase reports
- [`docs/RUN.md`](docs/RUN.md), [`docs/RUNLOG.md`](docs/RUNLOG.md),
  [`docs/REPORT.md`](docs/REPORT.md): the autonomous build run
