"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eraser, PenLine, Redo2, Trash2, Undo2, X } from "lucide-react";

import {
  commit,
  emptyHistory,
  eraseAt,
  inkBounds,
  lineWidth,
  type PadHistory,
  type Point,
  redo,
  type Stroke,
  undo,
} from "@/lib/handwriting/strokes";
import { cn } from "@/lib/utils";

import { Button } from "./ui/button";

type HandwritingPadProps = {
  onCancel: () => void;
  onDone: (image: File) => void;
};

type Tool = "pen" | "eraser";

const PEN_SIZE = 3;
const ERASER_RADIUS = 14;
const INK = "#111827";

function drawSegment(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  size: number,
  isPen: boolean,
) {
  context.strokeStyle = INK;
  context.fillStyle = INK;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = lineWidth(size, to.pressure, isPen);
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
}

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  const [first, ...rest] = stroke.points;
  if (!first) return;
  const isPen = stroke.pen;

  if (rest.length === 0) {
    context.fillStyle = INK;
    context.beginPath();
    context.arc(
      first.x,
      first.y,
      lineWidth(stroke.size, first.pressure, isPen) / 2,
      0,
      Math.PI * 2,
    );
    context.fill();
    return;
  }

  let previous = first;
  for (const point of rest) {
    drawSegment(context, previous, point, stroke.size, isPen);
    previous = point;
  }
}

