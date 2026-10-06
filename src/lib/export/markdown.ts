import type { Solution } from "@/lib/ai/schemas";

const display = (latex: string) => `$$\n${latex.trim()}\n$$`;

// Builds a self-contained Markdown copy of a solved problem, with math in
// $...$ and $$...$$ so it renders in Obsidian, GitHub, Notion and KaTeX
// viewers.
export function solutionToMarkdown(
  problemLatex: string,
  solution: Solution,
): string {
  const lines = [
    "# CalcTutor solution",
    "",
    "## Problem",
    "",
    display(solution.problem.restated_latex || problemLatex),
    "",
    "## Strategy",
    "",
    `**${solution.strategy.method}.** ${solution.strategy.why_this_method}`,
    "",
    `Other approaches: ${solution.strategy.alternatives}`,
    "",
    "## Steps",
    "",
  ];

  solution.steps.forEach((step, index) => {
    lines.push(`### ${index + 1}. ${step.title}`, "", `*${step.rule}*`, "");
    lines.push(display(step.latex), "", step.explanation, "");
    if (step.common_mistake) {
      lines.push(`> **Common mistake:** ${step.common_mistake}`, "");
    }
  });

  lines.push("## Final answer", "", display(solution.final_answer.latex), "");
  if (solution.final_answer.plain) lines.push(solution.final_answer.plain, "");
  if (solution.final_answer.domain_notes) {
    lines.push(solution.final_answer.domain_notes, "");
  }
  lines.push(
    `Self-checked by ${solution.check.method}. ${solution.check.detail}`.trim(),
    "",
    "---",
    "",
    "_Explanations are AI-generated; every final answer is self-checked, and CAS-verified where marked._",
    "",
  );

  return lines.join("\n");
}

export function markdownFileName(solution: Solution) {
  const slug = (solution.problem.topic_id || "solution")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
  return `calctutor-${slug || "solution"}.md`;
}
