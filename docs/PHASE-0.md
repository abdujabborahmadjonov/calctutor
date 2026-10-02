# Phase 0: Scaffold

## Plan

1. Save the product specification and Cursor project rule.
2. Scaffold the Next.js App Router application with strict TypeScript, Tailwind CSS, and ESLint.
3. Configure shadcn/ui, Prettier, Vitest, and React Testing Library.
4. Add validated environment configuration, the health route, and focused tests.
5. Document setup and implementation decisions.
6. Run the build, lint, typecheck, and test gates; start the app and request the health route.
7. Record the exact results and any remaining work in this document.

## Phase report

### Done

- Scaffolded Next.js 16.3.8 with App Router, strict TypeScript, Tailwind CSS,
  ESLint, Prettier, Vitest, React Testing Library, and shadcn/ui.
- Added Zod-validated server environment configuration with conditional
  Anthropic-key enforcement and readable validation errors.
- Added `GET /api/health` with an HTTP 200 JSON response and no-store caching.
- Added focused tests for the landing page, health route, and environment
  validation.
- Added the verbatim product specification, Cursor rule, environment example,
  setup README, and decision log.
- Pinned every direct dependency to an exact version.

### Verification

Final verification on 2026-10-02:

| Check                  | Exact result                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run build`        | Exit 0; Next.js 16.3.8 compiled successfully; `/` static and `/api/health` dynamic routes generated          |
| `npm run lint`         | Exit 0; ESLint reported no errors or warnings                                                                |
| `npm run typecheck`    | Exit 0; `tsc --noEmit` reported no errors                                                                    |
| `npm test`             | Exit 0; Vitest 5.0.3: 3 test files passed, 5 tests passed                                                    |
| `npm run format:check` | Exit 0; all matched files use Prettier formatting                                                            |
| `GET /api/health`      | HTTP 200, `cache-control: no-store`, body `{"status":"ok","service":"calctutor"}`                            |
| `GET /`                | HTTP 200                                                                                                     |
| Browser, desktop       | Pass; landing page rendered with no visible application error and the health link returned the expected JSON |
| Browser, 390 px width  | Pass; text wrapped correctly and controls remained accessible                                                |

The first gate run stopped at typecheck because Zod 4 requires boolean defaults
after a transform, not the source strings `"true"` or `"false"`. The defaults
were changed to booleans, committed separately, and the complete gate sequence
then passed.

### How to test by hand

1. Run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Run `npm run dev`.
4. Open the printed local URL and confirm the Phase 0 landing page renders.
5. Select **Check service health** and confirm the browser shows
   `{"status":"ok","service":"calctutor"}`.

### Not done

- The text solver, Claude integration, curriculum data, and smoke script begin
  in Phase 1 and were intentionally not started.
- There is no AI call in Phase 0, so measured cost per solve is not applicable.

### Open questions and blockers

- Open questions: none.
- Blockers: none.
