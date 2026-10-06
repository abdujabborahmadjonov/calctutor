import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

type MarkdownProps = {
  children: string;
  className?: string;
  // Renders inside running text: no block wrapper, paragraphs as spans.
  inline?: boolean;
};

export function Markdown({ children, className, inline }: MarkdownProps) {
  const Wrapper = inline ? "span" : "div";
  return (
    <Wrapper className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { output: "htmlAndMathml", trust: false }],
        ]}
        components={{
          p: ({ children: content }: ComponentProps<"p">) =>
            inline ? (
              <span>{content}</span>
            ) : (
              <p className="leading-7">{content}</p>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </Wrapper>
  );
}
