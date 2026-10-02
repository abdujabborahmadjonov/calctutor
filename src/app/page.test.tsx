import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("identifies CalcTutor and links to service health", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: "Calculus explained one step at a time.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Check service health" }),
    ).toHaveAttribute("href", "/api/health");
  });
});
