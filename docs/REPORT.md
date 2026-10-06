# CalcTutor build run report

Run started 2026-10-03T05:23:56Z and finished at about 0:40 elapsed. Branch:
`claude/eager-davinci-ihl4qc`. Pull request:
abdujabborahmadjonov/calctutor#1. Full log: [`RUNLOG.md`](RUNLOG.md).

> **Read this first: no real API calls were made.** The run's session had no
> `CALCTUTOR_ANTHROPIC_API_KEY` (or `ANTHROPIC_API_KEY`), and the models
> endpoint answered 401, so the whole run used `MOCK_AI=true` as RUN.md
> prescribes. Every smoke result below is from fixtures. Perfect-condition 1
> (golden problems against the real API) is **not met** and is open item #2.

## 1. What works

All of it was tried in mock mode; "try it" assumes `npm run dev`.

- **Text solver, streamed.** Type `\int x e^{x}\,dx`, press Solve: the
  strategy and each step appear as they finish, then one-step-at-a-time reveal.
- **Course awareness.** Pick a course and "covered up to" topic; the selectors
  now show names (MATH 144 · University of Alberta) instead of ids.
- **Hints and Learn mode.** Turn on Learn mode, solve, reveal hints, and check
  your own final answer (graded by SymPy) before revealing the solution.
- **Explain this step more.** On any step card.
- **Photo input.** Snap or upload a photo, pick a problem if there are several,
  edit the LaTeX, then "Solve this" or "Check my work".
- **Check my work.** Type the problem and your attempt in the "Check my work"
  card; it stops at the first wrong line with a correction and a hint.
- **SymPy verification badge.** Show all steps: "Verified with SymPy" for
  integrals, derivatives and limits, otherwise "Could not verify". Loaded only
  when a final answer appears.
- **Practice similar.** On the final answer; answers are graded by SymPy.
- **Export.** "Download Markdown" and "Print or save as PDF".
- **Topic browser.** Topics in the header: 38 topics with explainers and
  practice.
- **History.** Solved problems are saved in the browser; reopen from History.
- **Mock banner.** Every page says when the server is serving fixtures.

## 2. What was cut or reverted

Nothing was cut or reverted; no cut line triggered. SPEC Phases 0–3 were
already on the branch when the run began, so the run spent its time on the
gaps RUN.md names (CI, lazy key handling, direct smoke script, banner, e2e,
screenshots, code review, accessibility, docs).

## 3. Final gate results

| Gate                   | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| `npm run format:check` | pass                                                            |
| `npm run lint`         | exit 0, no warnings                                             |
| `npm run typecheck`    | exit 0                                                          |
| `npm test`             | 23 files, 94 tests passed                                       |
| `npm run build`        | exit 0 (mock, no key)                                           |
| `npm run test:e2e`     | 1 passed                                                        |
| Screenshots            | 19 states × 390 and 1280 px = 38, 0 failures, no console errors |
| Code review            | 5 findings (3 confirmed, 2 plausible), 5 fixed                  |
| CI                     | green on every push since `7f09f13`                             |
| Smoke (real API)       | **not run: no key**                                             |

Smoke, mock mode (proves the pipeline only):

```
| problem                  | mode | status              | final answer                             | check          | result |
|--------------------------|------|---------------------|------------------------------------------|----------------|--------|
| sine-limit               | mock | solved              | The limit is 1.                          | passed         | PASS   |
| product-chain            | mock | solved              | The derivative is 2x sin(3x) plus 3x sq… | passed         | PASS   |
| integration-by-parts     | mock | solved              | The antiderivative is e to the x times … | passed         | PASS   |
| improper-integral        | mock | solved              | The improper integral converges to pi o… | passed         | PASS   |
| alternating-series       | mock | solved              | The series is conditionally convergent.  | passed         | PASS   |
| related-rates            | mock | solved              | The top is falling at three quarters of… | passed         | PASS   |
| missing-bound            | mock | needs_clarification | What is the upper bound of the definite… | not_applicable | PASS   |
| out-of-scope             | mock | out_of_scope        | Eigenvalues belong to linear algebra, w… | not_applicable | PASS   |
| transcribe-katex         | mock | 2 problem(s)        | \int x e^{x}\,dx                         | high           | PASS   |
| transcribe-katex-rotated | mock | 2 problem(s)        | \int x e^{x}\,dx                         | high           | PASS   |
| transcribe-handwritten   | mock | 2 problem(s)        | \int x e^{x}\,dx                         | high           | PASS   |
| check-work-parts-sign    | mock | error_found         | \int xe^x\,dx = xe^x - \int e^x\,dx      |                | PASS   |
RESULT passed=12/12 estimated_cost_usd=0.0000
```

The five "perfect" conditions:

1. Real-API golden problems: **not met** (no key).
2. Gates and green CI: met.
3. Screens reviewed at 390 and 1280 px: met; fixes made for the selector
   labels, a clipped placeholder and a history-save race.
4. No TODOs, `any`, `ts-ignore`, `eslint-disable`, console errors or secrets:
   met.
5. README, DECISIONS and this report match the code: met.

Bugs found and fixed during the run, beyond the review findings: the rate
limiter refused a client that waited exactly the advertised `Retry-After`;
the course selectors showed raw ids; a solution could render before its
history entry was saved.

## 4. Cost

No app-API calls were made, so cost per solve and per transcription are not
measured. Total app-API spend: $0.00. The smoke script prints an estimate from
real token counts once a key is set (SPEC's estimate: 3–10 cents per solve,
under 2 cents per transcription).

## 5. Open items

1. #2 Run the smoke test against the real API and record the cost.
2. #3 Regenerate the mock fixtures from real responses.
3. #4 Real handwritten photos on iOS Safari and Android Chrome (8 of 10).
4. #5 Shared rate limiting and token budget (SPEC Phase 4).
5. #6 SymPy verification for series, one-sided limits and absolute values.
6. #7 Highlight low-confidence symbols in the transcription.

## 6. Run it

```bash
npm ci
cp .env.example .env.local   # then set CALCTUTOR_ANTHROPIC_API_KEY and MOCK_AI=false
npm run dev
```

Vercel: import the repo and set `CALCTUTOR_ANTHROPIC_API_KEY` and
`MOCK_AI=false` (optionally `DAILY_TOKEN_BUDGET` and the rate limits). The
build downloads the SymPy wheels from PyPI.

## 7. Before merging

- Add the key to the cloud environment (or `.env.local`) and run
  `MOCK_AI=false SMOKE_EXPECT_MODE=anthropic npm run smoke` (#2). This is the
  one gate the run could not pass.
- The PR's base is `cursor/phase-zero-scaffold-c182`, the repository's default
  branch. Merge there, or retarget if you use another main branch.
- The key was never printed or committed; nothing to rotate from this run.
