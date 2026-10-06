"use client";

import { type ReactNode, useRef, useState } from "react";
import {
  BookOpen,
  Camera,
  ClipboardCheck,
  Keyboard,
  PenLine,
  Settings2,
  Sparkles,
  Type,
} from "lucide-react";

import { looksLikeProse, normalizeLatex } from "@/lib/latex/normalize";
import { instantAnswer } from "@/lib/math/evaluate";
import type { SubjectId } from "@/lib/subjects";
import { cn } from "@/lib/utils";

import { CheckWorkInput } from "./CheckWorkInput";
import { Math as MathTex } from "./Math";
import { insertKey, MathKeyboard } from "./MathKeyboard";
import { PhotoInput } from "./PhotoInput";
import { SubjectPicker } from "./SubjectPicker";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

type Tab = "type" | "scan" | "write" | "check";

const TABS: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: "type", label: "Type", icon: <Type className="size-4" /> },
  { id: "scan", label: "Scan", icon: <Camera className="size-4" /> },
  { id: "write", label: "Write", icon: <PenLine className="size-4" /> },
  {
    id: "check",
    label: "Check work",
    icon: <ClipboardCheck className="size-4" />,
  },
];

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSolve: () => void;
  busy: boolean;
  subject: SubjectId;
  onSubjectChange: (subject: SubjectId) => void;
  learnMode: boolean;
  onLearnModeChange: (checked: boolean) => void;
  settings: ReactNode;
  onPhotoSolve: (latex: string) => void;
  onPhotoCheckWork: (latex: string, studentWork: string) => void;
  onCheckWork: (studentWork: string) => void;
};

export function Composer({
  value,
  onChange,
  onSolve,
  busy,
  subject,
  onSubjectChange,
  learnMode,
  onLearnModeChange,
  settings,
  onPhotoSolve,
  onPhotoCheckWork,
  onCheckWork,
}: ComposerProps) {
  const [tab, setTab] = useState<Tab>("type");
  const [keyboard, setKeyboard] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const normalized = normalizeLatex(value);
  const prose = looksLikeProse(value);
  const instant = prose ? undefined : instantAnswer(value);

  const focusAt = (caret: number) =>
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(caret, caret);
    });

  const pressKey = (insert: string) => {
    const element = textarea.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    const next = insertKey(value, start, end, insert);
    onChange(next.value.slice(0, 2_000));
    focusAt(next.caret);
  };

  const backspace = () => {
    const element = textarea.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    if (start !== end) {
      onChange(value.slice(0, start) + value.slice(end));
      focusAt(start);
    } else if (start > 0) {
      onChange(value.slice(0, start - 1) + value.slice(start));
      focusAt(start - 1);
    }
  };

  const move = (delta: number) => {
    const position = textarea.current?.selectionStart ?? value.length;
    focusAt(Math.min(Math.max(position + delta, 0), value.length));
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border bg-card shadow-xl shadow-primary/5 ring-1 ring-foreground/5">
        <div
          role="tablist"
          aria-label="How to enter the problem"
          className="flex gap-1 border-b bg-muted/40 p-1.5"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`composer-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`composer-panel-${item.id === "write" ? "scan" : item.id}`}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-2 py-2 text-sm font-medium transition-all",
                tab === item.id
                  ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/5"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.icon}
              <span className={cn(item.id === "check" && "hidden sm:inline")}>
                {item.label}
              </span>
              {item.id === "check" && <span className="sm:hidden">Check</span>}
            </button>
          ))}
        </div>

        {tab === "type" && (
          <div
            role="tabpanel"
            id="composer-panel-type"
            aria-labelledby="composer-tab-type"
            className="space-y-3 p-4 sm:p-5"
          >
            <Textarea
              ref={textarea}
              value={value}
              maxLength={2_000}
              rows={3}
              inputMode={keyboard ? "none" : undefined}
              className="min-h-24 resize-none border-0 bg-transparent px-1 text-xl shadow-none placeholder:text-base placeholder:text-muted-foreground/80 focus-visible:ring-0 md:text-xl dark:bg-transparent"
              placeholder="Type any problem or question, like x^2-5x+6=0 or “how far does a ball thrown at 12 m/s go?”"
              aria-label="Problem"
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  (event.metaKey || event.ctrlKey || !event.shiftKey) &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  if (value.trim() && !busy) onSolve();
                }
              }}
            />

            <div
              className="flex min-h-14 flex-wrap items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3"
              aria-live="polite"
            >
              {normalized ? (
                <>
                  <div className="min-w-0 flex-1 overflow-x-auto text-lg">
                    {prose ? (
                      <p className="text-base">{value}</p>
                    ) : (
                      <MathTex latex={normalized} display />
                    )}
                  </div>
                  {instant && (
                    <div
                      className="flex shrink-0 items-center gap-1 rounded-full bg-brand px-3 py-1 text-white shadow-md shadow-primary/20"
                      aria-label="Instant answer"
                    >
                      <span className="text-sm">=</span>
                      <MathTex latex={instant.latex} />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  The formatted problem appears here as you type. Plain
                  arithmetic gets an instant answer.
                </p>
              )}
            </div>

            {keyboard && (
              <MathKeyboard
                onKey={pressKey}
                onBackspace={backspace}
                onMove={move}
              />
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={keyboard ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={keyboard}
                onClick={() => setKeyboard((open) => !open)}
              >
                <Keyboard />
                Math keys
              </Button>
              <label className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium">
                <BookOpen className="size-4 text-muted-foreground" />
                Learn mode
                <Switch
                  checked={learnMode}
                  onCheckedChange={onLearnModeChange}
                  aria-label="Learn mode"
                />
              </label>
              <Button
                type="button"
                variant={showSettings ? "secondary" : "ghost"}
                size="sm"
                aria-expanded={showSettings}
                onClick={() => setShowSettings((open) => !open)}
              >
                <Settings2 />
                Course
              </Button>
              <Button
                type="button"
                size="lg"
                className="ml-auto h-11 min-w-36 rounded-xl bg-brand px-5 text-base text-white shadow-lg shadow-primary/25 hover:opacity-95"
                disabled={!value.trim() || busy}
                onClick={onSolve}
              >
                <Sparkles />
                {busy ? "Solving…" : "Solve problem"}
              </Button>
            </div>

            {showSettings && (
              <div className="rounded-2xl border bg-muted/30 p-4">
                {settings}
              </div>
            )}
          </div>
        )}

        <div
          role="tabpanel"
          id="composer-panel-scan"
          aria-labelledby={`composer-tab-${tab === "write" ? "write" : "scan"}`}
          hidden={tab !== "scan" && tab !== "write"}
          className="p-4 sm:p-5"
        >
          <PhotoInput
            mode={tab === "write" ? "write" : "scan"}
            onSolve={onPhotoSolve}
            onCheckWork={onPhotoCheckWork}
            disabled={busy}
          />
        </div>

        {tab === "check" && (
          <div
            role="tabpanel"
            id="composer-panel-check"
            aria-labelledby="composer-tab-check"
            className="p-4 sm:p-5"
          >
            <CheckWorkInput
              problem={value}
              onProblemChange={onChange}
              disabled={busy}
              onCheck={onCheckWork}
            />
          </div>
        )}
      </div>

      <SubjectPicker value={subject} onChange={onSubjectChange} />
    </div>
  );
}
