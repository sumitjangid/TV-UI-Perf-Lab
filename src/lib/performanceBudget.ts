export interface BenchmarkSummary {
  mode: "windowed" | "naive";
  cpuSlowdown: string;
  runs: number;
  loadMs: number;
  keyLatencyP95Ms: number;
  jsHeapMB: number;
  domNodes: number;
  longTasks: number;
}

export interface Budget {
  loadMs: number;
  keyLatencyP95Ms: number;
  jsHeapMB: number;
  domNodes: number;
  longTasks: number;
}

export function evaluateBudgets(
  results: unknown,
  budget: Budget,
): { failures: string[]; measured: BenchmarkSummary | undefined } {
  if (!Array.isArray(results)) {
    return {
      failures: ["Benchmark JSON must contain an array."],
      measured: undefined,
    };
  }

  const measured = results.find(
    (result) =>
      typeof result === "object" &&
      result !== null &&
      "mode" in result &&
      result.mode === "windowed" &&
      "cpuSlowdown" in result &&
      result.cpuSlowdown === "4x",
  ) as BenchmarkSummary | undefined;
  if (!measured) {
    return {
      failures: ["Missing the windowed 4x benchmark result."],
      measured: undefined,
    };
  }

  const failures: string[] = [];
  const checks: Array<[string, number, number]> = [
    ["loadMs", measured.loadMs, budget.loadMs],
    ["keyLatencyP95Ms", measured.keyLatencyP95Ms, budget.keyLatencyP95Ms],
    ["jsHeapMB", measured.jsHeapMB, budget.jsHeapMB],
    ["domNodes", measured.domNodes, budget.domNodes],
    ["longTasks", measured.longTasks, budget.longTasks],
  ];
  for (const [name, actual, limit] of checks) {
    if (actual > limit) {
      failures.push(`${name}: ${actual} exceeds budget ${limit}`);
    }
  }

  return { failures, measured };
}
