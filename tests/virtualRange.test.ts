import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { rowFocusColumn, windowRange } from "../src/lib/virtualRange";

describe("windowRange", () => {
  it("keeps enough cards for the initial view and a bounded focus window", () => {
    deepEqual(windowRange(0, 250, 7, 6), { start: 0, end: 7 });
    deepEqual(windowRange(14, 250, 7, 6), { start: 7, end: 21 });
  });

  it("clamps the range at the beginning and end", () => {
    deepEqual(windowRange(0, 100, 7, 6), { start: 0, end: 7 });
    deepEqual(windowRange(99, 100, 7, 6), { start: 92, end: 100 });
  });

  it("returns the whole range for a short collection", () => {
    deepEqual(windowRange(1, 3, 7, 6), { start: 0, end: 3 });
  });

  it("returns an empty range for an empty collection", () => {
    deepEqual(windowRange(0, 0, 7, 6), { start: 0, end: 0 });
  });

  it("keeps row and item windows bounded for large collections", () => {
    const rows = windowRange(20, 40, 2, 3);
    const items = windowRange(100, 250, 7, 6);

    equal(rows.end - rows.start, 6);
    equal(items.end - items.start, 14);
  });

  it("keeps unvisited rows at the start until they receive focus", () => {
    equal(rowFocusColumn(5, 2, 70, {}), 0);
    equal(rowFocusColumn(1, 2, 70, { 1: 12 }), 12);
    equal(rowFocusColumn(2, 2, 70, { 2: 5 }), 70);
  });
});
