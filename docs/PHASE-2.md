# Phase 2: Photos and streaming

## Plan

1. Add the transcription and explain-step schemas, prompts (transcription
   prompt word for word from the spec), and server-only AI modules, reusing
   one solve request builder for the streaming and non-streaming paths.
2. Add `POST /api/transcribe` (image type and size checks, its own rate
   limit), `POST /api/explain-step` (streamed markdown), and an NDJSON
   streaming mode for `POST /api/solve` behind `AI_STREAMING`.
3. Build the client: image preparation (orientation, 2000 px resize, JPEG
   0.9), `ImageCapture` (camera, file, drag and drop, paste),
   `TranscriptionConfirm` (multi-problem pick, editable LaTeX, ambiguity
   notes), incremental step rendering, and "Explain this step more".
4. Extend tests and the smoke script (streaming check and the transcription
   golden case), then run every gate and a browser walkthrough.

## Phase report

### Done

- **Photo input.** On phones a large "Snap a photo" button opens the rear
  camera; on desktop a drop zone takes drag and drop, a file picker, or
  Cmd/Ctrl+V paste. Photos are decoded with EXIF orientation applied, resized
  to at most 2000 px on the long edge, and re-encoded as JPEG at quality 0.9.
  Files over 10 MB are rejected before resizing, and undecodable files (often
  HEIC) get a message asking for JPEG or PNG.
- **Transcription.** `POST /api/transcribe` validates the body with Zod,
  checks magic bytes against the declared type and the header dimensions
  against the 2000 px limit, applies `RATE_LIMIT_TRANSCRIBES_PER_HOUR`, and
  calls `messages.parse` with `effort: "medium"` and `TranscriptionSchema`.
  The image is not logged or stored.
- **Confirmation.** "Is this your problem?" shows the photo, a radio list when
  the photo holds several problems, a confidence badge, ambiguity notes, an
  editable LaTeX box with live preview, and one primary button, "Solve this".
- **Streaming solve.** `/api/solve` streams NDJSON by default. The strategy
  card and each step appear as soon as their JSON object is complete; the
  server-validated solution then replaces the partial view. A retry sends a
  `reset` event. `AI_STREAMING=false` restores the Phase 1 JSON response.
- **Explain this step more.** Every step card links to
  `POST /api/explain-step`, which streams a 120–250 word markdown expansion
  from Haiku 4.5 into the card.
- **Fixes found along the way.** A blank `ANTHROPIC_API_KEY=` line (as in
  `.env.example`) crashed every AI route under `next dev`; it now counts as
  unset. Error cards have a "Try again" button. On phones the solution scrolls
  into view when a solve starts.

### Verification

Run on 2026-10-03, branch `claude/eager-davinci-ihl4qc`:

| Check                                            | Result                                                                                                                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`                           | Exit 0; all files use Prettier style                                                                                                                                                         |
| `npm run lint`                                   | Exit 0; no errors or warnings                                                                                                                                                                |
| `npm run typecheck`                              | Exit 0                                                                                                                                                                                       |
| `npm test`                                       | Exit 0; 14 test files, 45 tests passed                                                                                                                                                       |
| `npm run build`                                  | Exit 0; routes `/`, `/about`, `/history`, `/api/health`, `/api/solve`, `/api/transcribe`, `/api/explain-step`                                                                                |
| Client bundle grep                               | 0 files in `.next/static` contain `sk-ant` or the tutor prompt                                                                                                                               |
| Mock smoke                                       | `SMOKE_EXPECT_MODE=mock npm run smoke` against `next dev` (streaming on): **9/9 passed**, including the check that the first step arrives before `done`                                      |
| Real-API smoke                                   | **Not run.** No `ANTHROPIC_API_KEY` is available in this environment                                                                                                                         |
| Browser walkthrough (390×844, headless Chromium) | Pass, no console errors: upload, two-problem picker, choose 3(b), "Solve this", strategy and step 1 rendered while step 2 was still streaming, final view, "Explain this step more" streamed |

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
RESULT mode=mock passed=9/9 solve_input_tokens=0 solve_output_tokens=0 estimated_solve_cost_usd=0.0000
```

### How to test by hand

1. `cp .env.example .env.local` (mock mode, streaming on) and `npm run dev`.
2. On a phone-width window, tap **Snap a photo**, or on desktop drop or paste
   any image. Mock mode returns two fixture problems; pick one, edit the
   LaTeX if you like, and tap **Solve this**.
3. Watch the strategy and steps appear one by one, then step through the
   final solution and open **Explain this step more** on any step.
4. For real Claude: set `MOCK_AI=false` and `ANTHROPIC_API_KEY`, restart, and
   photograph a real handwritten problem. Then run
   `SMOKE_EXPECT_MODE=anthropic npm run smoke` against the running server.
   `SMOKE_TRANSCRIBE_IMAGE=/path/to/photo.jpg` swaps in your own photo for
   the transcription case.

### Not done

- **The "done when" gates that need the real API are open:** 8 of 10 correct
  transcriptions of real handwritten photos on iOS Safari and Android Chrome,
  the transcription golden problem against Claude, and the real-API smoke run
  (still outstanding from Phase 1). These need an API key and real devices.
- Measured cost per solve: not available until a real-API run.

### Open questions

- The stand-in "handwritten" image is rendered in a handwriting font. Replace
  `scripts/fixtures/handwritten-x2-lnx.jpg` with a real phone photo of
  handwriting when you have one.
