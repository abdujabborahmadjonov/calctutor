"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { type Transcription, TranscriptionSchema } from "@/lib/ai/schemas";
import { ImagePrepError, prepareImage } from "@/lib/image/prepare";

import { ImageCapture } from "./ImageCapture";
import { TranscriptionConfirm } from "./TranscriptionConfirm";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
  onSolve,
  onCheckWork,
  disabled,
}: PhotoInputProps) {
  const [state, setState] = useState<PhotoState>({ stage: "idle" });
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
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Or use a photo</CardTitle>
        <p className="text-sm text-muted-foreground">
          A clear photo of one problem works best. You confirm what was read
          before anything is solved.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="flex gap-2 text-sm text-destructive" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img
            src={previewUrl}
            alt="Your problem photo"
            className="max-h-56 w-full rounded-lg border object-contain"
          />
        )}

        {state.stage === "idle" && (
          <ImageCapture onFile={readPhoto} disabled={disabled} />
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
      </CardContent>
    </Card>
  );
}
