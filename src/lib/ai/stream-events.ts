import { z } from "zod";

import { SolutionSchema, UsageSchema } from "./schemas";

// One JSON object per line in the streamed /api/solve response.
// "delta" carries raw text of the solution JSON as the model writes it;
// "reset" means a retry started and accumulated text must be discarded;
// "done" carries the server-validated solution that replaces the partial view.
export const SolveStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start"),
    source: z.enum(["mock", "anthropic"]),
    model: z.string(),
  }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("reset") }),
  z.object({
    type: z.literal("done"),
    solution: SolutionSchema,
    model: z.string(),
    usage: UsageSchema,
    latencyMs: z.number().nonnegative(),
    source: z.enum(["mock", "anthropic"]),
  }),
  z.object({
    type: z.literal("error"),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
]);

export type SolveStreamEvent = z.infer<typeof SolveStreamEventSchema>;

export const NDJSON_CONTENT_TYPE = "application/x-ndjson; charset=utf-8";
