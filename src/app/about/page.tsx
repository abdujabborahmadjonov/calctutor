import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About · CalcTutor",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">About CalcTutor</h1>
      <div className="mt-6 space-y-5 leading-7 text-foreground/85">
        <p>
          CalcTutor is a study tool for single-variable Calculus I and II. It
          adapts its methods to Alberta high-school and university course
          coverage, then explains each rule and why it applies.
        </p>
        <p>
          Learn mode starts with hints so you can make progress before revealing
          a worked solution. Every completed solution includes an independent
          self-check.
        </p>
        <p>
          Your Phase 1 history stays in this browser. Problem text is sent to
          the configured Anthropic API only when real AI mode is enabled and is
          not included in server logs.
        </p>
        <p>
          Use CalcTutor according to your course&apos;s academic-integrity
          rules. You remain responsible for work you submit.
        </p>
      </div>
    </main>
  );
}
