import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TopicDetail } from "@/components/TopicDetail";
import { topicById, topics } from "@/lib/curriculum/alberta";

type TopicPageProps = { params: Promise<{ topicId: string }> };

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
  return <TopicDetail topic={topic} />;
}
