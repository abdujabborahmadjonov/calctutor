"use client";

import { useMemo } from "react";
import { LineChart } from "lucide-react";

import type { Solution } from "@/lib/ai/schemas";
import { curvesForSolution, suggestView } from "@/lib/math/graph";

import { CURVE_COLORS, GraphView } from "./GraphView";
import { Math } from "./Math";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function SolutionGraph({ solution }: { solution: Solution }) {
  const curves = useMemo(() => curvesForSolution(solution), [solution]);
  const view = useMemo(() => suggestView(curves), [curves]);

  if (curves.length === 0) return null;

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart className="size-4 text-primary" />
          Graph
        </CardTitle>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {curves.map((curve, index) => (
            <li key={curve.label} className="flex items-center gap-2">
              <span
                className="inline-block h-1 w-5 rounded-full"
                style={{ background: CURVE_COLORS[index] }}
                aria-hidden
              />
              <span className="text-muted-foreground">{curve.label}</span>
              <Math latex={curve.latex} />
            </li>
          ))}
        </ul>
      </CardHeader>
      <CardContent>
        <GraphView
          key={solution.problem.restated_latex}
          curves={curves}
          initialView={view}
          height={300}
          label={`Graph of ${curves.map((curve) => curve.label.toLowerCase()).join(" and ")}`}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Drag to pan, pinch or scroll to zoom. Hover or touch to trace.
        </p>
      </CardContent>
    </Card>
  );
}
