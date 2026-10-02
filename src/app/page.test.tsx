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
    const { container } = render(<Home />);

    expect(
      screen.getByText("Work through calculus, one step at a time."),
    ).toBeInTheDocument();
    expect(
      container.querySelector('textarea[aria-label="Calculus problem"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("Solve problem").closest("button")).toBeDisabled();
  });
});