// Renders the ink on white, cropped to the writing, for transcription.
async function exportInk(strokes: Stroke[]): Promise<File | undefined> {
  const bounds = inkBounds(strokes, 24);
  if (!bounds) return undefined;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(bounds.width * scale);
  canvas.height = Math.ceil(bounds.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return undefined;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.scale(scale, scale);
  context.translate(-bounds.x, -bounds.y);
  for (const stroke of strokes) drawStroke(context, stroke);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  return blob
    ? new File([blob], "handwriting.png", { type: "image/png" })
    : undefined;
}

export function HandwritingPad({ onCancel, onDone }: HandwritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<PadHistory>(emptyHistory);
  const [tool, setTool] = useState<Tool>("pen");
  const [penSeen, setPenSeen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const live = useRef<{ pointerId: number; stroke: Stroke; erased: Stroke[] }>(
    undefined,
  );
  const strokes = history.present;

  const context = useCallback(() => canvasRef.current?.getContext("2d"), []);

  const redraw = useCallback(
    (list: Stroke[]) => {
      const canvas = canvasRef.current;
      const ctx = context();
      if (!canvas || !ctx) return;
      const ratio = window.devicePixelRatio || 1;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const stroke of list) drawStroke(ctx, stroke);
    },
    [context],
  );

  // Latest strokes for the resize handler, which must not re-subscribe on
  // every stroke.
  const strokesRef = useRef<Stroke[]>([]);

  // Match the canvas to its on-screen size at the device pixel ratio, and
  // redraw when it changes (rotating an iPad, for example).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      const nextWidth = Math.round(width * ratio);
      const nextHeight = Math.round(height * ratio);
      if (canvas.width === nextWidth && canvas.height === nextHeight) return;
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      redraw(strokesRef.current);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  // Undo, redo, clear and erasing replace the stroke list: draw it again.
  useEffect(() => {
    strokesRef.current = history.present;
    redraw(history.present);
  }, [history.present, redraw]);

  // A real modal: the page behind is inert (no focus, no screen reader, no
  // taps) and cannot scroll under the pencil.
  useEffect(() => {
    const dialog = dialogRef.current;
    const others = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && !element.contains(dialog),
    );
    const overflow = document.body.style.overflow;
    for (const element of others) element.inert = true;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>("button")?.focus();

    return () => {
      for (const element of others) element.inert = false;
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        setHistory((current) =>
          event.shiftKey ? redo(current) : undo(current),
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const pointFrom = (event: PointerEvent | React.PointerEvent): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
      pressure: event.pointerType === "pen" ? event.pressure : 0.5,
    };
  };

  // Palm rejection: once the pencil has been used, finger and palm touches
  // are ignored for the rest of the session.
  const accepts = (event: React.PointerEvent) =>
    !(penSeen && event.pointerType === "touch");

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "pen" && !penSeen) setPenSeen(true);
    if (!accepts(event) || live.current) return;
    event.preventDefault();
    try {
      // Keeps the stroke going if the pencil slides past the canvas edge.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is no longer active; the stroke still works without it.
    }

    const point = pointFrom(event);
    live.current = {
      pointerId: event.pointerId,
      stroke: {
        points: [point],
        size: PEN_SIZE,
        pen: event.pointerType === "pen",
      },
      erased: strokes,
    };

    if (tool === "eraser") {
      live.current.erased = eraseAt(strokes, point, ERASER_RADIUS);
      redraw(live.current.erased);
    } else {
      const ctx = context();
      if (ctx) drawStroke(ctx, live.current.stroke);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const current = live.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();

    // Coalesced events give the full-rate Apple Pencil samples.
    const native = event.nativeEvent;
    const samples =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [native];

    if (tool === "eraser") {
      let remaining = current.erased;
      for (const sample of samples.length ? samples : [native]) {
        remaining = eraseAt(remaining, pointFrom(sample), ERASER_RADIUS);
      }
      if (remaining.length !== current.erased.length) {
        current.erased = remaining;
        redraw(remaining);
      }
      return;
    }

    const ctx = context();
    const isPen = event.pointerType === "pen";
    for (const sample of samples.length ? samples : [native]) {
      const point = pointFrom(sample);
      const previous = current.stroke.points.at(-1);
      current.stroke.points.push(point);
      if (ctx && previous) drawSegment(ctx, previous, point, PEN_SIZE, isPen);
    }
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const current = live.current;
    if (!current || current.pointerId !== event.pointerId) return;
    live.current = undefined;

    if (tool === "eraser") {
      if (current.erased.length !== strokes.length) {
        setHistory((previous) => commit(previous, current.erased));
      }
      return;
    }
    setHistory((previous) =>
      commit(previous, [...previous.present, current.stroke]),
    );
  };

  const readWriting = async () => {
    setExporting(true);
    try {
      const image = await exportInk(strokes);
      if (image) onDone(image);
    } finally {
      setExporting(false);
    }
  };

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Handwriting pad"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close the handwriting pad"
          onClick={onCancel}
        >
          <X />
        </Button>
        <div className="flex gap-1" role="group" aria-label="Tool">
          <Button
            type="button"
            variant={tool === "pen" ? "default" : "outline"}
            size="sm"
            aria-pressed={tool === "pen"}
            onClick={() => setTool("pen")}
          >
            <PenLine />
            Pen
          </Button>
          <Button
            type="button"
            variant={tool === "eraser" ? "default" : "outline"}
            size="sm"
            aria-pressed={tool === "eraser"}
            onClick={() => setTool("eraser")}
          >
            <Eraser />
            Eraser
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Undo"
            disabled={history.past.length === 0}
            onClick={() => setHistory(undo)}
          >
            <Undo2 />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Redo"
            disabled={history.future.length === 0}
            onClick={() => setHistory(redo)}
          >
            <Redo2 />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Clear the page"
            disabled={strokes.length === 0}
            onClick={() => setHistory((current) => commit(current, []))}
          >
            <Trash2 />
          </Button>
        </div>
        <Button
          type="button"
          className="ml-auto"
          disabled={strokes.length === 0 || exporting}
          onClick={readWriting}
        >
          {exporting ? "Preparing…" : "Read my writing"}
        </Button>
      </div>

      <p className="px-4 py-2 text-xs text-muted-foreground">
        Write the problem at the top. To have your work checked, write your
        working underneath it.{" "}
        {penSeen
          ? "Apple Pencil detected: finger and palm touches are ignored."
          : "Apple Pencil, a finger or a mouse all work."}
      </p>

      <canvas
        ref={canvasRef}
        aria-label="Writing area"
        className={cn(
          "w-full flex-1 touch-none bg-white select-none",
          "[-webkit-touch-callout:none] [-webkit-user-select:none]",
          "bg-[linear-gradient(transparent_47px,#dbe4f0_48px)] bg-[length:100%_48px]",
          tool === "eraser" ? "cursor-cell" : "cursor-crosshair",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
      />
    </div>,
    document.body,
  );
}
