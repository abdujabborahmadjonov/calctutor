import { MAX_IMAGE_EDGE } from "./inspect";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const JPEG_QUALITY = 0.9;

export type PreparedImage = {
  mediaType: "image/jpeg";
  data: string;
  width: number;
  height: number;
  previewUrl: string;
};

export class ImagePrepError extends Error {}

export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }

  return btoa(binary);
}

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new ImagePrepError("This browser could not encode the photo."),
            ),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

// Decodes with the EXIF orientation applied so rotated phone photos come out
// upright, shrinks the long edge to at most 2000 px, and re-encodes as JPEG.
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImagePrepError("That photo is over 10 MB. Use a smaller photo.");
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImagePrepError(
      "This image could not be read. Use a JPEG or PNG photo; iPhone HEIC photos often fail.",
    );
  }

  try {
    const size = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new ImagePrepError("This browser could not prepare the photo.");
    }

    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await canvasToJpeg(canvas);

    return {
      mediaType: "image/jpeg",
      data: toBase64(await blob.arrayBuffer()),
      width: size.width,
      height: size.height,
      previewUrl: URL.createObjectURL(blob),
    };
  } finally {
    bitmap.close();
  }
}
