"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import type { Step } from "@/lib/ai/schemas";

import { Markdown } from "./Markdown";
import { Math } from "./Math";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type StepCardProps = {
  step: Step;
  index: number;
};

export function StepCard({ step, index }: StepCardProps) {
  const [copied, setCopied] = useState(false);

  const copyLatex = async () => {
    await navigator.clipboard.writeText(step.latex);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <Card className="border-l-4 border-l-primary/70">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">
            <span className="mr-2 text-muted-foreground">{index + 1}.</span>
            {step.title}
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Copy LaTeX for step ${index + 1}`}
            onClick={copyLatex}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
        <Badge variant="secondary" className="w-fit">
          {step.rule}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-lg bg-muted/40 px-4 py-3">
          <Math latex={step.latex} display />
        </div>
        <Markdown className="text-foreground/85">{step.explanation}</Markdown>
        {step.common_mistake && (
          <aside className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
            <strong>Common mistake:</strong> {step.common_mistake}
          </aside>
        )}
      </CardContent>
    </Card>
  );
}
