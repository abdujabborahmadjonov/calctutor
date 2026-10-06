import { expect, test } from "@playwright/test";

test("solving the integration-by-parts golden problem shows the strategy and the first step", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("status").getByText("Mock mode.")).toBeVisible();

  await page
    .getByRole("textbox", { name: "Problem", exact: true })
    .fill(String.raw`\int x e^{x}\,dx`);
  await page.getByRole("button", { name: "Solve problem" }).click();

  await expect(page.getByText("Strategy", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Integration by parts" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Choose the parts/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Next step" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("an algebra problem is solved, graphed and verified, and can be solved another way", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Try Algebra/ }).click();
  await expect(page.getByRole("radio", { name: /Algebra/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("button", { name: "Solve problem" }).click();

  await expect(page.getByText("Quadratic equation")).toBeVisible();
  await page.getByRole("button", { name: "Show all" }).click();
  await expect(
    page.getByRole("img", { name: /x-intercept at 2.*x-intercept at 3/ }),
  ).toBeVisible();
  await expect(page.getByText(/Verified with SymPy/)).toBeVisible({
    timeout: 120_000,
  });

  const request = page.waitForRequest("**/api/solve");
  await page.getByRole("button", { name: "Solve another way" }).click();
  expect((await request).postDataJSON()).toMatchObject({
    subject: "algebra",
    avoidMethod: "Factoring",
    courseId: "open",
  });
  await expect(page.getByText("Quadratic equation")).toBeVisible();

  expect(errors).toEqual([]);
});

test("a problem with no saved example is solved by the built-in math engine", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Problem", exact: true })
    .fill("x^3-6x^2+11x-6=0");
  await page.getByRole("button", { name: "Solve problem" }).click();

  await expect(
    page.getByText("Solved offline by the built-in math engine (no AI)"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show all" }).click();
  await expect(
    page.getByRole("heading", { name: "Final answer" }),
  ).toBeVisible();
  await expect(page.getByText(/Verified with SymPy/)).toBeVisible({
    timeout: 120_000,
  });

  expect(errors).toEqual([]);
});
