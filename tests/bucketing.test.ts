import { equal, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { assignVariant } from "../src/lib/bucketing";

describe("experiment bucketing", () => {
  it("assigns the same variant consistently", () => {
    equal(
      assignVariant("visitor-123", "tile-size", ["standard", "large"]),
      assignVariant("visitor-123", "tile-size", ["standard", "large"]),
    );
  });

  it("uses both variants across representative IDs", () => {
    const variants = new Set(
      Array.from({ length: 100 }, (_, index) =>
        assignVariant(`visitor-${index}`, "tile-size", ["standard", "large"]),
      ),
    );
    equal(variants.size, 2);
  });

  it("rejects an experiment with no variants", () => {
    throws(() => {
      assignVariant("visitor", "empty", []);
    }, /at least one variant/);
  });
});
