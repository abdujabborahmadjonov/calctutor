"use client";

import { type SubjectId, subjects } from "@/lib/subjects";
import { cn } from "@/lib/utils";

type SubjectPickerProps = {
  value: SubjectId;
  onChange: (subject: SubjectId) => void;
};

export function SubjectPicker({ value, onChange }: SubjectPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Subject"
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [mask-image:linear-gradient(to_right,black_88%,transparent)] [scrollbar-width:none]"
    >
      {subjects.map((subject) => {
        const selected = subject.id === value;
        return (
          <button
            key={subject.id}
            type="button"
            role="radio"
            aria-checked={selected}
            title={subject.name}
            onClick={() => onChange(subject.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
              selected
                ? "border-transparent bg-brand text-white shadow-md shadow-primary/20"
                : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-5 place-items-center rounded-full text-[11px] font-semibold",
                selected ? "bg-white/20" : "bg-muted text-foreground/80",
              )}
            >
              {subject.glyph}
            </span>
            {subject.short}
          </button>
        );
      })}
    </div>
  );
}
