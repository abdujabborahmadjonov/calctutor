// Pure stroke logic for the handwriting pad: widths, erasing, undo/redo and
// the bounds used to crop the exported image. Kept free of the DOM so it can
// be unit-tested.

export type Point = { x: number; y: number; pressure: number };
// `pen` marks Apple Pencil (or stylus) strokes, whose width follows pressure.
export type Stroke = { points: Point[]; size: number; pen: boolean };

export type PadHistory = {
  past: Stroke[][];
  present: Stroke[];
  future: Stroke[][];
};

export const emptyHistory = (): PadHistory => ({
  past: [],
  present: [],
  future: [],
});

// Apple Pencil reports pressure from 0 to 1. Mice report 0.5 while a button is
// down and some touch screens report 0, so only pen input varies the width.
export function lineWidth(size: number, pressure: number, isPen: boolean) {
  if (!isPen || pressure <= 0) return size;
  return size * (0.45 + Math.min(1, pressure) * 1.1);
}

export function commit(history: PadHistory, next: Stroke[]): PadHistory {
  return {
    past: [...history.past, history.present],
    present: next,
    future: [],
  };
}

export function undo(history: PadHistory): PadHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo(history: PadHistory): PadHistory {
  const [next, ...rest] = history.future;
  if (!next) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
  };
}

function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared),
        );
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Stroke eraser: removes every stroke that passes within `radius` of `point`.
export function eraseAt(strokes: Stroke[], point: Point, radius: number) {
  return strokes.filter((stroke) => {
    const { points } = stroke;
    if (points.length === 1) {
      return Math.hypot(points[0].x - point.x, points[0].y - point.y) > radius;
    }
    for (let index = 1; index < points.length; index += 1) {
      if (
        distanceToSegment(point, points[index - 1], points[index]) <= radius
      ) {
        return false;
      }
    }
    return true;
  });
}

export type Bounds = { x: number; y: number; width: number; height: number };

// The area that contains ink, plus padding, so the exported image is cropped
// to the writing instead of the whole screen.
export function inkBounds(
  strokes: Stroke[],
  padding: number,
): Bounds | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x - stroke.size);
      minY = Math.min(minY, point.y - stroke.size);
      maxX = Math.max(maxX, point.x + stroke.size);
      maxY = Math.max(maxY, point.y + stroke.size);
    }
  }

  if (!Number.isFinite(minX)) return undefined;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}
