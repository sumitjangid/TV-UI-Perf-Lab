import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateBudgets, type BenchmarkSummary, type Budget } from "../src/lib/performanceBudget";

const budget: Budget = {
  loadMs: 1500,
  keyLatencyP95Ms: 150,
  jsHeapMB: 40,
  domNodes: 500,
  longTasks: 10,
};

const windowed: BenchmarkSummary = {
  mode: "windowed",
  cpuSlowdown: "4x",
  runs: 3,
  loadMs: 605.9,
  keyLatencyP95Ms: 81.1,
  jsHeapMB: 5,
  domNodes: 214,
  longTasks: 2,
};

describe("performance budgets", () => {
  it("passes a result within every limit", () => {
    const result = evaluateBudgets([windowed], budget);
    deepEqual(result.failures, []);
  });

  it("reports metrics that exceed their limits", () => {
    const result = evaluateBudgets(
      [{ ...windowed, domNodes: 501, keyLatencyP95Ms: 151 }],
      budget,
    );
    equal(result.failures.length, 2);
  });

  it("requires the windowed 4x result", () => {
    const result = evaluateBudgets(
      [{ ...windowed, cpuSlowdown: "1x" }],
      budget,
    );
    equal(result.failures[0], "Missing the windowed 4x benchmark result.");
  });
});
