"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";

import { formatNumber } from "@/lib/math/evaluate";
import {
  type Curve,
  DEFAULT_VIEW,
  keyPoints,
  sampleCurve,
  ticks,
  tickStep,
  type View,
} from "@/lib/math/graph";
import { cn } from "@/lib/utils";

export const CURVE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Give the component a new key to reset its view for new curves.
type GraphViewProps = {
  curves: Curve[];
  // One color per curve; defaults to the chart palette in order.
  colors?: string[];
  initialView?: View;
  height?: number;
  className?: string;
  label?: string;
};

const round = (value: number) =>
  Number(formatNumber(Number(value.toPrecision(6))));

export function GraphView({
  curves,
  colors = CURVE_COLORS,
  initialView = DEFAULT_VIEW,
  height = 320,
  className,
  label = "Graph",
}: GraphViewProps) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [view, setView] = useState(initialView);
  const [hoverX, setHoverX] = useState<number>();
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: View; distance?: number }>(undefined);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(200, Math.round(entry.contentRect.width))),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const toPx = (x: number, y: number): [number, number] => [
    ((x - view.xMin) / (view.xMax - view.xMin)) * width,
    height - ((y - view.yMin) / (view.yMax - view.yMin)) * height,
  ];
  const toX = (px: number) =>
    view.xMin + (px / width) * (view.xMax - view.xMin);

  const paths = useMemo(
    () =>
      curves.map((curve) =>
        sampleCurve(curve.fn, view, Math.min(900, width)).map((segment) =>
          segment
            .map(([x, y], index) => {
              const clampedY = Math.max(
                view.yMin - (view.yMax - view.yMin) * 2,
                Math.min(view.yMax + (view.yMax - view.yMin) * 2, y),
              );
              const [px, py] = [
                ((x - view.xMin) / (view.xMax - view.xMin)) * width,
                height -
                  ((clampedY - view.yMin) / (view.yMax - view.yMin)) * height,
              ];
              return `${index === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
            })
            .join(""),
        ),
      ),
    [curves, view, width, height],
  );

  const points = useMemo(
    () => (curves[0] ? keyPoints(curves[0].fn, view) : []),
    [curves, view],
  );

  const xStep = tickStep(view.xMax - view.xMin, Math.max(4, width / 80));
  const yStep = tickStep(view.yMax - view.yMin, Math.max(4, height / 60));
  const xTicks = ticks(view.xMin, view.xMax, xStep);
  const yTicks = ticks(view.yMin, view.yMax, yStep);
  const [originX, originY] = toPx(0, 0);
  const axisX = Math.min(Math.max(originX, 0), width);
  const axisY = Math.min(Math.max(originY, 0), height);

  const zoom = (factor: number, centerX?: number, centerY?: number) =>
    setView((current) => {
      const cx = centerX ?? (current.xMin + current.xMax) / 2;
      const cy = centerY ?? (current.yMin + current.yMax) / 2;
      return {
        xMin: cx + (current.xMin - cx) * factor,
        xMax: cx + (current.xMax - cx) * factor,
        yMin: cy + (current.yMin - cy) * factor,
        yMax: cy + (current.yMax - cy) * factor,
      };
    });

  const localPoint = (event: React.PointerEvent | WheelEvent) => {
    const rect = box.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  };

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      setView((current) => {
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        const cx =
          current.xMin + (px / rect.width) * (current.xMax - current.xMin);
        const cy =
          current.yMax - (py / rect.height) * (current.yMax - current.yMin);
        const factor = Math.exp(event.deltaY * 0.0015);
        return {
          xMin: cx + (current.xMin - cx) * factor,
          xMax: cx + (current.xMax - cx) * factor,
          yMin: cy + (current.yMin - cy) * factor,
          yMax: cy + (current.yMax - cy) * factor,
        };
      });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button")) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer already ended; panning still works without capture.
    }
    pointers.current.set(event.pointerId, localPoint(event));
    const list = [...pointers.current.values()];
    gesture.current = {
      view,
      distance:
        list.length === 2
          ? Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y)
          : undefined,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = localPoint(event);
    if (event.pointerType === "mouse" || pointers.current.size === 0) {
      setHoverX(toX(point.x));
    }
    const previous = pointers.current.get(event.pointerId);
    if (!previous || !gesture.current) return;
    pointers.current.set(event.pointerId, point);
    const list = [...pointers.current.values()];
    const start = gesture.current.view;

    if (list.length === 2 && gesture.current.distance) {
      const distance = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y);
      const factor = gesture.current.distance / Math.max(distance, 1);
      const cx =
        start.xMin +
        ((list[0].x + list[1].x) / 2 / width) * (start.xMax - start.xMin);
      const cy =
        start.yMax -
        ((list[0].y + list[1].y) / 2 / height) * (start.yMax - start.yMin);
      setView({
        xMin: cx + (start.xMin - cx) * factor,
        xMax: cx + (start.xMax - cx) * factor,
        yMin: cy + (start.yMin - cy) * factor,
        yMax: cy + (start.yMax - cy) * factor,
      });
      return;
    }

    const dx = ((point.x - previous.x) / width) * (view.xMax - view.xMin);
    const dy = ((point.y - previous.y) / height) * (view.yMax - view.yMin);
    setView((current) => ({
      xMin: current.xMin - dx,
      xMax: current.xMax - dx,
      yMin: current.yMin + dy,
      yMax: current.yMax + dy,
    }));
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    gesture.current = pointers.current.size
      ? { view, distance: undefined }
      : undefined;
    if (event.pointerType !== "mouse") setHoverX(undefined);
  };

  const shade = curves.find((curve) => curve.shade);
  const shadePath = (() => {
    if (!shade?.shade) return undefined;
    const [a, b] = shade.shade;
    const steps = 160;
    const parts: string[] = [];
    const [ax, ay] = toPx(a, 0);
    parts.push(`M${ax},${ay}`);
    for (let index = 0; index <= steps; index += 1) {
      const x = a + ((b - a) * index) / steps;
      const y = shade.fn(x);
      if (!Number.isFinite(y)) continue;
      const clamped = Math.max(view.yMin - 1e3, Math.min(view.yMax + 1e3, y));
      const [px, py] = toPx(x, clamped);
      parts.push(`L${px.toFixed(1)},${py.toFixed(1)}`);
    }
    const [bx, by] = toPx(b, 0);
    parts.push(`L${bx},${by}Z`);
    return parts.join("");
  })();

  const trace =
    hoverX === undefined
      ? []
      : curves
          .map((curve, index) => {
            let y: number;
            try {
              y = curve.fn(hoverX);
            } catch {
              y = NaN;
            }
            return { y, index };
          })
          .filter(
            ({ y }) => Number.isFinite(y) && y >= view.yMin && y <= view.yMax,
          );

  const summary = points
    .map((point) =>
      point.kind === "root"
        ? `x-intercept at ${round(point.x)}`
        : `y-intercept at ${round(point.y)}`,
    )
    .join(", ");

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={box}
        className="relative touch-none overflow-hidden rounded-2xl border bg-card"
        style={{ height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setHoverX(undefined);
        }}
      >
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${label}${summary ? `: ${summary}` : ""}`}
          className="block cursor-grab active:cursor-grabbing"
        >
          <g className="text-border" stroke="currentColor" strokeWidth={1}>
            {xTicks.map((x) => {
              const [px] = toPx(x, 0);
              return (
                <line
                  key={`gx${x}`}
                  x1={px}
                  x2={px}
                  y1={0}
                  y2={height}
                  opacity={0.6}
                />
              );
            })}
            {yTicks.map((y) => {
              const [, py] = toPx(0, y);
              return (
                <line
                  key={`gy${y}`}
                  x1={0}
                  x2={width}
                  y1={py}
                  y2={py}
                  opacity={0.6}
                />
              );
            })}
          </g>
          <g
            className="text-muted-foreground"
            stroke="currentColor"
            strokeWidth={1.4}
          >
            <line x1={0} x2={width} y1={axisY} y2={axisY} />
            <line x1={axisX} x2={axisX} y1={0} y2={height} />
          </g>
          <g className="fill-muted-foreground text-[10px] tabular-nums">
            {xTicks
              .filter((x) => x !== 0)
              .map((x) => {
                const [px] = toPx(x, 0);
                const below = Math.min(axisY + 13, height - 4);
                return (
                  <text key={`tx${x}`} x={px} y={below} textAnchor="middle">
                    {round(x)}
                  </text>
                );
              })}
            {yTicks
              .filter((y) => y !== 0)
              .map((y) => {
                const [, py] = toPx(0, y);
                const left = axisX > width - 40;
                return (
                  <text
                    key={`ty${y}`}
                    x={left ? axisX - 5 : Math.max(axisX + 5, 4)}
                    y={py + 3}
                    textAnchor={left ? "end" : "start"}
                  >
                    {round(y)}
                  </text>
                );
              })}
          </g>

          {shadePath && <path d={shadePath} fill={colors[0]} opacity={0.18} />}

          {paths.map((segments, index) =>
            segments.map((d, part) => (
              <path
                key={`c${index}-${part}`}
                d={d}
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )),
          )}

          {points.map((point) => {
            const [px, py] = toPx(point.x, point.y);
            return (
              <g key={`${point.kind}${point.x}`}>
                <circle
                  cx={px}
                  cy={py}
                  r={5}
                  className="fill-background"
                  stroke={colors[0]}
                  strokeWidth={2.5}
                />
              </g>
            );
          })}

          {hoverX !== undefined && trace.length > 0 && (
            <g>
              <line
                x1={toPx(hoverX, 0)[0]}
                x2={toPx(hoverX, 0)[0]}
                y1={0}
                y2={height}
                className="stroke-muted-foreground"
                strokeDasharray="3 4"
              />
              {trace.map(({ y, index }) => {
                const [px, py] = toPx(hoverX, y);
                return (
                  <circle
                    key={`t${index}`}
                    cx={px}
                    cy={py}
                    r={4.5}
                    fill={colors[index % colors.length]}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {hoverX !== undefined && trace.length > 0 && (
          <div className="pointer-events-none absolute top-2 left-2 rounded-lg border bg-background/90 px-2 py-1 font-mono text-[11px] shadow-sm backdrop-blur">
            x = {round(hoverX)}
            {trace.map(({ y, index }) => (
              <div key={index} style={{ color: colors[index % colors.length] }}>
                y = {round(y)}
              </div>
            ))}
          </div>
        )}

        <div className="absolute right-2 bottom-2 flex flex-col gap-1">
          {[
            {
              name: "Zoom in",
              icon: <Plus className="size-4" />,
              run: () => zoom(0.7),
            },
            {
              name: "Zoom out",
              icon: <Minus className="size-4" />,
              run: () => zoom(1 / 0.7),
            },
            {
              name: "Reset view",
              icon: <Maximize2 className="size-3.5" />,
              run: () => setView(initialView),
            },
          ].map((control) => (
            <button
              key={control.name}
              type="button"
              aria-label={control.name}
              onClick={control.run}
              className="grid size-8 place-items-center rounded-lg border bg-background/90 shadow-sm backdrop-blur hover:bg-muted"
            >
              {control.icon}
            </button>
          ))}
        </div>
      </div>

      {points.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {points.map((point) => (
            <span
              key={`p${point.kind}${point.x}`}
              className="rounded-full border bg-muted/50 px-2.5 py-1 font-medium tabular-nums"
            >
              {point.kind === "root" ? "x-intercept" : "y-intercept"} (
              {round(point.x)}, {round(point.y)})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
