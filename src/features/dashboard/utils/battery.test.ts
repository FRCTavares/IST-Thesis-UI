import { describe, expect, it } from "vitest";

import { batteryPresentation } from "./battery";

describe("batteryPresentation", () => {
  it("renders truthful MAVROS percentage and voltage", () => {
    expect(
      batteryPresentation({
        percentage: 0.734,
        voltage_v: 15.42,
        current_a: -3.2,
        age_ms: 80,
        stale: false,
        source: "mavros",
      }),
    ).toEqual({
      primary: "73%",
      secondary: "15.4 V",
      state: "fresh",
      title: "Battery 73% · 15.4 V",
    });
  });

  it("falls back to voltage without inventing a percentage", () => {
    expect(
      batteryPresentation({
        percentage: null,
        voltage_v: 15.36,
        current_a: -2.8,
        age_ms: 60,
        stale: false,
        source: "mavros",
      }),
    ).toEqual({
      primary: "15.4 V",
      secondary: null,
      state: "fresh",
      title: "Battery 15.4 V; percentage unavailable",
    });
  });

  it("never presents stale telemetry as a live battery value", () => {
    expect(
      batteryPresentation({
        percentage: 0.61,
        voltage_v: 15.1,
        current_a: -2.0,
        age_ms: 4100,
        stale: true,
        source: "mavros",
      }),
    ).toEqual({
      primary: "STALE",
      secondary: null,
      state: "stale",
      title: "Battery telemetry stale (4.1 s old)",
    });
  });

  it("renders no-message state as unavailable rather than zero", () => {
    expect(
      batteryPresentation({
        percentage: null,
        voltage_v: null,
        current_a: null,
        age_ms: null,
        stale: true,
        source: null,
      }),
    ).toEqual({
      primary: "—",
      secondary: null,
      state: "unavailable",
      title: "Battery telemetry unavailable",
    });
  });
});
