import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

type MarkdownProps = {
  children: string;
  className?: string;
};

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { output: "htmlAndMathml", trust: false }],
        ]}
        components={{
          p: ({ children: content }: ComponentProps<"p">) => (
            <p className="leading-7">{content}</p>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
