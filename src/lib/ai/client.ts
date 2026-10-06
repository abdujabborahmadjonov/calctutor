import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicApiKey } from "@/lib/env";

let client: Anthropic | undefined;

export function getAnthropicClient() {
  client ??= new Anthropic({ apiKey: getAnthropicApiKey() });
  return client;
}
