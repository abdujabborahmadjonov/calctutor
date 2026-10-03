// @vitest-environment node

import { describe, expect, it } from "vitest";

import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/similar", () => {
  it("returns three graded-difficulty practice problems", async () => {
    const response = await post({
      problemLatex: String.raw`\int x e^x\,dx`,
      topicId: "integration-by-parts",
      courseId: "ualberta-math-146",
      coveredUpTo: "parametric-polar",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(
      body.problems.map((p: { difficulty: string }) => p.difficulty),
    ).toEqual(["easier", "same", "harder"]);
  });

  it("accepts an empty problem for topic practice", async () => {
    const response = await post({
      problemLatex: "",
      topicId: "limits",
      courseId: "ualberta-math-144",
      coveredUpTo: "limits",
    });

    expect(response.status).toBe(200);
  });

  it("rejects an unknown topic", async () => {
    const response = await post({
      problemLatex: "",
      topicId: "linear-algebra",
      courseId: "ualberta-math-144",
      coveredUpTo: "limits",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_topic" },
    });
  });
});
