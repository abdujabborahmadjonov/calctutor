"use client";

import { useRef } from "react";

import { normalizeLatex } from "@/lib/latex/normalize";

import { Math } from "./Math";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";

const palette = [
  { label: "Integral", snippet: String.raw`\int_{}^{} ` },
  { label: "Derivative", snippet: String.raw`\frac{d}{dx}` },
  { label: "Limit", snippet: String.raw`\lim_{x \to }` },
  { label: "Fraction", snippet: String.raw`\frac{}{}` },
  { label: "Root", snippet: String.raw`\sqrt{}` },
  { label: "Sum", snippet: String.raw`\sum_{n=1}^{\infty}` },
  { label: "Power", snippet: "^{}" },
  { label: "Pi", snippet: String.raw`\pi` },
  { label: "e", snippet: "e^{}" },
  { label: "Sine", snippet: String.raw`\sin()` },
  { label: "Cosine", snippet: String.raw`\cos()` },
  { label: "Tangent", snippet: String.raw`\tan()` },
  { label: "Arcsine", snippet: String.raw`\arcsin()` },
  { label: "Infinity", snippet: String.raw`\infty` },
];

const examples = [
  String.raw`\lim_{x \to 0}\frac{\sin x}{x}`,
  String.raw`\frac{d}{dx}\left[x^2\sin(3x)\right]`,
  String.raw`\int x e^x\,dx`,
];

type ProblemInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSolve: () => void;
  isSolving: boolean;
};

export function ProblemInput({
  value,
  onChange,
  onSolve,
  isSolving,
}: ProblemInputProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const normalized = normalizeLatex(value);

  const insertSnippet = (snippet: string) => {
    const element = textarea.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(
        start + snippet.length,
        start + snippet.length,
      );
    });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Enter a calculus problem</CardTitle>
        <p className="text-sm text-muted-foreground">
          Plain English is fine: integrate x e^x
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {!value && (
          <div className="flex flex-wrap gap-2" aria-label="Problem examples">
            {examples.map((example) => (
              <Button
                key={example}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange(example)}
              >
                <Math latex={example} />
              </Button>
            ))}
          </div>
        )}

        <div
          className="flex flex-wrap gap-1.5"
          aria-label="Math symbol palette"
        >
          {palette.map((item) => (
            <Button
              key={item.label}
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Insert ${item.label}`}
              onClick={() => insertSnippet(item.snippet)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Textarea
            ref={textarea}
            value={value}
            maxLength={2_000}
            rows={7}
            className="resize-y font-mono text-base"
            placeholder="Type text or LaTeX"
            aria-label="Calculus problem"
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                onSolve();
              }
            }}
          />
          <p className="text-right text-xs text-muted-foreground">
            {value.length}/2,000
          </p>
        </div>

        <div className="min-h-24 rounded-xl border bg-muted/30 p-4">
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Preview
          </p>
          {normalized ? (
            <div className="overflow-x-auto">
              <Math latex={normalized} display />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your formatted problem appears here.
            </p>
          )}
        </div>

        <div className="sticky bottom-3 z-10 sm:static">
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!value.trim() || isSolving}
            onClick={onSolve}
          >
            {isSolving ? "Solving…" : "Solve problem"}
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Press Cmd/Ctrl+Enter to solve.
        </p>
      </CardContent>
    </Card>
  );
}
