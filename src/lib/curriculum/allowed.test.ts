import { describe, expect, it } from "vitest";

import {
  buildCourseBlock,
  getAllowedCurriculum,
  getDefaultCoveredUpTo,
} from "./allowed";

describe("curriculum boundaries", () => {
  it("allows only topics through the selected coverage point", () => {
    const result = getAllowedCurriculum("ualberta-math-144", "limits");

    expect(result.allowedTopicIds).toEqual(["precalc-review", "limits"]);
    expect(result.allowedMethods).toContain("squeeze theorem");
    expect(result.allowedMethods).not.toContain("L'Hôpital's rule");
    expect(result.notYetCoveredIds).toContain("lhopital");
  });

  it("builds a course block with methods and notation", () => {
    const block = buildCourseBlock(
      "ualberta-math-144",
      "implicit-differentiation",
    );

    expect(block).toContain("<course>");
    expect(block).toContain("allowed_topics:");
    expect(block).toContain("implicit differentiation");
    expect(block).toContain(String.raw`inverse trig as \arcsin`);
    expect(block).toContain("</course>");
  });

  it("defaults each course to its last topic", () => {
    expect(getDefaultCoveredUpTo("ualberta-math-146")).toBe("parametric-polar");
  });

  it("rejects a coverage point outside the selected course", () => {
    expect(() =>
      getAllowedCurriculum("alberta-math-31", "complex-numbers"),
    ).toThrow("is not part of");
  });
});
