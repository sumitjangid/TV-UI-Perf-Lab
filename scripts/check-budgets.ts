import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  evaluateBudgets,
  type Budget,
} from "../src/lib/performanceBudget.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function main(): Promise<void> {
  const resultsPath = resolve("bench/latest.json");
  const budgetsPath = resolve("bench/budgets.json");
  const [resultsText, budgetsText] = await Promise.all([
    readFile(resultsPath, "utf8"),
    readFile(budgetsPath, "utf8"),
  ]);
  const results: unknown = JSON.parse(resultsText);
  const budgets: unknown = JSON.parse(budgetsText);

  if (!isRecord(budgets) || !isRecord(budgets.windowed_cpu4x)) {
    throw new Error("bench/budgets.json must define windowed_cpu4x.");
  }

  const rawBudget = budgets.windowed_cpu4x;
  const budgetFields = [
    "loadMs",
    "keyLatencyP95Ms",
    "jsHeapMB",
    "domNodes",
    "longTasks",
  ] as const;
  if (
    budgetFields.some(
      (field) => typeof rawBudget[field] !== "number",
    )
  ) {
    throw new Error("The windowed_cpu4x budget contains a missing or invalid value.");
  }

  const budget = rawBudget as unknown as Budget;
  const { failures, measured } = evaluateBudgets(results, budget);
  if (!measured) {
    for (const failure of failures) {
      console.error(`FAIL: ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Checking windowed 4x benchmark: load ${measured.loadMs} ms, ` +
    `p95 ${measured.keyLatencyP95Ms} ms, heap ${measured.jsHeapMB} MB, ` +
    `DOM ${measured.domNodes}, long tasks ${measured.longTasks}`,
  );
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`FAIL: ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS: all windowed 4x performance budgets are within limits.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
