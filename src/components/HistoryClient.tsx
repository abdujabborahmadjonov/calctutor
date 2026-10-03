"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";

import { courseById, topicById } from "@/lib/curriculum/alberta";
import {
  clearHistory,
  deleteHistoryEntry,
  type HistoryEntry,
  listHistory,
} from "@/lib/storage/history";

import { Math } from "./Math";
import { Button, buttonVariants } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";

export function HistoryClient() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void listHistory()
      .then(setEntries)
      .catch((historyError: unknown) => {
        console.error("[CalcTutor] Could not load history", historyError);
        setError("This browser could not load local history.");
      })
      .finally(() => setLoading(false));
  }, []);

  const topicIds = useMemo(
    () =>
      [
        ...new Set(entries.flatMap((entry) => entry.problem.topicId ?? [])),
      ].sort((left, right) =>
        (topicById.get(left)?.name ?? left).localeCompare(
          topicById.get(right)?.name ?? right,
        ),
      ),
    [entries],
  );

  const filtered = entries.filter((entry) => {
    const matchesTopic = topic === "all" || entry.problem.topicId === topic;
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      !needle ||
      entry.problem.plain.toLowerCase().includes(needle) ||
      (entry.problem.topicId ?? "").toLowerCase().includes(needle);
    return matchesTopic && matchesQuery;
  });

  const removeEntry = async (id: string) => {
    try {
      await deleteHistoryEntry(id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
    } catch (deleteError) {
      console.error("[CalcTutor] Could not delete history", deleteError);
      setError("That history item could not be deleted.");
    }
  };

  const removeAll = async () => {
    try {
      await clearHistory();
      setEntries([]);
    } catch (clearError) {
      console.error("[CalcTutor] Could not clear history", clearError);
      setError("History could not be cleared.");
    }
  };

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full outline-none max-w-5xl flex-1 px-4 py-8 sm:px-6"
    >
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">History</h1>
          <p className="mt-2 text-muted-foreground">
            Solutions are stored only in this browser.
          </p>
        </div>
        {entries.length > 0 && (
          <Button type="button" variant="outline" onClick={removeAll}>
            Clear all
          </Button>
        )}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_16rem]">
        <label className="relative">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            value={query}
            className="pl-9"
            aria-label="Search history"
            placeholder="Search problems"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          value={topic}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          aria-label="Filter by topic"
          onChange={(event) => setTopic(event.target.value)}
        >
          <option value="all">All topics</option>
          {topicIds.map((topicId) => (
            <option key={topicId} value={topicId}>
              {topicById.get(topicId)?.name ?? topicId}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && entries.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <p className="font-medium">No solved problems yet.</p>
            <Link href="/" className={buttonVariants({ className: "mt-4" })}>
              Solve a problem
            </Link>
          </CardContent>
        </Card>
      )}
      {!loading && entries.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No history items match those filters.
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0 space-y-2">
                <div className="overflow-x-auto">
                  <Math latex={entry.problem.latex} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {topicById.get(entry.problem.topicId ?? "")?.name ??
                    "Calculus"}{" "}
                  · {courseById.get(entry.problem.courseId)?.code} ·{" "}
                  {new Date(entry.record.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/?problem=${encodeURIComponent(entry.problem.latex)}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Reopen
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete history item"
                  onClick={() => removeEntry(entry.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
