import { describe, expect, it } from "vitest";

import { topics } from "./alberta";
import { topicExplainers } from "./explainers";

describe("topic explainers", () => {
  it("covers every topic in the curriculum map and nothing else", () => {
    expect(Object.keys(topicExplainers).sort()).toEqual(
      topics.map((topic) => topic.id).sort(),
    );
  });
});
