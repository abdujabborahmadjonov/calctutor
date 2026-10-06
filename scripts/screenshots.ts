// Screenshots every screen and state at phone and desktop width for review.
// Start the app in mock mode first, then run:
//   MOCK_AI=true npm run build && MOCK_AI=true npm run start -- -p 3000
//   npm run screenshots              # BASE_URL defaults to http://127.0.0.1:3000
// Fails on any browser console error, except in the scenarios that exercise
// error states on purpose.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Page } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "screenshots");
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const photo = path.join(root, "scripts/fixtures/katex-x2-lnx.png");

const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "1280", width: 1280, height: 800 },
];

type Scenario = {
  name: string;
  expectErrors?: boolean;
  run: (page: Page) => Promise<void>;
};

const problemBox = (page: Page) =>
  page.getByRole("textbox", { name: "Problem", exact: true });

async function solve(page: Page, latex: string) {
  await page.goto("/");
  await problemBox(page).fill(latex);
  await page.getByRole("button", { name: "Solve problem" }).click();
}

const failWith =
  (status: number, code: string, message: string) => async (page: Page) => {
    await page.route("**/api/solve", (route) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: status === 429 ? { "Retry-After": "1200" } : {},
        body: JSON.stringify({ error: { code, message } }),
      }),
    );
    await solve(page, String.raw`\int x e^{x}\,dx`);
    await page.getByRole("button", { name: "Try again" }).waitFor();
  };

