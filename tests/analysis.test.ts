import { equal, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { zTest } from "../src/lib/analysis";

describe("experiment z-test", () => {
  it("reports conversion rates and lift", () => {
    const result = zTest(10, 100, 12, 100);
    equal(result.p1, 0.1);
    equal(result.p2, 0.12);
    ok(Math.abs(result.lift - 0.2) < 1e-12);
  });

  it("rejects zero observation totals", () => {
    throws(() => zTest(0, 0, 0, 100), /at least one observation/);
  });

  it("rejects conversions outside totals", () => {
    throws(() => zTest(101, 100, 10, 100), /Conversions must be within/);
  });
});
