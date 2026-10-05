"use client";

import { looksLikeProse } from "@/lib/latex/normalize";
import { type SubjectId, subjects } from "@/lib/subjects";

import { Math } from "./Math";

type ExampleGalleryProps = {
  onPick: (problem: string, subject: SubjectId) => void;
};

const SHOWN: SubjectId[] = [
  "arithmetic",
  "algebra",
  "trigonometry",
  "calculus",
  "linear-algebra",
  "differential-equations",
  "statistics",
  "physics",
];

export function ExampleGallery({ onPick }: ExampleGalleryProps) {
  return (
    <section aria-labelledby="examples-heading" className="space-y-3">
      <h2
        id="examples-heading"
        className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
      >
        Try an example
      </h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {subjects
          .filter((subject) => SHOWN.includes(subject.id))
          .map((subject) => (
            <button
              key={subject.id}
              type="button"
              aria-label={`Try ${subject.name}: ${subject.example}`}
              onClick={() => onPick(subject.example, subject.id)}
              className="group flex items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-lg font-semibold text-accent-foreground transition-colors group-hover:bg-brand group-hover:text-white"
              >
                {subject.glyph}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-muted-foreground">
                  {subject.name}
                </span>
                <span className="block truncate text-sm">
                  {looksLikeProse(subject.example) ? (
                    subject.example
                  ) : (
                    <Math latex={subject.example} />
                  )}
                </span>
              </span>
            </button>
          ))}
      </div>
    </section>
  );
}
