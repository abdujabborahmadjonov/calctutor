import { openDB, type DBSchema } from "idb";

import type { Problem, SolutionRecord } from "@/lib/ai/schemas";

export type HistoryEntry = {
  id: string;
  problem: Problem;
  record: SolutionRecord;
};

interface CalcTutorDatabase extends DBSchema {
  history: {
    key: string;
    value: HistoryEntry;
    indexes: {
      "by-created-at": string;
      "by-topic": string;
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: string | boolean;
    };
  };
}

let database: ReturnType<typeof openDB<CalcTutorDatabase>> | undefined;

function getDatabase() {
  database ??= openDB<CalcTutorDatabase>("calctutor", 1, {
    upgrade(db) {
      const history = db.createObjectStore("history", { keyPath: "id" });
      history.createIndex("by-created-at", "record.createdAt");
      history.createIndex("by-topic", "problem.topicId");
      db.createObjectStore("settings", { keyPath: "key" });
    },
  });
  return database;
}

export async function saveHistoryEntry(entry: HistoryEntry) {
  return (await getDatabase()).put("history", entry);
}

export async function listHistory() {
  const entries = await (await getDatabase()).getAll("history");
  return entries.sort((left, right) =>
    right.record.createdAt.localeCompare(left.record.createdAt),
  );
}

export async function deleteHistoryEntry(id: string) {
  return (await getDatabase()).delete("history", id);
}

export async function clearHistory() {
  return (await getDatabase()).clear("history");
}

export async function getSetting(key: string) {
  return (await getDatabase()).get("settings", key);
}

export async function setSetting(key: string, value: string | boolean) {
  return (await getDatabase()).put("settings", { key, value });
}
