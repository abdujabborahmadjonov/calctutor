import { describe, expect, it } from "vitest";

import {
  commit,
  emptyHistory,
  eraseAt,
  inkBounds,
  lineWidth,
  redo,
  type Stroke,
  undo,
} from "./strokes";

const stroke = (...points: Array<[number, number]>): Stroke => ({
  size: 3,
  pen: false,
  points: points.map(([x, y]) => ({ x, y, pressure: 0.5 })),
});

describe("lineWidth", () => {
  it("varies with pressure for the pen only", () => {
    expect(lineWidth(4, 1, true)).toBeGreaterThan(lineWidth(4, 0.2, true));
    expect(lineWidth(4, 0.5, false)).toBe(4);
    expect(lineWidth(4, 0, true)).toBe(4);
  });
});

describe("history", () => {
  it("undoes and redoes commits, and a new commit clears redo", () => {
    const a = [stroke([0, 0], [10, 0])];
    const b = [...a, stroke([0, 10], [10, 10])];
    let history = commit(commit(emptyHistory(), a), b);

    history = undo(history);
    expect(history.present).toEqual(a);
    history = redo(history);
    expect(history.present).toEqual(b);

    history = commit(undo(history), []);
    expect(history.future).toEqual([]);
    expect(undo(emptyHistory())).toEqual(emptyHistory());
    expect(redo(emptyHistory())).toEqual(emptyHistory());
  });
});

describe("eraseAt", () => {
  it("removes only strokes that pass near the eraser", () => {
    const horizontal = stroke([0, 0], [100, 0]);
    const far = stroke([0, 50], [100, 50]);
    const dot = stroke([200, 200]);

    expect(
      eraseAt([horizontal, far, dot], { x: 50, y: 4, pressure: 0 }, 5),
    ).toEqual([far, dot]);
    expect(eraseAt([dot], { x: 202, y: 200, pressure: 0 }, 5)).toEqual([]);
  });
});

describe("inkBounds", () => {
  it("covers every point plus stroke size and padding", () => {
    expect(inkBounds([stroke([10, 20], [110, 60])], 5)).toEqual({
      x: 2,
      y: 12,
      width: 116,
      height: 56,
    });
    expect(inkBounds([], 5)).toBeUndefined();
  });
});
