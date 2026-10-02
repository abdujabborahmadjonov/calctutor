import type { Metadata } from "next";

import { HistoryClient } from "@/components/HistoryClient";

export const metadata: Metadata = {
  title: "History · CalcTutor",
};

export default function HistoryPage() {
  return <HistoryClient />;
}
