import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/history", () => ({
  getSetting: vi.fn().mockResolvedValue(undefined),
  saveHistoryEntry: vi.fn().mockResolvedValue(undefined),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

import Home from "./page";

describe("Home", () => {
  it("renders the text solver", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: "Work through calculus, one step at a time.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Calculus problem" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Solve problem" }),
    ).toBeDisabled();
  });
});
