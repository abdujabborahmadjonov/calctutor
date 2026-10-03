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
    .getByRole("textbox", { name: "Calculus problem" })
    .fill(String.raw`\int x e^{x}\,dx`);
  await page.getByRole("button", { name: "Solve problem" }).click();

  await expect(page.getByText("Strategy", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Integration by parts", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Choose the parts")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next step" })).toBeVisible();

  expect(errors).toEqual([]);
});
