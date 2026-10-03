"use client";

import { useState } from "react";
import { Check, Copy, FileDown, Printer, ShieldCheck } from "lucide-react";

import type { Solution } from "@/lib/ai/schemas";
import { markdownFileName, solutionToMarkdown } from "@/lib/export/markdown";

import { Math } from "./Math";
import { PracticeSimilar, type PracticeContext } from "./PracticeSimilar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { VerificationBadge } from "./VerificationBadge";

type FinalAnswerCardProps = {
  solution: Solution;
  practice: PracticeContext;
};

function downloadMarkdown(problemLatex: string, solution: Solution) {
  const blob = new Blob([solutionToMarkdown(problemLatex, solution)], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = markdownFileName(solution);
  link.click();
  URL.revokeObjectURL(url);
}

export function FinalAnswerCard({ solution, practice }: FinalAnswerCardProps) {
  const [copied, setCopied] = useState(false);

  const copyFinalAnswer = async () => {
    await navigator.clipboard.writeText(solution.final_answer.latex);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <Card className="border-2 border-primary/30 print:break-inside-avoid">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Final answer</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="print:hidden"
            aria-label="Copy final answer LaTeX"
            onClick={copyFinalAnswer}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-lg bg-muted/40 p-4">
          <Math latex={solution.final_answer.latex} display />
        </div>
        <p>{solution.final_answer.plain}</p>
        {solution.final_answer.domain_notes && (
          <p className="text-sm text-muted-foreground">
            {solution.final_answer.domain_notes}
          </p>
        )}
        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>
            Self-checked by {solution.check.method}. {solution.check.detail}
          </span>
        </div>
        <VerificationBadge solution={solution} />

        <div className="flex flex-wrap gap-2 border-t pt-4 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadMarkdown(practice.problemLatex, solution)}
          >
            <FileDown />
            Download Markdown
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer />
            Print or save as PDF
          </Button>
        </div>

        <div className="print:hidden">
          <PracticeSimilar {...practice} />
        </div>
      </CardContent>
    </Card>
  );
}
