# Phase 3: Learning features

## Plan

1. SymPy verification: vendor Pyodide and the SymPy wheels at build time,
   convert LaTeX to SymPy syntax in TypeScript, run checks in a module worker,
   and show the badge on the final answer.
2. `/api/similar` and `/api/check-work` with schemas, prompts, mock fixtures
   and route tests.
3. UI: practice similar with graded compare, Learn mode compare, check my work
   (typed or from a photo), Markdown and PDF export, topic browser.
4. Add the check-work golden case to the smoke script, then run every gate and
   a browser walkthrough.

## Phase report

### Done

- **SymPy verification badge.** The final answer card shows "Checking with
  SymPy", then "Verified with SymPy" or "Could not verify". Antiderivatives are
  checked by differentiating, derivatives by differentiating the problem,
  definite integrals numerically with `mpmath.quad`, and limits with
  `sympy.limit`.
- **Practice similar.** "Practice similar" on the final answer loads three
  problems (easier, same, harder) from `POST /api/similar`. Each has an answer
  box graded by SymPy and a hidden answer.
- **Learn mode compare.** In Learn mode the student can type a final answer
  and check it before revealing the solution.
- **Check my work.** `POST /api/check-work` finds the first wrong line,
  explains what went wrong and why, shows the corrected line, and gives a hint
  without the final answer. It can be typed in the new "Check my work" card,
  or started from a photo that includes the student's working. "Show the full
  solution" switches to a normal solve.
- **Export.** "Download Markdown" and "Print or save as PDF" on the final
  answer; step LaTeX copy already existed.
- **Topic browser.** `/topics` lists the 38 course-map topics by unit; each
  `/topics/[topicId]` page has an explainer, its methods, typical problems,
  graded practice problems for the student's saved course, and a "Report a
  wrong topic" link. "Topics" is in the header.

### Verification

Run on 2026-10-03, branch `claude/eager-davinci-ihl4qc`:

| Check                          | Result                                                                                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`         | Exit 0                                                                                                                                                                                                                            |
| `npm run lint`                 | Exit 0; no errors or warnings                                                                                                                                                                                                     |
| `npm run typecheck`            | Exit 0                                                                                                                                                                                                                            |
| `npm test`                     | Exit 0; 20 test files, 86 tests passed                                                                                                                                                                                            |
| `npm run build`                | Exit 0; vendoring ran first; 38 topic pages prerendered                                                                                                                                                                           |
| Mock smoke (streaming on)      | **10/10 passed**: the eight text problems, the transcription case and the check-work case                                                                                                                                         |
| Real-API smoke                 | **Not run.** No `ANTHROPIC_API_KEY` in this environment                                                                                                                                                                           |
| SymPy badge in Chromium        | ∫x eˣ dx **Verified with SymPy** (5.9 s, first load); ∫₀¹ dx/√(1−x²) **Verified** (94 ms); d/dx[x² sin 3x] **Verified** (11 ms); alternating series **Could not verify** (not attempted)                                          |
| Pyodide loading                | 0 Pyodide requests before a final answer is shown                                                                                                                                                                                 |
| Browser walkthrough (1280×900) | Pass, no console errors: Markdown download, practice graded correct (reordered answer) and no-match (wrong answer), Learn mode compare, typed check my work, photo check my work, full solution from a check, topic page practice |

Mock smoke output:

```
PASS sine limit avoids early L'Hôpital
PASS product and chain rules are separate
PASS integration by parts includes constant and check
PASS endpoint singularity is treated as improper
PASS alternating harmonic series is conditional
PASS ladder rate includes sign and direction
PASS missing bound asks for clarification
PASS linear algebra is out of scope
PASS handwritten photo transcribes exactly without solving
PASS check my work finds the parts sign error and withholds the answer
RESULT mode=mock passed=10/10 solve_input_tokens=0 solve_output_tokens=0 estimated_solve_cost_usd=0.0000
```

### How to test by hand

1. `npm run dev` (this vendors Pyodide on first run) in mock mode.
2. Solve `\int x e^{x}\,dx`, press **Show all**, and watch the badge change to
   **Verified with SymPy**.
3. Press **Practice similar**, type `\cos x + x\sin x + C` for problem 1 and
   press **Check**.
4. Turn on Learn mode, solve again, and check `xe^x - e^x` before revealing.
5. Type the problem, paste `\int xe^x dx = xe^x + \int e^x dx` into **Check my
   work**, and press the button.
6. Open **Topics** → **Integration by parts** → **Give me three practice
   problems**.

### Not done

- The check-work golden case against the real API, and the real-API smoke
  run (outstanding since Phase 1).
- The verification badge covers antiderivatives, definite integrals,
  derivatives and limits. Series verdicts, word problems, one-sided limits and
  answers with absolute values show "Could not verify".

### Open questions

- "Report a wrong topic" opens a GitHub issue on this repository. If you would
  rather collect reports elsewhere, say where.
