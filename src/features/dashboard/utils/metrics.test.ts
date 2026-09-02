import { describe, expect, it } from "vitest";

import { fmt, mean, percentile, pushSeries } from "./metrics";

describe("dashboard metric helpers", () => {
  it("pushSeries ignores invalid values and enforces the history limit", () => {
    const values = [1, 2];

    pushSeries(values, null, 3);
    pushSeries(values, Number.NaN, 3);
    pushSeries(values, 3, 3);
    pushSeries(values, 4, 3);

    expect(values).toEqual([2, 3, 4]);
  });

  it("computes mean and the current discrete percentile contract", () => {
    expect(mean([])).toBeNull();
    expect(mean([2, 4, 6])).toBe(4);

    expect(percentile([], 95)).toBeNull();
    expect(percentile([0, 10, 20, 30, 40], 50)).toBe(20);
    expect(percentile([0, 10, 20, 30, 40], 100)).toBe(40);
  });

  it("formats missing and numeric metric values deterministically", () => {
    expect(fmt(null)).toBe("--");
    expect(fmt(Number.NaN)).toBe("--");
    expect(fmt(12.345, 2, " ms")).toBe("12.35 ms");
  });
});
