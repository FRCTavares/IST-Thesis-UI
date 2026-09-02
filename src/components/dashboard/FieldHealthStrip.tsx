import type {
  DashboardBatteryTelemetry,
  MetricsSnapshot,
} from "@/types/dashboard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { batteryPresentation } from "@/features/dashboard/utils/battery";

interface FieldHealthStripProps {
  snapshot: MetricsSnapshot | null;
  battery: DashboardBatteryTelemetry | null;
}

type HealthState = {
  label: string;
  tone: "ok" | "warn" | "error" | "info" | "neutral";
};

function formatNumber(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : value.toFixed(digits);
}

function deriveHealth(snapshot: MetricsSnapshot | null): HealthState {
  if (!snapshot) {
    return { label: "Waiting", tone: "neutral" };
  }

  const detectorFps = snapshot.det_out_fps_roll ?? snapshot.det_out_fps_inst;

  const cameraFps =
    snapshot.camera_input_fps_roll ?? snapshot.camera_input_fps_inst;

  const e2eP95 = snapshot.e2e_det_p95_ms;
  const e2eWarn = snapshot.e2e_det_warn_ms;
  const temperature = snapshot.temp_c_inst;

  if (temperature !== null && temperature >= 80) {
    return { label: "Thermal", tone: "error" };
  }

  if (e2eP95 !== null && e2eWarn !== null && e2eP95 > e2eWarn) {
    return { label: "High latency", tone: "warn" };
  }

  if (
    detectorFps !== null &&
    cameraFps !== null &&
    cameraFps > 0 &&
    detectorFps < cameraFps * 0.8
  ) {
    return { label: "Low vision rate", tone: "warn" };
  }

  if (temperature !== null && temperature >= 75) {
    return { label: "Warm", tone: "warn" };
  }

  return { label: "Nominal", tone: "ok" };
}

export function FieldHealthStrip({ snapshot, battery }: FieldHealthStripProps) {
  const detectorFps =
    snapshot?.det_out_fps_roll ?? snapshot?.det_out_fps_inst ?? null;

  const e2eP95 = snapshot?.e2e_det_p95_ms ?? snapshot?.e2e_det_ms_inst ?? null;

  const temperature = snapshot?.temp_c_inst ?? null;

  const batteryState = batteryPresentation(battery);
  const health = deriveHealth(snapshot);

  return (
    <section className="grid grid-cols-4 items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-800/70 px-2 py-2 lg:flex lg:flex-wrap lg:gap-x-6 lg:gap-y-2 lg:px-3 lg:py-2.5">
      <div className="mr-auto hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 lg:block">
        System Health
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-1.5">
        <span className="text-[8px] font-semibold uppercase tracking-[0.1em] text-zinc-600 lg:text-[9px] lg:tracking-[0.12em]">
          Vision
        </span>
        <span className="font-mono text-xs font-semibold text-zinc-200">
          {formatNumber(detectorFps)} Hz
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-1.5">
        <span className="text-[8px] font-semibold uppercase tracking-[0.1em] text-zinc-600 lg:text-[9px] lg:tracking-[0.12em]">
          E2E p95
        </span>
        <span className="font-mono text-xs font-semibold text-zinc-200">
          {formatNumber(e2eP95)} ms
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-1.5">
        <span className="text-[8px] font-semibold uppercase tracking-[0.1em] text-zinc-600 lg:text-[9px] lg:tracking-[0.12em]">
          Temp
        </span>
        <span className="font-mono text-xs font-semibold text-zinc-200">
          {formatNumber(temperature)} °C
        </span>
      </div>

      <div
        className="flex min-w-0 flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-1.5"
        title={batteryState.title}
      >
        <span className="text-[8px] font-semibold uppercase tracking-[0.1em] text-zinc-600 lg:text-[9px] lg:tracking-[0.12em]">
          Bat
        </span>
        <span
          className={`font-mono text-xs font-semibold ${
            batteryState.state === "stale"
              ? "text-amber-300"
              : batteryState.state === "fresh"
                ? "text-zinc-200"
                : "text-zinc-500"
          }`}
        >
          {batteryState.primary}
        </span>
        {batteryState.secondary ? (
          <span className="hidden font-mono text-[10px] text-zinc-500 lg:inline">
            {batteryState.secondary}
          </span>
        ) : null}
      </div>

      <div className="col-span-4 flex justify-end lg:contents">
        <StatusBadge tone={health.tone}>{health.label}</StatusBadge>
      </div>
    </section>
  );
}
