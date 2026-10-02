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
