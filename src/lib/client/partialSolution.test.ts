import { describe, expect, it } from "vitest";

import fixture from "@/fixtures/solutions/integration-by-parts.json";

import { readPartialSolution } from "./partialSolution";

const text = JSON.stringify(fixture);
const cut = (marker: string, extra = 0) =>
  text.slice(0, text.indexOf(marker) + extra);

describe("readPartialSolution", () => {
  it("shows nothing before the strategy is complete", () => {
    const partial = readPartialSolution(cut('"alternatives"'));

    expect(partial.strategy).toBeUndefined();
    expect(partial.steps).toEqual([]);
  });

  it("shows the strategy once the steps have started", () => {
    const partial = readPartialSolution(cut('"steps"', 12));

    expect(partial.status).toBe("solved");
    expect(partial.strategy).toEqual(fixture.strategy);
    expect(partial.steps).toEqual([]);
  });

  it("holds back the step that is still being written", () => {
    const secondTitle = `"title":${JSON.stringify(fixture.steps[1].title)}`;
    const partial = readPartialSolution(cut(secondTitle, 20));

    expect(partial.steps).toEqual([fixture.steps[0]]);
  });

  it("shows every step once the steps array has closed", () => {
    const partial = readPartialSolution(cut('"final_answer"', 18));

    expect(partial.steps).toEqual(fixture.steps);
  });

  it("tolerates empty and malformed text", () => {
    expect(readPartialSolution("")).toEqual({ steps: [] });
    expect(readPartialSolution("not json")).toEqual({ steps: [] });
  });
});
