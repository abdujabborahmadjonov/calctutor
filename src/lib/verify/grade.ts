import { buildEquivalencePlan } from "./plan";

// "correct": SymPy confirmed the answers are equal. "no_match": SymPy ran and
// could not show they are equal. "ungradable": the answer could not be read or
// the check could not run, so the student compares by eye instead.
export type Grade = "correct" | "no_match" | "ungradable";

export async function gradeAnswer(
  expectedLatex: string,
  studentLatex: string,
): Promise<Grade> {
  const plan = buildEquivalencePlan(expectedLatex, studentLatex);
  if (!plan) return "ungradable";

  const { runCasCheck } = await import("./verify");
  const outcome = await runCasCheck(plan);
  if (outcome === "verified") return "correct";
  return outcome === "unverified" ? "no_match" : "ungradable";
}
