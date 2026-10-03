// @vitest-environment node

import { describe, expect, it } from "vitest";

import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/check-work", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/check-work", () => {
  it("finds the first error without giving the final answer", async () => {
    const response = await post({
      problemLatex: String.raw`\int x e^x\,dx`,
      studentWork: String.raw`\int xe^x\,dx = xe^x + \int e^x\,dx = xe^x + e^x + C`,
      courseId: "ualberta-math-146",
      coveredUpTo: "parametric-polar",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.verdict).toBe("error_found");
    expect(body.first_error.corrected_line_latex).toContain("- \\int");
    expect(JSON.stringify(body)).not.toContain("e^x(x-1)");
  });

  it("requires the student's work", async () => {
    const response = await post({
      problemLatex: String.raw`\int x e^x\,dx`,
      studentWork: "  ",
      courseId: "ualberta-math-146",
      coveredUpTo: "parametric-polar",
    });

    expect(response.status).toBe(400);
  });

  it("rejects an unknown course", async () => {
    const response = await post({
      problemLatex: "x",
      studentWork: "y",
      courseId: "nowhere-101",
      coveredUpTo: "limits",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_course" },
    });
  });
});
