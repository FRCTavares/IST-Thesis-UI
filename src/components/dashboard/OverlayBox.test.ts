import { describe, expect, it } from "vitest";

import { overlayStyle } from "./OverlayBox";

describe("overlayStyle", () => {
  it("keeps tracker candidates cyan", () => {
    expect(overlayStyle("track")).toMatchObject({
      stroke: "#38bdf8",
      text: "#f0f9ff",
    });
  });

  it("keeps authoritative targets green", () => {
    expect(overlayStyle("target")).toMatchObject({
      stroke: "#22c55e",
      text: "#ecfdf5",
    });
  });

  it("keeps lost authority visually distinct and dashed", () => {
    expect(overlayStyle("lost")).toMatchObject({
      stroke: "#eab308",
      lineDash: [7, 4],
    });
  });

  it("retains the detector fallback style", () => {
    expect(overlayStyle("detection")).toMatchObject({
      stroke: "#16a34a",
    });
  });
});
