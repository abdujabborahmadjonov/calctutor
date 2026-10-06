import type { ImageMediaType } from "@/lib/ai/schemas";

export const MAX_IMAGE_EDGE = 2_000;

export type ImageSize = { width: number; height: number };

function readUint16BE(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint32BE(bytes: Uint8Array, offset: number) {
  return (
    ((bytes[offset] << 24) >>> 0) +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function readUint16LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint24LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

export function detectMediaType(bytes: Uint8Array): ImageMediaType | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a
  ) {
    return "image/png";
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  return undefined;
}

function jpegSize(bytes: Uint8Array): ImageSize | undefined {
  let offset = 2;

  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return undefined;
    const marker = bytes[offset + 1];

    // Padding bytes between segments.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }

    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isStartOfFrame) {
      return {
        height: readUint16BE(bytes, offset + 5),
        width: readUint16BE(bytes, offset + 7),
      };
    }

    offset += 2 + readUint16BE(bytes, offset + 2);
  }

  return undefined;
}

function webpSize(bytes: Uint8Array): ImageSize | undefined {
  const chunk = ascii(bytes, 12, 4);

  if (chunk === "VP8 ") {
    return {
      width: readUint16LE(bytes, 26) & 0x3fff,
      height: readUint16LE(bytes, 28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    const bits =
      bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return {
      width: readUint24LE(bytes, 24) + 1,
      height: readUint24LE(bytes, 27) + 1,
    };
  }
  return undefined;
}

export function readImageSize(
  bytes: Uint8Array,
  mediaType: ImageMediaType,
): ImageSize | undefined {
  if (mediaType === "image/jpeg") return jpegSize(bytes);
  if (mediaType === "image/png") {
    if (bytes.length < 24 || ascii(bytes, 12, 4) !== "IHDR") return undefined;
    return { width: readUint32BE(bytes, 16), height: readUint32BE(bytes, 20) };
  }
  return webpSize(bytes);
}
