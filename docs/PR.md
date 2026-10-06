CalcTutor v0.1: SPEC Phases 0–3 plus the autonomous run's hardening. Read
[`docs/REPORT.md`](docs/REPORT.md) first.

> **No real API calls were made.** The run had no API key, so every result is
> from mock fixtures. Run the real smoke test before merging (#2).

## Phases

- [x] Phase 0: scaffold, env, health, CI (`.github/workflows/ci.yml`)
- [x] Phase 1: text solver, curriculum, history (mock-verified only)
- [x] Phase 2: photos, transcription confirm, streaming, explain-step
- [x] Phase 3: check my work, practice similar, Markdown/PDF export, SymPy badge, topics
- [x] Hardening: code review (5 fixed), accessibility pass, screenshots, docs
- [ ] Real-API smoke run (#2) — needs `CALCTUTOR_ANTHROPIC_API_KEY`

## How to run

```bash
npm ci
cp .env.example .env.local
npm run dev        # mock mode; set CALCTUTOR_ANTHROPIC_API_KEY and MOCK_AI=false for real answers
```

Checks: `npm run lint && npm run typecheck && npm test && npm run build`, then
`npm run test:e2e`, `npm run smoke` and `npm run screenshots` (app running on
port 3000).

## What was cut

Nothing. Open items are issues #2–#7.

## Screenshots

Not committed (`screenshots/` is git-ignored). Regenerate them with
`npm run screenshots`: 19 states at 390 and 1280 px.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Mkssf5bGsyEFaCYdAUN3RU
