"use client";

import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";

import { z } from "zod";

const ModeSchema = z.object({ mockAi: z.boolean() });

export function MockBanner() {
  const [mock, setMock] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/mode", { signal: controller.signal })
      .then((response) => response.json())
      .then((body: unknown) => setMock(ModeSchema.parse(body).mockAi))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        console.warn("[CalcTutor] Could not read the AI mode", error);
      });
    return () => controller.abort();
  }, []);

  if (!mock) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm text-amber-950 print:hidden dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
    >
      <FlaskConical className="size-4 shrink-0" />
      <span>
        <strong>Mock mode.</strong> Answers are saved examples, not live Claude
        responses. Set <code>MOCK_AI=false</code> and an API key to solve your
        own problems.
      </span>
    </div>
  );
}
