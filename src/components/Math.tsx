import katex from "katex";

type MathProps = {
  latex: string;
  display?: boolean;
  className?: string;
};

export function Math({ latex, display = false, className }: MathProps) {
  const html = katex.renderToString(latex || String.raw`\text{ }`, {
    displayMode: display,
    throwOnError: false,
    trust: false,
    output: "htmlAndMathml",
    strict: "ignore",
  });

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      data-math-display={display || undefined}
    />
  );
}
