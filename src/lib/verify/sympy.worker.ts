import type { VerifyPlan } from "./plan";

export type WorkerSetup = { base: string; wheels: string[]; python: string };
export type WorkerRequest = {
  id: number;
  plan: VerifyPlan;
  setup: WorkerSetup;
};
export type WorkerResponse = { id: number; verified: boolean; error?: string };

// Source of the CAS module worker. It is started from a Blob instead of being
// bundled: Pyodide only runs in module workers, and the bundler emits workers
// as classic scripts. Plain JavaScript, so nothing here needs compiling.
export const SYMPY_WORKER_SOURCE = `
let runtime;

async function load(setup) {
  const { loadPyodide } = await import(setup.base + "pyodide.mjs");
  const pyodide = await loadPyodide({ indexURL: setup.base });
  await pyodide.loadPackage(setup.wheels.map((wheel) => setup.base + wheel));
  pyodide.runPython(setup.python);
  return pyodide;
}

self.onmessage = async (event) => {
  const { id, plan, setup } = event.data;
  try {
    runtime ??= load(setup);
    const pyodide = await runtime;
    const result = JSON.parse(pyodide.globals.get("verify")(JSON.stringify(plan)));
    self.postMessage({ id, ...result });
  } catch (error) {
    runtime = undefined;
    self.postMessage({ id, verified: false, error: String(error && error.message || error) });
  }
};
`;
