import { describe, expect, it } from "vitest";

import { detectMediaType, readImageSize } from "./inspect";

function png(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

function jpeg(width: number, height: number) {
  // SOI, an APP0 segment to skip, then a baseline SOF0 frame header.
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03,
    0x00,
  ]);
}

function webpVp8x(width: number, height: number) {
  const bytes = new Uint8Array(30);
  bytes.set([...new TextEncoder().encode("RIFF")], 0);
  bytes.set([...new TextEncoder().encode("WEBPVP8X")], 8);
  const w = width - 1;
  const h = height - 1;
  bytes.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff], 24);
  bytes.set([h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 27);
  return bytes;
}

describe("image inspection", () => {
  it("detects the format from magic bytes", () => {
    expect(detectMediaType(png(1, 1))).toBe("image/png");
    expect(detectMediaType(jpeg(1, 1))).toBe("image/jpeg");
    expect(detectMediaType(webpVp8x(1, 1))).toBe("image/webp");
    expect(
      detectMediaType(new TextEncoder().encode("GIF89a........")),
    ).toBeUndefined();
  });

  it("reads dimensions for each accepted format", () => {
    expect(readImageSize(png(1600, 1200), "image/png")).toEqual({
      width: 1600,
      height: 1200,
    });
    expect(readImageSize(jpeg(2000, 1500), "image/jpeg")).toEqual({
      width: 2000,
      height: 1500,
    });
    expect(readImageSize(webpVp8x(3000, 400), "image/webp")).toEqual({
      width: 3000,
      height: 400,
    });
  });

  it("returns undefined when the header is not readable", () => {
    expect(
      readImageSize(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg"),
    ).toBe(undefined);
  });
});
