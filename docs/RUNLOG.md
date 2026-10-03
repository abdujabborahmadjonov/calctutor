start: 2026-10-03T05:23:56Z

# CalcTutor run log

Elapsed time is measured from the start line. Newest entries last.

- 0:00 Context: this run starts on branch `claude/eager-davinci-ihl4qc`, which already carries SPEC Phases 0 to 3 (draft PR abdujabborahmadjonov/calctutor#1, base `cursor/phase-zero-scaffold-c182`). The run adapts RUN.md to that state: it closes the gaps RUN.md names (CI, lazy key, direct smoke script, mock banner, e2e test, screenshots, review, report) instead of rebuilding phases.
- 0:00 **Fallback: no API key.** `CALCTUTOR_ANTHROPIC_API_KEY` and `ANTHROPIC_API_KEY` are both unset in this session; the models endpoint answered `401`. Running with `MOCK_AI=true` for the whole run. The real-API smoke run is the first open item in the report.
- 0:00 Network: `cdn.jsdelivr.net` and `cdn.playwright.dev` are blocked (curl `000`); the custom network list from RUN section 1 is not applied to this session. Pyodide is already self-hosted (no jsdelivr needed). Playwright 1.56.1 with Chromium is pre-installed at `/opt/pw-browsers`, so no browser download is needed.
- 0:03 Env: the key is read from `CALCTUTOR_ANTHROPIC_API_KEY` (fallback `ANTHROPIC_API_KEY`) and validated lazily in `getAnthropicApiKey`; builds and CI need no key. Unit tests cover both variables and the lazy check.
- 0:03 Fix: the rate limiter refused a client that waited exactly the advertised `Retry-After` (floating-point refill). New test reproduced it (`expected false to be true`), multiply-before-divide fixed it; 4/4 limiter tests pass.
- 0:04 Mock banner: site-wide, reads `/api/mode` at runtime so prerendered pages cannot show a stale setting.
- 0:08 CI added (format, lint, typecheck, unit tests, mock build, Playwright e2e). First run red: `prettier --check` flagged `docs/RUN.md` (my formatting slip). Fixed, and actions moved to v5 (v4 targets deprecated Node 20). Run 37100038943 and 37100036223 on `7f09f13`: **success**.
- 0:05 E2E (`npm run test:e2e`, mock): integration-by-parts golden problem shows the strategy card and step 1, no console errors — 1 passed.
- 0:05 Smoke rewritten to call lib/ai directly (`npm run smoke`, tsx with the react-server condition; `server-only` added as a package so it resolves outside Next). Inputs in `src/fixtures/problems.json`. Transcription images generated with KaTeX in Chromium (`scripts/make-test-images.ts`): upright PNG and a 5° rotated, JPEG-compressed copy. Mock run:

```
| problem                  | mode | status              | final answer                             | check          | ms | tokens in/out | result |
|--------------------------|------|---------------------|------------------------------------------|----------------|----|---------------|--------|
| sine-limit               | mock | solved              | The limit is 1.                          | passed         | 49 | 0/0           | PASS   |
| product-chain            | mock | solved              | The derivative is 2x sin(3x) plus 3x sq… | passed         | 55 | 0/0           | PASS   |
| integration-by-parts     | mock | solved              | The antiderivative is e to the x times … | passed         | 52 | 0/0           | PASS   |
| improper-integral        | mock | solved              | The improper integral converges to pi o… | passed         | 57 | 0/0           | PASS   |
| alternating-series       | mock | solved              | The series is conditionally convergent.  | passed         | 54 | 0/0           | PASS   |
| related-rates            | mock | solved              | The top is falling at three quarters of… | passed         | 57 | 0/0           | PASS   |
| missing-bound            | mock | needs_clarification | What is the upper bound of the definite… | not_applicable | 12 | 0/0           | PASS   |
| out-of-scope             | mock | out_of_scope        | Eigenvalues belong to linear algebra, w… | not_applicable | 13 | 0/0           | PASS   |
| transcribe-katex         | mock | 2 problem(s)        | \int x e^{x}\,dx                         | high           | 1  | 0/0           | PASS   |
| transcribe-katex-rotated | mock | 2 problem(s)        | \int x e^{x}\,dx                         | high           | 0  | 0/0           | PASS   |
| transcribe-handwritten   | mock | 2 problem(s)        | \int x e^{x}\,dx                         | high           | 0  | 0/0           | PASS   |
| check-work-parts-sign    | mock | error_found         | \int xe^x\,dx = xe^x - \int e^x\,dx      |                | 0  | 0/0           | PASS   |
RESULT passed=12/12 estimated_cost_usd=0.0000
```

Negative checks: `SMOKE_EXPECT_MODE=anthropic` exits 1; `MOCK_AI=false` without a key exits 1 with "ANTHROPIC_API_KEY is required … (set CALCTUTOR_ANTHROPIC_API_KEY)" per row. Mock rows only prove the pipeline; the real-API run is open item 1.

- 0:23 Screenshots (`npm run screenshots`): 19 scenarios × 390 and 1280 = 38 PNGs, 0 failures, no console errors outside the deliberate 429/502/503 scenarios. Review found and fixed: (1) course and covered-up-to selectors showed raw ids (`ualberta-math-144`) instead of names — Base UI `Select.Value` needs a label function; (2) answer placeholder cut off at 390 px; (3) history save raced navigation (solution rendered before the IndexedDB write) — now saved first. Dark mode, error cards, learn mode, check-my-work and photo-confirm screens looked right.
- 0:23 Rule sweep: no TODO, FIXME, `any`, `@ts-ignore` or `eslint-disable` in src, scripts or e2e (the photo preview now uses next/image).
