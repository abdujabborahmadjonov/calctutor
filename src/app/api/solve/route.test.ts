// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { SolveStreamEventSchema } from "@/lib/ai/stream-events";

const body = {
  problemLatex: String.raw`\int x e^x\,dx`,
  courseId: "ualberta-math-146",
  coveredUpTo: "parametric-polar",
  mode: "full",
};

async function loadRoute(streaming: boolean) {
  vi.resetModules();
  vi.stubEnv("AI_STREAMING", String(streaming));
  return import("./route");
}

const post = (route: Awaited<ReturnType<typeof loadRoute>>, payload: unknown) =>
  route.POST(
    new Request("http://localhost/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/solve", () => {
  it("streams NDJSON events that end with the validated solution", async () => {
    const route = await loadRoute(true);
    const response = await post(route, body);
    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => SolveStreamEventSchema.parse(JSON.parse(line)));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("ndjson");
    expect(response.headers.get("x-calctutor-ai-mode")).toBe("mock");
    expect(events[0]).toMatchObject({ type: "start", source: "mock" });

    const streamed = events
      .flatMap((event) => (event.type === "delta" ? [event.text] : []))
      .join("");
    const done = events.at(-1);

    expect(done?.type).toBe("done");
    if (done?.type !== "done") return;
    expect(JSON.parse(streamed)).toEqual(done.solution);
    expect(done.solution).toMatchObject({
      status: "solved",
      problem: { topic_id: "integration-by-parts" },
    });
  });

  it("returns a validated JSON solution when streaming is off", async () => {
    const route = await loadRoute(false);
    const response = await post(route, body);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-calctutor-ai-mode")).toBe("mock");
    await expect(response.json()).resolves.toMatchObject({
      status: "solved",
      check: { result: "passed" },
    });
  });

  it("returns a typed validation error", async () => {
    const route = await loadRoute(true);
    const response = await post(route, { ...body, problemLatex: "" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "validation_error" },
    });
  });

  it("rejects a body that is not JSON", async () => {
    const route = await loadRoute(true);
    const response = await route.POST(
      new Request("http://localhost/api/solve", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_json" },
    });
  });
});
