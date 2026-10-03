import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/Markdown";
import { TopicPractice } from "@/components/TopicPractice";
import { Badge } from "@/components/ui/badge";
import { topicById, topics } from "@/lib/curriculum/alberta";
import { topicExplainers } from "@/lib/curriculum/explainers";

type TopicPageProps = { params: Promise<{ topicId: string }> };

const REPORT_URL =
  "https://github.com/abdujabborahmadjonov/calctutor/issues/new";

export function generateStaticParams() {
  return topics.map((topic) => ({ topicId: topic.id }));
}

export async function generateMetadata({
  params,
}: TopicPageProps): Promise<Metadata> {
  const topic = topicById.get((await params).topicId);
  return { title: topic ? `${topic.name} · CalcTutor` : "Topic · CalcTutor" };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const topic = topicById.get((await params).topicId);
  if (!topic) notFound();

  const reportHref = `${REPORT_URL}?${new URLSearchParams({
    title: `Wrong topic: ${topic.id}`,
    body: `Topic: ${topic.name} (${topic.id})\n\nWhat is wrong:\n`,
  })}`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <Link
          href="/topics"
          className="text-sm text-muted-foreground hover:underline"
        >
          All topics
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {topic.name}
          </h1>
          <Badge variant="secondary">
            {topic.unit === "calc1" ? "Calculus I" : "Calculus II"}
          </Badge>
        </div>
        <Markdown className="text-foreground/85">
          {topicExplainers[topic.id] ?? ""}
        </Markdown>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Methods in this topic</h2>
        <ul className="flex flex-wrap gap-2">
          {topic.methods.map((method) => (
            <li key={method}>
              <Badge variant="outline">{method}</Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Typical problems</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {topic.typicalProblems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </section>

      <TopicPractice topicId={topic.id} />

      <p className="text-xs text-muted-foreground">
        Topic boundaries are a best reading of the course syllabi.{" "}
        <a
          href={reportHref}
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          Report a wrong topic
        </a>
      </p>
    </main>
  );
}
