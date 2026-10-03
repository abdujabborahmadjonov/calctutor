// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const request = {
  problemLatex: String.raw`\int x e^x\,dx`,
  courseId: "ualberta-math-146",
  coveredUpTo: "parametric-polar",
  mode: "full" as const,
};

function fakeStream(usage: { input_tokens: number; output_tokens: number }) {
  return {
    abort: vi.fn(),
    currentMessage: { usage },
    finalMessage: vi.fn(),
    async *[Symbol.asyncIterator]() {
      yield {
        type: "content_block_delta",
        delta: { type: "text_delta", text: '{"status":' },
      };
      yield {
        type: "content_block_delta",
        delta: { type: "text_delta", text: '"solved"' },
      };
    },
  };
}

async function load(stream: ReturnType<typeof fakeStream>) {
  vi.resetModules();
  vi.stubEnv("MOCK_AI", "false");
  vi.stubEnv("CALCTUTOR_ANTHROPIC_API_KEY", "sk-ant-test");
  vi.stubEnv("DAILY_TOKEN_BUDGET", "100");
  vi.doMock("./client", () => ({
    getAnthropicClient: () => ({ messages: { stream: () => stream } }),
  }));
  const { solveStream } = await import("./solve-stream");
  const { assertTokenBudget } = await import("./usage");
  return { solveStream, assertTokenBudget };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("./client");
});

describe("solveStream against the API", () => {
  it("cancels the upstream request and counts its tokens when the reader leaves", async () => {
    const stream = fakeStream({ input_tokens: 150, output_tokens: 1 });
    const { solveStream, assertTokenBudget } = await load(stream);
    const events = solveStream(request);

    expect((await events.next()).value).toMatchObject({ type: "start" });
    expect((await events.next()).value).toMatchObject({ type: "delta" });
    await events.return(undefined);

    expect(stream.abort).toHaveBeenCalledOnce();
    expect(() => assertTokenBudget()).toThrow("DAILY_TOKEN_BUDGET_EXHAUSTED");
  });

  it("counts an attempt cut off at max_tokens before retrying", async () => {
    const stream = fakeStream({ input_tokens: 0, output_tokens: 0 });
    stream.finalMessage.mockResolvedValue({
      model: "claude-sonnet-5-5",
      stop_reason: "max_tokens",
      usage: { input_tokens: 90, output_tokens: 40 },
      parsed_output: null,
    });
    const { solveStream, assertTokenBudget } = await load(stream);

    const seen: string[] = [];
    await expect(
      (async () => {
        for await (const event of solveStream(request)) seen.push(event.type);
      })(),
    ).rejects.toThrow("cut off");

    expect(seen).toContain("reset");
    expect(stream.abort).not.toHaveBeenCalled();
    expect(() => assertTokenBudget()).toThrow("DAILY_TOKEN_BUDGET_EXHAUSTED");
  });
});
