import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16 sm:px-10">
      <section className="max-w-2xl space-y-8">
        <div className="space-y-4">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Phase 0
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Calculus explained one step at a time.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            CalcTutor is being built for Alberta calculus students. The
            application foundation, validation, testing, and health endpoint are
            ready for the text-solver phase.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className={buttonVariants({ size: "lg" })} href="/api/health">
            Check service health
          </Link>
          <span
            aria-disabled="true"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Phase 1 is next
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Explanations are AI-generated; every final answer will be
          self-checked, and CAS-verified where marked.
        </p>
      </section>
    </main>
  );
}
