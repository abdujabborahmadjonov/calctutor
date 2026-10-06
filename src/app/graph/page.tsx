import type { Metadata } from "next";

import { GraphingClient } from "@/components/GraphingClient";

export const metadata: Metadata = {
  title: "Graphing calculator · CalcTutor",
};

export default function GraphPage() {
  return <GraphingClient />;
}
