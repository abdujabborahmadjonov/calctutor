import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";

let client: Anthropic | undefined;

export function getAnthropicClient() {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is required when real AI mode is enabled",
    );
  }

  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}
