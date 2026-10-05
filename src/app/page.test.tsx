import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/history", () => ({
  getSetting: vi.fn().mockResolvedValue(undefined),
  saveHistoryEntry: vi.fn().mockResolvedValue(undefined),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

import Home from "./page";

describe("Home", () => {
  it("renders the solver with every input mode and subject", () => {
    const { container } = render(<Home />);

    expect(screen.getByText("any problem.")).toBeInTheDocument();
    expect(
      container.querySelector('textarea[aria-label="Problem"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("Solve problem").closest("button")).toBeDisabled();
    for (const tab of ["Type", "Scan", "Write"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: /Physics/ })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Math keyboard" }),
    ).toBeInTheDocument();
  });

  it("shows an instant answer for arithmetic and fills examples", () => {
    render(<Home />);
    const box = screen.getByRole("textbox", { name: "Problem" });

    fireEvent.change(box, { target: { value: "3/4+5/6" } });
    expect(screen.getByLabelText("Instant answer")).toHaveTextContent("19");
    fireEvent.change(box, { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: /Try Algebra/ }));
    expect(screen.getByRole("textbox", { name: "Problem" })).toHaveValue(
      "x^{2}-5x+6=0",
    );
    expect(screen.getByRole("radio", { name: /Algebra/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("inserts math keys at the caret", async () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Insert fraction" }));
    // The caret moves inside the numerator on the next frame.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    fireEvent.click(screen.getByRole("button", { name: "Insert 1" }));
    expect(screen.getByRole("textbox", { name: "Problem" })).toHaveValue(
      String.raw`\frac{1}{}`,
    );
  });
});
