// @vitest-environment node

import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/solve", () => {
  it("returns a validated mock solution with mode metadata", async () => {
    const response = await POST(
      new Request("http://localhost/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemLatex: String.raw`\int x e^x\,dx`,
          courseId: "ualberta-math-146",
          coveredUpTo: "parametric-polar",
          mode: "full",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-calctutor-ai-mode")).toBe("mock");
    expect(body).toMatchObject({
      status: "solved",
      problem: { topic_id: "integration-by-parts" },
      check: { result: "passed" },
    });
  });

  it("returns a typed validation error", async () => {
    const response = await POST(
      new Request("http://localhost/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemLatex: "",
          courseId: "ualberta-math-144",
          coveredUpTo: "limits",
          mode: "full",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "validation_error" },
    });
  });
});
