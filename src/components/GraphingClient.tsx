"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import { normalizeLatex } from "@/lib/latex/normalize";
import { compileFunction, type Curve, fitView } from "@/lib/math/graph";

import { CURVE_COLORS, GraphView } from "./GraphView";
import { Math } from "./Math";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";

const STARTERS = ["x^2 - 2", "\\sin(x)", ""];
const IDEAS = ["e^{-x^2}", "\\frac{1}{x}", "|x| - 3", "\\ln(x)", "x^3 - 3x"];

export function GraphingClient() {
  const [rows, setRows] = useState(STARTERS);
  const [version, setVersion] = useState(0);

  const compiled = useMemo(
    () => rows.map((row) => (row.trim() ? compileFunction(row) : undefined)),
    [rows],
  );
  const curves: Curve[] = rows.flatMap((row, index) => {
    const fn = compiled[index];
    return fn ? [{ label: `f${index + 1}`, latex: row, fn }] : [];
  });
  // Keep each row's color stable when an earlier row is empty or invalid.
  const colors = rows.map(
    (_, index) => CURVE_COLORS[index % CURVE_COLORS.length],
  );
  const fitted = () => fitView(compiled.flatMap((fn) => (fn ? [fn] : [])));
  // The view refits only when the user asks, not on every keystroke.
  const [initialView, setInitialView] = useState(() =>
    fitView(STARTERS.flatMap((row) => compileFunction(row) ?? [])),
  );

  const update = (index: number, value: string) =>
    setRows((current) => current.map((row, i) => (i === index ? value : row)));

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 outline-none sm:px-6"
    >
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Graphing <span className="text-brand">calculator</span>
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Type functions of x in plain notation (x^2 - 2, sin(x), 2^x) or LaTeX.
          Drag to pan, pinch or scroll to zoom, and hover to trace. Roots and
          the y-intercept of the first function are marked.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card>
          <CardContent className="space-y-3 py-5">
            {rows.map((row, index) => {
              const invalid = row.trim() !== "" && !compiled[index];
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ background: colors[index] }}
                      aria-hidden
                    />
                    <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
                      y{index + 1} =
                    </span>
                    <Input
                      value={row}
                      aria-label={`Function ${index + 1}`}
                      aria-invalid={invalid || undefined}
                      placeholder="e.g. x^3 - 3x"
                      className="h-10 font-mono"
                      onChange={(event) => update(index, event.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove function ${index + 1}`}
                      disabled={rows.length === 1}
                      onClick={() =>
                        setRows((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <X />
                    </Button>
                  </div>
                  {row.trim() && (
                    <div className="pl-[3.25rem] text-sm">
                      {invalid ? (
                        <span className="text-destructive">
                          Use one variable, like x^2 + 1.
                        </span>
                      ) : (
                        <Math latex={`y = ${normalizeLatex(row)}`} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={rows.length >= CURVE_COLORS.length}
                onClick={() => setRows((current) => [...current, ""])}
              >
                <Plus />
                Add function
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setInitialView(fitted());
                  setVersion((value) => value + 1);
                }}
              >
                Fit to functions
              </Button>
            </div>
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Try
              </p>
              <div className="flex flex-wrap gap-1.5">
                {IDEAS.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    className="rounded-full border bg-muted/40 px-3 py-1 text-sm hover:bg-muted"
                    onClick={() =>
                      setRows((current) => {
                        const empty = current.findIndex((row) => !row.trim());
                        if (empty >= 0)
                          return current.map((row, i) =>
                            i === empty ? idea : row,
                          );
                        return current.length < CURVE_COLORS.length
                          ? [...current, idea]
                          : current;
                      })
                    }
                  >
                    <Math latex={idea} />
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <GraphView
          key={version}
          curves={curves}
          colors={rows.flatMap((row, index) =>
            compiled[index] ? [colors[index]] : [],
          )}
          initialView={initialView}
          height={520}
          label="Graph of your functions"
        />
      </div>
    </main>
  );
}
