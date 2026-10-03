// Copies the Pyodide runtime from node_modules and downloads the pinned SymPy
// and mpmath wheels from PyPI into public/pyodide, so CAS verification is
// served from this app's own origin and never depends on a third-party CDN at
// runtime. Runs before `dev` and `build`; files already present with the
// right hash are kept.
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "public", "pyodide");
const pyodideDir = path.dirname(require.resolve("pyodide/package.json"));

const runtimeFiles = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

// SymPy 1.14 requires mpmath < 1.4, so mpmath is pinned to 1.3.0.
const wheels = [
  {
    file: "mpmath-1.3.0-py3-none-any.whl",
    url: "https://files.pythonhosted.org/packages/43/e3/7d92a15f894aa0c9c4b49b8ee9ac9850d6e63b03c9c32c0367a13ae62209/mpmath-1.3.0-py3-none-any.whl",
    sha256: "a0b2b9fe80bbcd81a6647ff13108738cfb482d481d826cc0e02f5b35e5c88d2c",
  },
  {
    file: "sympy-1.14.0-py3-none-any.whl",
    url: "https://files.pythonhosted.org/packages/a2/09/77d55d46fd61b4a135c444fc97158ef34a095e5681d0a6c10b75bf356191/sympy-1.14.0-py3-none-any.whl",
    sha256: "e091cc3e99d2141a0ba2847328f5479b05d94a6635cb96148ccb3f34671bd8f5",
  },
];

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

async function existingHash(file: string) {
  try {
    return sha256(await readFile(file));
  } catch {
    return undefined;
  }
}

await mkdir(target, { recursive: true });

for (const file of runtimeFiles) {
  await copyFile(path.join(pyodideDir, file), path.join(target, file));
}

for (const wheel of wheels) {
  const destination = path.join(target, wheel.file);
  if ((await existingHash(destination)) === wheel.sha256) continue;

  const response = await fetch(wheel.url);
  if (!response.ok) {
    throw new Error(
      `Could not download ${wheel.file}: HTTP ${response.status}`,
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const actual = sha256(bytes);
  if (actual !== wheel.sha256) {
    throw new Error(
      `${wheel.file} failed its integrity check (expected ${wheel.sha256}, got ${actual})`,
    );
  }

  await writeFile(destination, bytes);
  console.log(`Downloaded ${wheel.file}`);
}

console.log(
  `Pyodide runtime and wheels are ready in ${path.relative(root, target)}`,
);
