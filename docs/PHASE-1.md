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

To be completed after verification.
