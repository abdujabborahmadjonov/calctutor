const unicodeReplacements: Array<[RegExp, string]> = [
  [/π/g, String.raw`\pi`],
  [/∞/g, String.raw`\infty`],
  [/√/g, String.raw`\sqrt`],
  [/≤/g, String.raw`\leq`],
  [/≥/g, String.raw`\geq`],
  [/→/g, String.raw`\to`],
  [/−/g, "-"],
  [/×/g, String.raw`\times`],
];

export function normalizeLatex(value: string): string {
  let normalized = value.trim();

  if (
    (normalized.startsWith("$$") && normalized.endsWith("$$")) ||
    (normalized.startsWith("\\[") && normalized.endsWith("\\]"))
  ) {
    normalized = normalized.slice(2, -2).trim();
  } else if (
    normalized.startsWith("$") &&
    normalized.endsWith("$") &&
    normalized.length > 1
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  for (const [pattern, replacement] of unicodeReplacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .replaceAll(/\s+/g, " ")
    .replaceAll(String.raw`\dfrac`, String.raw`\frac`)
    .trim();
}
