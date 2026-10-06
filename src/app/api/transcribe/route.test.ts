// @vitest-environment node

import { describe, expect, it } from "vitest";

import { POST } from "./route";

function pngBase64(width: number, height: number) {
  const bytes = Buffer.alloc(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes.toString("base64");
}

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/transcribe", () => {
  it("returns the mock transcription for a valid image", async () => {
    const response = await post({
      mediaType: "image/png",
      data: pngBase64(1600, 1200),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-calctutor-ai-mode")).toBe("mock");
    expect(body.problems).toHaveLength(2);
    expect(body.problems[0]).toMatchObject({
      label: "3(a)",
      confidence: "high",
    });
  });

  it("rejects bytes that do not match the declared type", async () => {
    const response = await post({
      mediaType: "image/jpeg",
      data: pngBase64(100, 100),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unsupported_image" },
    });
  });

  it("rejects images over 2000 px on the long edge", async () => {
    const response = await post({
      mediaType: "image/png",
      data: pngBase64(4032, 3024),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "image_too_large" },
    });
  });

  it("rejects a missing image with a validation error", async () => {
    const response = await post({ mediaType: "image/png", data: "" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "validation_error" },
    });
  });
});
