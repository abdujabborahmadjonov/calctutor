"use client";

import { useRef, useState } from "react";

import type { Solution } from "@/lib/ai/schemas";

import { Markdown } from "./Markdown";
import { Button } from "./ui/button";

export type ExplainContext = { problemLatex: string; solution: Solution };

type ExplainMoreProps = ExplainContext & { stepIndex: number };

type ApiError = { error?: { message?: string } };

export function ExplainMore({
  problemLatex,
  solution,
  stepIndex,
}: ExplainMoreProps) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const load = async () => {
    setOpen(true);
    setStatus("loading");
    setError("");
    setText("");
    controller.current = new AbortController();

    try {
      const response = await fetch("/api/explain-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemLatex, solution, stepIndex }),
        signal: controller.current.signal,
      });

      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as ApiError;
        throw new Error(
          body.error?.message ?? "Something went wrong on our side.",
        );
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let accumulated = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulated += value;
        setText(accumulated);
      }

      setStatus("done");
    } catch (loadError) {
      if (
        loadError instanceof DOMException &&
        loadError.name === "AbortError"
      ) {
        return;
      }
      console.error("[CalcTutor] Explain step failed", loadError);
      setError(
        loadError instanceof TypeError
          ? "The explanation stopped early. Try again."
          : loadError instanceof Error
            ? loadError.message
            : "Something went wrong on our side.",
      );
      setStatus("idle");
    }
  };

  const toggle = () => {
    if (status === "idle" && !text) {
      void load();
      return;
    }
    setOpen((value) => !value);
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto px-0"
        aria-expanded={open}
        onClick={toggle}
      >
        {open && text
          ? "Hide the longer explanation"
          : "Explain this step more"}
      </Button>

      {open && (status === "loading" || text) && (
        <div
          className="rounded-lg border bg-muted/30 p-4 text-sm"
          aria-live="polite"
          aria-busy={status === "loading"}
        >
          {text ? (
            <Markdown>{text}</Markdown>
          ) : (
            <p className="text-muted-foreground">
              Writing a longer explanation
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span role="alert">{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={load}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
