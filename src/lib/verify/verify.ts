import { CAS_WHEELS, PYODIDE_PATH } from "./assets";
import { CAS_PYTHON } from "./casPython";
import type { VerifyPlan } from "./plan";
import {
  SYMPY_WORKER_SOURCE,
  type WorkerRequest,
  type WorkerResponse,
  type WorkerSetup,
} from "./sympy.worker";

// The first check downloads and starts Pyodide and SymPy (about 19 MB, cached
// by the browser afterwards), which can take a while on a phone.
const TIMEOUT_MS = 120_000;

let worker: Worker | undefined;
let nextId = 0;
// "error" means the check could not run (load failure, timeout, crash), as
// opposed to "unverified": SymPy ran and could not confirm the answer.
export type CasOutcome = "verified" | "unverified" | "error";

const pending = new Map<number, (outcome: CasOutcome) => void>();

function getWorker() {
  if (worker) return worker;

  const source = new Blob([SYMPY_WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(source);
  worker = new Worker(url, { type: "module" });
  URL.revokeObjectURL(url);
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const { id, verified, error } = event.data;
    if (error) console.warn("[CalcTutor] SymPy check failed to run", error);
    pending.get(id)?.(error ? "error" : verified ? "verified" : "unverified");
    pending.delete(id);
  };
  worker.onerror = (event) => {
    console.error("[CalcTutor] SymPy worker crashed", event.message);
    for (const resolve of pending.values()) resolve("error");
    pending.clear();
    worker?.terminate();
    worker = undefined;
  };
  return worker;
}

// Resolves "verified" only when SymPy confirms the plan.
export function runCasCheck(plan: VerifyPlan): Promise<CasOutcome> {
  const id = nextId;
  nextId += 1;

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      pending.delete(id);
      resolve("error");
    }, TIMEOUT_MS);

    pending.set(id, (outcome) => {
      window.clearTimeout(timer);
      resolve(outcome);
    });
    const setup: WorkerSetup = {
      base: new URL(PYODIDE_PATH, window.location.origin).href,
      wheels: CAS_WHEELS,
      python: CAS_PYTHON,
    };
    try {
      getWorker().postMessage({ id, plan, setup } satisfies WorkerRequest);
    } catch (error) {
      console.warn("[CalcTutor] Could not start the SymPy worker", error);
      pending.get(id)?.("error");
      pending.delete(id);
    }
  });
}
