"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, PenLine } from "lucide-react";

import { type Transcription, TranscriptionSchema } from "@/lib/ai/schemas";
import { ImagePrepError, prepareImage } from "@/lib/image/prepare";

import { HandwritingPad } from "./HandwritingPad";
import { ImageCapture } from "./ImageCapture";
import { TranscriptionConfirm } from "./TranscriptionConfirm";
import { Button } from "./ui/button";
import { formatElapsed, useElapsedSeconds } from "./useElapsedSeconds";

type PhotoState =
  | { stage: "idle" }
  | { stage: "reading"; previewUrl?: string }
  | {
      stage: "confirm";
      previewUrl: string;
      transcription: Transcription;
      isMock: boolean;
    };

type PhotoInputProps = {
  // Which entry the idle state offers: a photo, or the handwriting pad.
  mode: "scan" | "write";
  onSolve: (latex: string) => void;
  onCheckWork: (latex: string, studentWork: string) => void;
  disabled: boolean;
};

type ApiError = { error?: { message?: string } };

function ReadingState() {
  const seconds = useElapsedSeconds();
  return (
    <div aria-live="polite">
      <p className="font-medium">Reading the problem</p>
      <p className="text-sm text-muted-foreground">{formatElapsed(seconds)}</p>
    </div>
  );
}

export function PhotoInput({
  mode,
  onSolve,
  onCheckWork,
  disabled,
}: PhotoInputProps) {
  const [state, setState] = useState<PhotoState>({ stage: "idle" });
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");
  const previewUrl = state.stage === "idle" ? undefined : state.previewUrl;

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const readPhoto = useCallback(async (file: File) => {
    setError("");
    setState({ stage: "reading" });

    try {
      const image = await prepareImage(file);
      setState({ stage: "reading", previewUrl: image.previewUrl });

      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaType: image.mediaType, data: image.data }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiError;
        throw new Error(
          body.error?.message ?? "Something went wrong on our side.",
        );
      }

      setState({
        stage: "confirm",
        previewUrl: image.previewUrl,
        transcription: TranscriptionSchema.parse(await response.json()),
        isMock: response.headers.get("X-CalcTutor-AI-Mode") === "mock",
      });
    } catch (readError) {
      if (!(readError instanceof ImagePrepError)) {
        console.error("[CalcTutor] Transcription failed", readError);
      }
      setError(
        readError instanceof Error
          ? readError.message
          : "Something went wrong on our side.",
      );
      setState({ stage: "idle" });
    }
  }, []);

  return (
    <div className="space-y-4">
      {error && (
        <p className="flex gap-2 text-sm text-destructive" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      {previewUrl && (
        // A local blob URL, so Next's image optimizer is bypassed.
        <Image
          src={previewUrl}
          alt="Your problem photo"
          width={2000}
          height={2000}
          unoptimized
          className="max-h-56 w-full rounded-xl border object-contain"
        />
      )}

      {state.stage === "idle" && mode === "write" && (
        <div className="rounded-2xl border-2 border-dashed p-6 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-primary/25">
            <PenLine className="size-7" />
          </div>
          <p className="font-semibold">Write it by hand</p>
          <p className="mx-auto mb-4 max-w-sm text-sm text-muted-foreground">
            A full-screen page for Apple Pencil, a finger, or a mouse. Write the
            problem, and your working under it to have it checked.
          </p>
          <Button
            type="button"
            size="lg"
            className="h-12 px-6 text-base"
            disabled={disabled}
            onClick={() => setWriting(true)}
          >
            <PenLine className="size-5" />
            Write with Apple Pencil
          </Button>
        </div>
      )}

      {writing && (
        <HandwritingPad
          onCancel={() => setWriting(false)}
          onDone={(image) => {
            setWriting(false);
            void readPhoto(image);
          }}
        />
      )}

      {/* Stays mounted on the write tab too, so pasting an image works. */}
      {state.stage === "idle" && (
        <div hidden={mode !== "scan"}>
          <ImageCapture onFile={readPhoto} disabled={disabled} />
        </div>
      )}

      {state.stage === "reading" && <ReadingState />}

      {state.stage === "confirm" && (
        <TranscriptionConfirm
          transcription={state.transcription}
          isMock={state.isMock}
          onRetake={() => setState({ stage: "idle" })}
          onSolve={(latex) => {
            setState({ stage: "idle" });
            onSolve(latex);
          }}
          onCheckWork={(latex, studentWork) => {
            setState({ stage: "idle" });
            onCheckWork(latex, studentWork);
          }}
        />
      )}
    </div>
  );
}
