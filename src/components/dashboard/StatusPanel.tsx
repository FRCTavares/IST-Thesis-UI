import { Wifi, WifiOff } from "lucide-react";
import { PanelShell } from "@/components/dashboard/PanelShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { TargetSelector } from "@/components/dashboard/TargetSelector";
import {
  CANONICAL_DETECTOR,
  CANONICAL_TRACKER,
} from "@/services/runtimeProfile";
import type { DashboardTelemetry } from "@/types/dashboard";

interface StatusPanelProps {
  status: string;
  telemetry: DashboardTelemetry | null;
  isLinkUp?: boolean;
  currentResolutionLabel?: string;
}

function operatorTimMessage(state: string, hasTarget: boolean): string {
  switch (state.toUpperCase()) {
    case "LOCKED":
      return "Selected person confirmed";
    case "UNCERTAIN":
      return "Identity uncertain — conservative control";
    case "LOST":
      return "Selected person not currently confirmed";
    case "REACQUIRED":
      return "Selected person reacquired";
    case "NO_TARGET":
      return "No target selected";
    case "NO_DATA":
      return "Waiting for TIM-MARS telemetry";
    default:
      return hasTarget ? "TIM-MARS target active" : "Waiting for target state";
  }
}

function timStateTone(
  state: string,
): "ok" | "warn" | "error" | "info" | "neutral" {
  switch (state.toUpperCase()) {
    case "LOCKED":
    case "REACQUIRED":
      return "ok";
    case "UNCERTAIN":
      return "warn";
    case "LOST":
      return "error";
    case "NO_TARGET":
    case "NO_DATA":
      return "neutral";
    default:
      return "info";
  }
}

export function StatusPanel({
  status,
  telemetry,
  isLinkUp,
  currentResolutionLabel,
}: StatusPanelProps) {
  const hasTelemetry = Boolean(telemetry);
  const statusLower = status.toLowerCase();

  const explicitlyDisconnected =
    /(disconnected|retry|error|fail|closed|closing|connecting)/.test(
      statusLower,
    );

  const explicitlyConnected =
    /(connected|live|open)/.test(statusLower);

  const computedHealthy =
    hasTelemetry ||
    (explicitlyConnected && !explicitlyDisconnected);

  const isHealthy = isLinkUp ?? computedHealthy;

  const tim = telemetry?.target_memory ?? null;
  const timState = String(tim?.state ?? "NO_DATA");
  const controlMode = String(tim?.control_mode ?? "--");

  const timTargetId =
    typeof tim?.target_track_id === "number" &&
    tim.target_track_id > 0
      ? tim.target_track_id
      : null;

  const bootstrapTargetId =
    typeof telemetry?.target === "number" &&
    telemetry.target > 0
      ? telemetry.target
      : null;

  const selectedTargetId =
    timTargetId ?? bootstrapTargetId;

  const timVisible = tim?.visible === true;
  const timStateUpper = timState.toUpperCase();

  const confirmedTargetId =
    timTargetId !== null &&
    timVisible &&
    (timStateUpper === "LOCKED" || timStateUpper === "REACQUIRED")
      ? timTargetId
      : null;

  const timMessage = operatorTimMessage(
    timState,
    confirmedTargetId !== null,
  );

  return (
    <aside className="h-auto lg:h-full">
      <PanelShell
        title="Operations"
        className="flex h-full flex-col"
        headerClassName="hidden lg:flex"
        contentClassName="flex flex-1 flex-col gap-2 p-2 lg:gap-3 lg:p-3"
      >
        <section className="hidden rounded-md border border-zinc-700/70 bg-zinc-900/45 px-3 py-2.5 lg:block">
          <div className="flex items-center justify-between gap-3">
            <div
              className="flex items-center gap-2 text-sm font-medium text-zinc-200"
              title={status}
            >
              {isHealthy ? (
                <Wifi className="h-4 w-4 text-emerald-300" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-300" />
              )}

              <span>
                {isHealthy ? "Connected" : "Disconnected"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-zinc-400">
                {currentResolutionLabel ?? "—"}
              </span>

              <StatusBadge tone={isHealthy ? "ok" : "error"}>
                {isHealthy ? "Link Up" : "Link Down"}
              </StatusBadge>
            </div>
          </div>
        </section>

        <section className="hidden items-center justify-between gap-3 border-b border-zinc-700/70 px-0.5 pb-3 lg:flex">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Runtime
            </div>

            <div className="mt-1 font-mono text-xs font-semibold text-zinc-200">
              {CANONICAL_DETECTOR.toUpperCase()}
              <span className="px-1.5 text-zinc-600">·</span>
              {CANONICAL_TRACKER.toUpperCase()}
            </div>
          </div>

          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
            Fixed flight profile
          </span>
        </section>

        <TargetSelector
          tracks={telemetry?.tracks ?? []}
          selectedTargetId={selectedTargetId}
          confirmedTargetId={confirmedTargetId}
          timState={timState}
          disabled={!isHealthy}
        />

        <section className="border-t border-zinc-700/70 pt-2 lg:mt-auto lg:pt-3">
          <div className="lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                TIM-MARS
              </div>

              <StatusBadge tone={timStateTone(timState)}>
                {timState}
              </StatusBadge>
            </div>

            <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] font-semibold text-zinc-300">
              <span className="text-zinc-600">REF</span>
              <span>
                {timTargetId !== null ? `#${timTargetId}` : "—"}
              </span>

              <span className="text-zinc-700">·</span>

              <span className="text-zinc-600">CONTROL</span>
              <span>{controlMode}</span>
            </div>

            <div className="mt-1 text-[10px] leading-tight text-zinc-500">
              {timMessage}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              TIM-MARS
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-2">
                <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                  State
                </div>
                <div className="mt-1">
                  <StatusBadge tone={timStateTone(timState)}>
                    {timState}
                  </StatusBadge>
                </div>
              </div>

              <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-2">
                <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                  TIM reference
                </div>
                <div className="mt-1 font-mono text-xs font-semibold text-zinc-200">
                  {timTargetId !== null ? `#${timTargetId}` : "—"}
                </div>
              </div>

              <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-2">
                <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                  Control
                </div>
                <div className="mt-1 truncate font-mono text-xs font-semibold text-zinc-200">
                  {controlMode}
                </div>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-zinc-400">
              {timMessage}
            </div>
          </div>
        </section>
      </PanelShell>
    </aside>
  );
}
