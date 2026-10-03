// Renders the transcription golden problem with KaTeX in Chromium and saves
// two test images for scripts/smoke.ts: an upright PNG, and a copy rotated
// 5 degrees and JPEG-compressed, like a slightly tilted phone photo.
// Run: npx tsx scripts/make-test-images.ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "scripts", "fixtures");
const latex = String.raw`\int x^{2}\ln x\,dx`;

const katexJs = await readFile(
  path.join(root, "node_modules/katex/dist/katex.min.js"),
  "utf8",
);
const katexDir = path.join(root, "node_modules/katex/dist");
const rawCss = await readFile(path.join(katexDir, "katex.min.css"), "utf8");

// Inline KaTeX's woff2 fonts so the integral sign and italics render properly.
let katexCss = rawCss;
for (const [match, file] of rawCss.matchAll(/url\((fonts\/[^)]+\.woff2)\)/g)) {
  const font = await readFile(path.join(katexDir, file));
  katexCss = katexCss.replace(
    match,
    `url(data:font/woff2;base64,${font.toString("base64")})`,
  );
}

const page = (rotation: number) => `<!doctype html><html><head>
<style>${katexCss}
body { margin: 0; background: #fbfaf6; }
#card { width: 1200px; height: 700px; display: grid; place-items: center;
  transform: rotate(${rotation}deg); font-size: 64px; color: #1d2433; }
</style></head><body><div id="card"><div>
<p style="font: 40px Georgia, serif; margin: 0 0 24px">4. Evaluate</p>
<div id="math"></div></div></div>
<script>${katexJs}</script>
<script>katex.render(${JSON.stringify(latex)}, document.getElementById("math"), { displayMode: true });</script>
</body></html>`;

const browser = await chromium.launch();
try {
  const tab = await browser.newPage({ viewport: { width: 1200, height: 700 } });

  await tab.setContent(page(0));
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: path.join(out, "katex-x2-lnx.png") });

  await tab.setContent(page(5));
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({
    path: path.join(out, "katex-x2-lnx-rotated.jpg"),
    type: "jpeg",
    quality: 55,
  });
} finally {
  await browser.close();
}

console.log(
  "Wrote scripts/fixtures/katex-x2-lnx.png and katex-x2-lnx-rotated.jpg",
);
