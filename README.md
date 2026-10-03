# CalcTutor

CalcTutor is a mobile-first calculus tutor for Alberta students. It solves
Calculus I and II problems with named rules, plain-language explanations,
hints, and answer checks. Phase 1 ships the text solver (course-aware,
step-by-step solutions, local history). Phase 2 adds photo input with
transcription and confirmation, streamed solutions that render step by step,
and "Explain this step more". `MOCK_AI=true` serves fixtures for local work.

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

Open [http://localhost:3000](http://localhost:3000). `.env.example` sets
`MOCK_AI=true`, so no Anthropic key is required for UI and fixture smoke tests.
For real Claude solves, set `ANTHROPIC_API_KEY` and `MOCK_AI=false`.
`AI_STREAMING=true` (the default) streams solutions; set it to `false` for a
single JSON response.

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
npm run smoke
```

Start the app (`npm run dev` or `npm run start` with `PORT=43127`), then run
`SMOKE_EXPECT_MODE=mock npm run smoke` against fixture responses. Use
`SMOKE_EXPECT_MODE=anthropic` only with `MOCK_AI=false` and a valid API key.
The smoke run also posts `scripts/fixtures/handwritten-x2-lnx.jpg` to
`/api/transcribe`; set `SMOKE_TRANSCRIBE_IMAGE` to use your own photo.

Use `npm run test:watch` during development. See
[`docs/PHASE-2.md`](docs/PHASE-2.md) and [`docs/PHASE-1.md`](docs/PHASE-1.md)
for the phase verification reports,
[`docs/PHASE-0.md`](docs/PHASE-0.md) for scaffold notes, and
[`docs/DECISIONS.md`](docs/DECISIONS.md) for implementation choices.
