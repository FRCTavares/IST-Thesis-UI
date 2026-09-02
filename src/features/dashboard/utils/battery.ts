import type { DashboardBatteryTelemetry } from "@/types/dashboard";

export type BatteryPresentationState = "fresh" | "stale" | "unavailable";

export interface BatteryPresentation {
  primary: string;
  secondary: string | null;
  state: BatteryPresentationState;
  title: string;
}

function finiteNumber(value: number | null | undefined): number | null {
  return value === null || value === undefined || !Number.isFinite(value)
    ? null
    : value;
}

export function batteryPresentation(
  battery: DashboardBatteryTelemetry | null | undefined,
): BatteryPresentation {
  if (!battery || battery.source !== "mavros") {
    return {
      primary: "—",
      secondary: null,
      state: "unavailable",
      title: "Battery telemetry unavailable",
    };
  }

  const percentage = finiteNumber(battery.percentage);
  const validPercentage =
    percentage !== null && percentage >= 0 && percentage <= 1
      ? percentage
      : null;

  const voltage = finiteNumber(battery.voltage_v);
  const validVoltage = voltage !== null && voltage > 0 ? voltage : null;

  if (battery.stale) {
    const age = finiteNumber(battery.age_ms);

    return {
      primary: "STALE",
      secondary: null,
      state: "stale",
      title:
        age !== null
          ? `Battery telemetry stale (${(age / 1000).toFixed(1)} s old)`
          : "Battery telemetry stale",
    };
  }

  if (validPercentage !== null) {
    const percentLabel = `${Math.round(validPercentage * 100)}%`;

    return {
      primary: percentLabel,
      secondary: validVoltage !== null ? `${validVoltage.toFixed(1)} V` : null,
      state: "fresh",
      title:
        validVoltage !== null
          ? `Battery ${percentLabel} · ${validVoltage.toFixed(1)} V`
          : `Battery ${percentLabel}`,
    };
  }

  if (validVoltage !== null) {
    const voltageLabel = `${validVoltage.toFixed(1)} V`;

    return {
      primary: voltageLabel,
      secondary: null,
      state: "fresh",
      title: `Battery ${voltageLabel}; percentage unavailable`,
    };
  }

  return {
    primary: "—",
    secondary: null,
    state: "unavailable",
    title: "Battery telemetry unavailable",
  };
}
