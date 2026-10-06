import {
  type Solution,
  SolutionSchema,
  type SolveRequestInput,
} from "@/lib/ai/schemas";
import { SolveStreamEventSchema } from "@/lib/ai/stream-events";

export type SolveOutcome = {
  solution: Solution;
  source: "mock" | "anthropic";
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
};

type ApiError = { error?: { message?: string } };

const GENERIC_ERROR = "Something went wrong on our side.";

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as ApiError;
    return body.error?.message ?? GENERIC_ERROR;
  } catch {
    return GENERIC_ERROR;
  }
}

async function readJsonSolution(response: Response): Promise<SolveOutcome> {
  const solution = SolutionSchema.parse(await response.json());
  const header = (name: string) => response.headers.get(name);

  return {
    solution,
    source: header("X-CalcTutor-AI-Mode") === "mock" ? "mock" : "anthropic",
    model: header("X-CalcTutor-Model") ?? "unknown",
    usage: {
      inputTokens: Number(header("X-CalcTutor-Input-Tokens") ?? 0),
      outputTokens: Number(header("X-CalcTutor-Output-Tokens") ?? 0),
    },
    latencyMs: Number(header("X-CalcTutor-Latency-Ms") ?? 0),
  };
}

async function readStreamedSolution(
  response: Response,
  onText: (text: string) => void,
): Promise<SolveOutcome> {
  if (!response.body) throw new Error(GENERIC_ERROR);

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffered = "";
  let text = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffered += value;

    let newline = buffered.indexOf("\n");
    while (newline !== -1) {
      const line = buffered.slice(0, newline).trim();
      buffered = buffered.slice(newline + 1);
      newline = buffered.indexOf("\n");
      if (!line) continue;

      const event = SolveStreamEventSchema.parse(JSON.parse(line));

      if (event.type === "delta") {
        text += event.text;
        onText(text);
      } else if (event.type === "reset") {
        text = "";
        onText(text);
      } else if (event.type === "error") {
        throw new Error(event.error.message);
      } else if (event.type === "done") {
        await reader.cancel();
        return {
          solution: event.solution,
          source: event.source,
          model: event.model,
          usage: event.usage,
          latencyMs: event.latencyMs,
        };
      }
    }
  }

  throw new Error("The solution stream ended before it finished.");
}

// Posts to /api/solve and handles both the streamed (NDJSON) and the
// non-streaming (JSON) response. onText receives the solution JSON text
// accumulated so far while streaming.
export async function requestSolve(
  body: SolveRequestInput,
  onText: (text: string) => void = () => {},
): Promise<SolveOutcome> {
  const response = await fetch("/api/solve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(await readErrorMessage(response));

  const contentType = response.headers.get("Content-Type") ?? "";
  return contentType.includes("ndjson")
    ? readStreamedSolution(response, onText)
    : readJsonSolution(response);
}
