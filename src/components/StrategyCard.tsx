import type { Solution } from "@/lib/ai/schemas";

import { Markdown } from "./Markdown";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function StrategyCard({ strategy }: { strategy: Solution["strategy"] }) {
  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="gap-3">
        <Badge className="w-fit">Strategy</Badge>
        <CardTitle>{strategy.method}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <strong>Why it fits</strong>
          <Markdown>{strategy.why_this_method}</Markdown>
        </div>
        <div>
          <strong>Other approaches</strong>
          <Markdown>{strategy.alternatives}</Markdown>
        </div>
      </CardContent>
    </Card>
  );
}
