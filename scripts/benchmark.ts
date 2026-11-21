import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";

declare global {
  interface Window {
    __benchmarkLongTaskCount: number;
  }
}

type Mode = "windowed" | "naive";

interface RunResult {
  loadMs: number;
  keyLatencies: number[];
  longTasks: number;
  jsHeapMB: number;
  domNodes: number;
}

interface BenchmarkSummary {
  mode: Mode;
  cpuSlowdown: string;
  runs: number;
  loadMs: number;
  keyLatencyP50Ms: number;
  keyLatencyP95Ms: number;
  longTasks: number;
  jsHeapMB: number;
  domNodes: number;
}

const PREVIEW_ORIGIN = "http://127.0.0.1:4173";
const PREVIEW_TIMEOUT_MS = 20_000;
const REPETITIONS = 3;
const CPU_RATES = [1, 4, 6] as const;
const KEY_SEQUENCE = [
  ...Array.from({ length: 10 }, () => "ArrowRight"),
  ...Array.from({ length: 4 }, () => "ArrowDown"),
  ...Array.from({ length: 10 }, () => "ArrowLeft"),
];

function startPreviewServer(): ChildProcess {
  const viteCli = fileURLToPath(
    new URL("../node_modules/vite/bin/vite.js", import.meta.url),
  );
  return spawn(
    process.execPath,
    [
      viteCli,
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "4173",
      "--strictPort",
    ],
    { stdio: "inherit" },
  );
}

async function waitForPreview(server: ChildProcess): Promise<void> {
  const deadline = Date.now() + PREVIEW_TIMEOUT_MS;
  let lastError = "server did not respond";

  while (Date.now() < deadline) {
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error(
        `Vite preview exited with code ${server.exitCode ?? server.signalCode}.`,
      );
    }

    try {
      const response = await fetch(PREVIEW_ORIGIN);
      if (response.ok) {
        await response.body?.cancel();
        return;
      }
      lastError = `HTTP ${response.status}`;
      await response.body?.cancel();
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(250);
  }

  throw new Error(`Vite preview did not start: ${lastError}.`);
}

async function runScenario(
  browser: Browser,
  mode: Mode,
  cpuRate: number,
): Promise<RunResult> {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    await page.addInitScript(() => {
      if (!PerformanceObserver.supportedEntryTypes.includes("longtask")) {
        throw new Error("This browser does not support long-task entries.");
      }

      window.__benchmarkLongTaskCount = 0;
      new PerformanceObserver((list) => {
        window.__benchmarkLongTaskCount += list.getEntries().length;
      }).observe({ type: "longtask" });
    });

    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
    await cdp.send("Performance.enable");

    const url =
      mode === "naive" ? `${PREVIEW_ORIGIN}/?mode=naive` : PREVIEW_ORIGIN;
    const response = await page.goto(url, { waitUntil: "load" });
    if (!response?.ok()) {
      throw new Error(`The ${mode} page failed to load from ${url}.`);
    }

    await page.locator(".title-card.is-focused").waitFor({
      state: "visible",
      timeout: 60_000,
    });
    const loadMs = await page.evaluate(() => performance.now());

    const keyLatencies = await page.evaluate(async (keys) => {
      const latencies: number[] = [];

      for (const key of keys) {
        const start = performance.now();
        window.dispatchEvent(new KeyboardEvent("keydown", { key }));
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        latencies.push(performance.now() - start);
      }

      return latencies;
    }, KEY_SEQUENCE);

    const finalFocus = await page.evaluate(() => document.activeElement?.id);
    if (finalFocus !== "title-4-0") {
      throw new Error(
        `The ${mode} navigation ended on "${finalFocus ?? "no element"}", expected title-4-0.`,
      );
    }

    const { metrics } = await cdp.send("Performance.getMetrics");
    const usedHeap = metrics.find(
      (metric) => metric.name === "JSHeapUsedSize",
    )?.value;
    if (usedHeap === undefined) {
      throw new Error("Chrome did not report JSHeapUsedSize.");
    }

    const [longTasks, domNodes] = await page.evaluate(() => [
      window.__benchmarkLongTaskCount,
      document.querySelectorAll("*").length,
    ]);

    return {
      loadMs,
      keyLatencies,
      longTasks,
      jsHeapMB: usedHeap / 1024 / 1024,
      domNodes,
    };
  } finally {
    await context.close();
  }
}

function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error("Cannot calculate a median from an empty sample.");
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) {
    throw new Error("Cannot calculate a percentile from an empty sample.");
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(percentileValue * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

async function main(): Promise<void> {
  const server = startPreviewServer();
  let browser: Browser | undefined;

  try {
    await waitForPreview(server);
    browser = await chromium.launch();
    const results: BenchmarkSummary[] = [];

    for (const mode of ["windowed", "naive"] as const) {
      for (const cpuRate of CPU_RATES) {
        console.log(
          `Measuring ${mode} mode at ${cpuRate}x CPU slowdown (${REPETITIONS} runs)...`,
        );
        const runs: RunResult[] = [];
        for (let repetition = 0; repetition < REPETITIONS; repetition += 1) {
          runs.push(await runScenario(browser, mode, cpuRate));
        }

        const keyLatencies = runs.flatMap((run) => run.keyLatencies);
        results.push({
          mode,
          cpuSlowdown: `${cpuRate}x`,
          runs: REPETITIONS,
          loadMs: round(median(runs.map((run) => run.loadMs))),
          keyLatencyP50Ms: round(percentile(keyLatencies, 0.5)),
          keyLatencyP95Ms: round(percentile(keyLatencies, 0.95)),
          longTasks: median(runs.map((run) => run.longTasks)),
          jsHeapMB: round(median(runs.map((run) => run.jsHeapMB))),
          domNodes: Math.round(median(runs.map((run) => run.domNodes))),
        });
      }
    }

    console.table(results);
  } finally {
    try {
      await browser?.close();
    } finally {
      server.kill();
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