const scenarios: Scenario[] = [
  { name: "home-empty", run: async (page) => void (await page.goto("/")) },
  {
    name: "solving-streaming",
    run: async (page) => {
      await solve(page, String.raw`\int x e^{x}\,dx`);
      await page
        .getByText(/Working through step|Choosing a method/)
        .first()
        .waitFor();
    },
  },
  {
    name: "solution-first-step",
    run: async (page) => {
      await solve(page, String.raw`\int x e^{x}\,dx`);
      await page.getByRole("button", { name: "Next step" }).waitFor();
    },
  },
  {
    name: "solution-all-steps",
    run: async (page) => {
      await solve(page, String.raw`\int x e^{x}\,dx`);
      await page.getByRole("button", { name: "Show all" }).click();
      await page.getByText(/Verified with SymPy|Could not verify/).waitFor({
        timeout: 120_000,
      });
    },
  },
  {
    name: "explain-step",
    run: async (page) => {
      await solve(page, String.raw`\int x e^{x}\,dx`);
      await page
        .getByRole("button", { name: "Explain this step more" })
        .click();
      await page.getByText("Mock mode: this is a fixture").waitFor();
    },
  },
  {
    name: "practice-graded",
    run: async (page) => {
      await solve(page, String.raw`\int x e^{x}\,dx`);
      await page.getByRole("button", { name: "Show all" }).click();
      await page.getByRole("button", { name: "Practice similar" }).click();
      await page
        .getByLabel("Your answer")
        .first()
        .fill(String.raw`x\sin x+\cos x+C`);
      await page
        .getByRole("button", { name: "Check", exact: true })
        .first()
        .click();
      await page
        .getByText(/Correct\. SymPy confirmed/)
        .waitFor({ timeout: 120_000 });
    },
  },
  {
    name: "learn-mode",
    run: async (page) => {
      await page.goto("/");
      await page.getByRole("switch", { name: "Learn mode" }).click();
      await problemBox(page).fill(String.raw`\int x e^{x}\,dx`);
      await page.getByRole("button", { name: "Solve problem" }).click();
      await page.getByRole("button", { name: "Reveal hint 1" }).click();
    },
  },
  {
    name: "needs-clarification",
    run: async (page) => {
      await solve(page, String.raw`\int x^{2} dx from 0 to (missing bound)`);
      await page.getByText("I need one detail").waitFor();
    },
  },
  {
    name: "out-of-scope",
    run: async (page) => {
      await solve(page, "Pick my lottery numbers");
      await page.getByText("This is outside CalcTutor's scope").waitFor();
    },
  },
  {
    name: "photo-confirm",
    run: async (page) => {
      await page.goto("/");
      await page.getByRole("tab", { name: "Scan" }).click();
      await page.locator('input[type="file"]').nth(1).setInputFiles(photo);
      await page.getByText("Is this your problem?").waitFor();
    },
  },
  {
    name: "handwriting-pad",
    run: async (page) => {
      await page.goto("/");
      await page.getByRole("tab", { name: "Write" }).click();
      await page
        .getByRole("button", { name: "Write with Apple Pencil" })
        .click();
      const box = await page.getByLabel("Writing area").boundingBox();
      if (!box) throw new Error("the writing area is not visible");
      await page.mouse.move(box.x + 60, box.y + 60);
      await page.mouse.down();
      await page.mouse.move(box.x + 160, box.y + 120, { steps: 10 });
      await page.mouse.up();
    },
  },
  {
    name: "check-work",
    run: async (page) => {
      await page.goto("/");
      await problemBox(page).fill(String.raw`\int x e^{x}\,dx`);
      await page.getByRole("tab", { name: /Check/ }).click();
      await page
        .getByRole("textbox", { name: "Your work" })
        .fill(String.raw`\int xe^x dx = xe^x + \int e^x dx`);
      await page.getByRole("button", { name: "Check my work" }).click();
      await page.getByText("Found the first mistake").waitFor();
    },
  },
  {
    name: "error-429",
    expectErrors: true,
    run: failWith(
      429,
      "rate_limited",
      "You've hit the hourly limit; try again in 20 minutes.",
    ),
  },
  {
    name: "error-502",
    expectErrors: true,
    run: failWith(502, "unexpected_error", "Something went wrong on our side."),
  },
  {
    name: "error-503",
    expectErrors: true,
    run: failWith(
      503,
      "budget_exhausted",
      "Today's budget is used up; back tomorrow.",
    ),
  },
  {
    name: "history",
    run: async (page) => {
      await solve(page, String.raw`\int x e^{x}\,dx`);
      await page.getByRole("button", { name: "Next step" }).waitFor();
      await page.goto("/history");
      await page.getByRole("link", { name: "Reopen" }).first().waitFor();
    },
  },
  {
    name: "instant-answer",
    run: async (page) => {
      await page.goto("/");
      await problemBox(page).fill("3/4 + 5/6");
      await page.getByLabel("Instant answer").waitFor();
    },
  },
  {
    name: "algebra-graph",
    run: async (page) => {
      await page.goto("/");
      await page.getByRole("button", { name: /Try Algebra/ }).click();
      await page.getByRole("button", { name: "Solve problem" }).click();
      await page.getByRole("button", { name: "Show all" }).click();
      await page.getByText(/Verified with SymPy|Could not verify/).waitFor({
        timeout: 120_000,
      });
    },
  },
  {
    name: "linear-algebra",
    run: async (page) => {
      await page.goto("/");
      await page.getByRole("button", { name: /Try Linear algebra/ }).click();
      await page.getByRole("button", { name: "Solve problem" }).click();
      await page.getByRole("button", { name: "Show all" }).click();
      await page.getByRole("heading", { name: "Final answer" }).waitFor();
    },
  },
  {
    name: "physics",
    run: async (page) => {
      await page.goto("/");
      await page.getByRole("button", { name: /Try Physics/ }).click();
      await page.getByRole("button", { name: "Solve problem" }).click();
      await page.getByRole("button", { name: "Show all" }).click();
      await page.getByRole("heading", { name: "Final answer" }).waitFor();
    },
  },
  {
    name: "graph-page",
    run: async (page) => {
      await page.goto("/graph");
      await page
        .getByRole("img", { name: /Graph of your functions/ })
        .waitFor();
    },
  },
  {
    name: "offline-engine",
    run: async (page) => {
      await solve(page, String.raw`\frac{d}{dx}\left(\frac{x^2+1}{x-1}\right)`);
      await page.getByRole("button", { name: "Show all" }).click();
      await page.getByText(/Verified with SymPy|Could not verify/).waitFor({
        timeout: 120_000,
      });
    },
  },
  { name: "about", run: async (page) => void (await page.goto("/about")) },
  { name: "topics", run: async (page) => void (await page.goto("/topics")) },
  {
    name: "topic-page",
    run: async (page) => {
      await page.goto("/topics/integration-by-parts");
      await page
        .getByRole("button", { name: "Give me three practice problems" })
        .click();
      await page.getByText("Practice problems", { exact: true }).waitFor();
    },
  },
  {
    name: "dark-solution",
    run: async (page) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await solve(page, String.raw`\int x e^{x}\,dx`);
      await page.getByRole("button", { name: "Show all" }).click();
      await page.getByText(/Verified with SymPy|Could not verify/).waitFor({
        timeout: 120_000,
      });
    },
  },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const failures: string[] = [];

try {
  for (const viewport of viewports) {
    for (const scenario of scenarios) {
      const context = await browser.newContext({
        baseURL: baseUrl,
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      const file = `${scenario.name}-${viewport.name}.png`;
      try {
        await scenario.run(page);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        if (overflow > 1) {
          failures.push(
            `${file}: page is ${overflow}px wider than the viewport`,
          );
        }
        await page.screenshot({
          path: path.join(outDir, file),
          fullPage: true,
        });
        if (errors.length > 0 && !scenario.expectErrors) {
          failures.push(`${file}: console errors: ${errors.join(" | ")}`);
        }
      } catch (error) {
        failures.push(
          `${file}: ${error instanceof Error ? error.message : error}`,
        );
      } finally {
        await context.close();
      }
      console.log(
        `${failures.some((item) => item.startsWith(file)) ? "FAIL" : "ok  "} ${file}`,
      );
    }
  }
} finally {
  await browser.close();
}

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(
  `RESULT screenshots=${viewports.length * scenarios.length} failures=${failures.length}`,
);
if (failures.length > 0) process.exitCode = 1;
