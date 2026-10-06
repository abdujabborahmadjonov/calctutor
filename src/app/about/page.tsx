import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About · CalcTutor",
};

export default function AboutPage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full outline-none max-w-3xl flex-1 px-4 py-12 sm:px-6"
    >
      <h1 className="text-3xl font-semibold tracking-tight">About CalcTutor</h1>
      <div className="mt-6 space-y-5 leading-7 text-foreground/85">
        <p>
          CalcTutor solves any math problem, from fractions and algebra to
          linear algebra and differential equations, plus physics, chemistry and
          other homework questions. It explains each rule and why it applies,
          graphs functions and equations, and checks answers with SymPy in your
          browser where it can. For calculus you can also pick an Alberta
          high-school or university course, and it will use only the methods
          your class has covered.
        </p>
        <p>
          Learn mode starts with hints so you can make progress before revealing
          a worked solution. Every completed solution includes an independent
          self-check.
        </p>
        <p>
          Your history stays in this browser. Problem text is sent to the
          configured Anthropic API only when real AI mode is enabled and is not
          included in server logs.
        </p>
        <p>
          Use CalcTutor according to your course&apos;s academic-integrity
          rules. You remain responsible for work you submit.
        </p>
      </div>
    </main>
  );
}
