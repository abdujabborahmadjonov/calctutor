import type { Metadata } from "next";
import Link from "next/link";

import { topics } from "@/lib/curriculum/alberta";

export const metadata: Metadata = { title: "Topics · CalcTutor" };

const units = [
  { id: "calc1", name: "Calculus I" },
  { id: "calc2", name: "Calculus II" },
] as const;

export default function TopicsPage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full outline-none max-w-4xl flex-1 space-y-8 px-4 py-8 sm:px-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Topics</h1>
        <p className="text-muted-foreground">
          Every topic on the Alberta Calculus I and II course map, in teaching
          order. Open one for a short explainer and practice problems.
        </p>
      </div>
      {units.map((unit) => (
        <section key={unit.id} className="space-y-3">
          <h2 className="text-xl font-semibold">{unit.name}</h2>
          <ol className="grid gap-2 sm:grid-cols-2">
            {topics
              .filter((topic) => topic.unit === unit.id)
              .map((topic) => (
                <li key={topic.id}>
                  <Link
                    href={`/topics/${topic.id}`}
                    className="block rounded-lg border px-4 py-3 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {topic.name}
                  </Link>
                </li>
              ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
