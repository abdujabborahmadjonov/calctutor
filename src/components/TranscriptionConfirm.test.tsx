import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import transcription from "@/fixtures/transcriptions/problem-set-photo.json";
import { TranscriptionSchema } from "@/lib/ai/schemas";

import { TranscriptionConfirm } from "./TranscriptionConfirm";

const parsed = TranscriptionSchema.parse(transcription);

describe("TranscriptionConfirm", () => {
  it("lets the student pick a problem, edit it, and solve it", () => {
    const onSolve = vi.fn();
    render(
      <TranscriptionConfirm
        transcription={parsed}
        isMock
        onSolve={onSolve}
        onRetake={vi.fn()}
      />,
    );

    expect(
      screen.getByText("This photo has 2 problems. Pick one."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("radio")[1]);

    expect(
      screen.getByText(parsed.problems[1].ambiguities[0]),
    ).toBeInTheDocument();
    expect(screen.getByText("Check this reading")).toBeInTheDocument();

    const editor = screen.getByLabelText("Edit the LaTeX if needed");
    expect(editor).toHaveValue(parsed.problems[1].latex);
    fireEvent.change(editor, {
      target: { value: String.raw`\lim_{x \to 0} x` },
    });
    fireEvent.click(screen.getByRole("button", { name: "Solve this" }));

    expect(onSolve).toHaveBeenCalledWith(String.raw`\lim_{x \to 0} x`);
  });

  it("explains when no problem was found", () => {
    render(
      <TranscriptionConfirm
        transcription={{
          problems: [],
          image_quality_note: "The photo is blurry.",
        }}
        isMock={false}
        onSolve={vi.fn()}
        onRetake={vi.fn()}
      />,
    );

    expect(screen.getByText("The photo is blurry.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Solve this" }),
    ).not.toBeInTheDocument();
  });
});
