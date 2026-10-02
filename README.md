# CalcTutor

CalcTutor is a mobile-first calculus tutor for Alberta students. It will solve
Calculus I and II problems with named rules, plain-language explanations,
hints, and answer checks. Phase 0 establishes the tested Next.js foundation;
the solver begins in Phase 1.

The complete product and build contract is in [`docs/SPEC.md`](docs/SPEC.md).

## Requirements

- Node.js 22.13 or newer
- npm

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Local setup uses
`MOCK_AI=true`, so no Anthropic key is needed in Phase 0. When real AI calls
are enabled, set `ANTHROPIC_API_KEY` and change `MOCK_AI=false`.

The health endpoint is available at
[http://localhost:3000/api/health](http://localhost:3000/api/health) and returns
HTTP 200 with `{ "status": "ok", "service": "calctutor" }`.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Use `npm run test:watch` during development. See
[`docs/PHASE-0.md`](docs/PHASE-0.md) for the current phase plan and verification
report, and [`docs/DECISIONS.md`](docs/DECISIONS.md) for implementation choices.
