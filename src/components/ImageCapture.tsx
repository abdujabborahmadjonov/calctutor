"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./ui/button";

type ImageCaptureProps = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

function firstImage(files: FileList | null | undefined) {
  return Array.from(files ?? []).find((file) => file.type.startsWith("image/"));
}

export function ImageCapture({ onFile, disabled = false }: ImageCaptureProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Clipboard paste works anywhere on the page, but only for images, so
  // pasting text into the problem box is unaffected.
  useEffect(() => {
    if (disabled) return;

    const onPaste = (event: ClipboardEvent) => {
      const image = firstImage(event.clipboardData?.files);
      if (!image) return;
      event.preventDefault();
      onFile(image);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [disabled, onFile]);

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const image = firstImage(event.target.files);
    event.target.value = "";
    if (image) onFile(image);
  };

  return (
    <div className="space-y-3">
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleInput}
      />
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleInput}
      />

      <Button
        type="button"
        size="lg"
        className="h-14 w-full bg-brand text-base text-white sm:hidden"
        disabled={disabled}
        onClick={() => cameraInput.current?.click()}
      >
        <Camera className="size-5" />
        Snap a photo
      </Button>

      <div
        className={cn(
          "hidden rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:block",
          dragging && "border-primary bg-primary/5",
          disabled && "opacity-60",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const image = firstImage(event.dataTransfer.files);
          if (image && !disabled) onFile(image);
        }}
      >
        <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-primary/25">
          <ImageUp className="size-7" />
        </div>
        <p className="font-semibold">Drop a photo of the problem here</p>
        <p className="mb-3 text-xs text-muted-foreground">
          or paste one with Cmd/Ctrl+V
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => fileInput.current?.click()}
        >
          Choose a file
        </Button>
      </div>

      <Button
        type="button"
        variant="link"
        size="sm"
        className="w-full sm:hidden"
        disabled={disabled}
        onClick={() => fileInput.current?.click()}
      >
        Upload from your photos instead
      </Button>
    </div>
  );
}
