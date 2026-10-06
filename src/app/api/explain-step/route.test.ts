// @vitest-environment node

import { describe, expect, it } from "vitest";

import fixture from "@/fixtures/solutions/integration-by-parts.json";

import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/explain-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/explain-step", () => {
  it("streams a markdown explanation for one step", async () => {
    const response = await post({
      problemLatex: String.raw`\int x e^x\,dx`,
      solution: fixture,
      stepIndex: 1,
    });
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(text).toContain("Mock mode");
    expect(text).toContain(fixture.steps[1].rule);
  });

  it("rejects a step index past the end of the solution", async () => {
    const response = await post({
      problemLatex: String.raw`\int x e^x\,dx`,
      solution: fixture,
      stepIndex: fixture.steps.length,
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "validation_error" },
    });
  });
});
