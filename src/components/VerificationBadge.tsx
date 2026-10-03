"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, CircleHelp, Loader2 } from "lucide-react";

import type { Solution } from "@/lib/ai/schemas";
import { buildVerifyPlan } from "@/lib/verify/plan";

type Status = "checking" | "verified" | "unverified";

// Loads the SymPy worker only when this badge mounts with a checkable answer.
async function verifySolution(solution: Solution): Promise<boolean> {
  const plan = buildVerifyPlan(solution);
  if (!plan) return false;
  const { runCasCheck } = await import("@/lib/verify/verify");
  return (await runCasCheck(plan)) === "verified";
}

export function VerificationBadge({ solution }: { solution: Solution }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let active = true;
    verifySolution(solution)
      .then((verified) => {
        if (active) setStatus(verified ? "verified" : "unverified");
      })
      .catch((error: unknown) => {
        // A worker that cannot start, or a chunk that fails to load, must
        // still end in "Could not verify" instead of spinning forever.
        console.warn("[CalcTutor] SymPy check could not run", error);
        if (active) setStatus("unverified");
      });
    return () => {
      active = false;
    };
  }, [solution]);

  if (status === "checking") {
    return (
      <p
        className="flex items-center gap-2 text-sm text-muted-foreground"
        aria-live="polite"
      >
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
        Checking with SymPy
      </p>
    );
  }

  if (status === "verified") {
    return (
      <p
        className="flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
        aria-live="polite"
      >
        <BadgeCheck className="size-4" />
        Verified with SymPy
      </p>
    );
  }

  return (
    <p
      className="flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
      aria-live="polite"
      title="SymPy could not check this answer automatically. The self-check above still applies."
    >
      <CircleHelp className="size-4" />
      Could not verify
    </p>
  );
}
