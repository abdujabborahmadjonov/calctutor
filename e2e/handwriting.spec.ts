import { devices, expect, type Page, test } from "@playwright/test";

const ipad = devices["iPad Pro 11 landscape"];
test.use({
  viewport: ipad.viewport,
  userAgent: ipad.userAgent,
  deviceScaleFactor: ipad.deviceScaleFactor,
  isMobile: ipad.isMobile,
  hasTouch: ipad.hasTouch,
});

type Sample = [x: number, y: number, pressure: number];

// Playwright cannot drive a real Apple Pencil, so pen strokes are dispatched
// as pointer events with pointerType "pen" and varying pressure.
async function stroke(
  page: Page,
  points: Sample[],
  pointerType = "pen",
  pointerId = 1,
) {
  await page.evaluate(
    ({ points, pointerType, pointerId }) => {
      const canvas = document.querySelector(
        'canvas[aria-label="Writing area"]',
      );
      const fire = (type: string, [x, y, pressure]: Sample) =>
        canvas?.dispatchEvent(
          new PointerEvent(type, {
            pointerId,
            pointerType,
            pressure,
            clientX: x,
            clientY: y,
            bubbles: true,
            isPrimary: true,
          }),
        );
      fire("pointerdown", points[0]);
      for (const point of points.slice(1)) fire("pointermove", point);
      fire("pointerup", points[points.length - 1]);
    },
    { points, pointerType, pointerId },
  );
}

const line = (ax: number, ay: number, bx: number, by: number): Sample[] =>
  Array.from({ length: 12 }, (_, index) => {
    const t = index / 11;
    return [
      ax + (bx - ax) * t,
      ay + (by - ay) * t,
      0.2 + 0.7 * Math.sin(Math.PI * t),
    ];
  });

test("writing with Apple Pencil goes through transcription to check my work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Write with Apple Pencil" }).click();
  const pad = page.getByRole("dialog", { name: "Handwriting pad" });
  await expect(pad).toBeVisible();

  const box = await page.getByLabel("Writing area").boundingBox();
  if (!box) throw new Error("the writing area is not visible");
  const x = box.x + 80;
  const y = box.y + 100;

  const readButton = pad.getByRole("button", { name: "Read my writing" });
  await expect(readButton).toBeDisabled();

  await stroke(page, line(x, y - 40, x - 12, y + 40));
  await stroke(page, line(x + 30, y - 10, x + 55, y + 15));
  await expect(pad.getByText("Apple Pencil detected")).toBeVisible();

  // A palm resting on the screen after the pencil is used draws nothing:
  // the only stroke on the page can still be undone in two steps.
  await stroke(
    page,
    line(box.x + 300, box.y + 300, box.x + 600, box.y + 400),
    "touch",
    7,
  );
  const undo = pad.getByRole("button", { name: "Undo" });
  await undo.click();
  await undo.click();
  await expect(readButton).toBeDisabled();
  await pad.getByRole("button", { name: "Redo" }).click();
  await expect(readButton).toBeEnabled();

  await readButton.click();
  await expect(page.getByText("Is this your problem?")).toBeVisible();
  await page.getByRole("radio").nth(1).check();
  await page.getByRole("button", { name: "Check my work" }).first().click();
  await expect(page.getByText("Found the first mistake")).toBeVisible();

  expect(errors).toEqual([]);
});
