import { useMemo, useState } from "react";
import { requestTargetFocus } from "@/features/dashboard/services/dashboardApi";

type TrackLike = {
  id: number;
  label?: string;
};

interface TargetSelectorProps {
  tracks?: TrackLike[];
  selectedTargetId?: number | null;
  confirmedTargetId?: number | null;
  timState?: string;
  disabled?: boolean;
}

export function TargetSelector({
  tracks = [],
  selectedTargetId = null,
  confirmedTargetId = null,
  timState = "NO_TARGET",
  disabled = false,
}: TargetSelectorProps) {
  const [targetBusy, setTargetBusy] = useState(false);
  const [targetMessage, setTargetMessage] = useState<string | null>(null);

  const personTracks = useMemo(
    () =>
      [...tracks]
        .filter((track) => !track.label || track.label === "person")
        .sort((a, b) => a.id - b.id),
    [tracks],
  );

  const handleTargetFocus = async (target: number | null) => {
    setTargetBusy(true);
    setTargetMessage(null);

    const response = await requestTargetFocus(target);

    setTargetBusy(false);

    if (!response.ok) {
      setTargetMessage(response.error ?? "Target command failed");
      return;
    }

    setTargetMessage(
      target === null
        ? "Target cleared"
        : `Selected #${target} to bootstrap TIM-MARS`,
    );
  };

  return (
    <section className="flex h-auto flex-col gap-2 lg:h-[220px]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Target
          </div>
          <div className="mt-0.5 hidden text-[11px] text-zinc-500 lg:block">
            Select a visible tracker ID to bootstrap TIM-MARS.
          </div>
        </div>

        <button
          type="button"
          disabled={targetBusy || disabled}
          onClick={() => handleTargetFocus(null)}
          className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear Target
        </button>
      </div>

      <div className="flex min-h-0 gap-1.5 overflow-x-auto pb-1 lg:block lg:flex-1 lg:space-y-1.5 lg:overflow-x-visible lg:overflow-y-auto lg:pb-0 lg:pr-1">
        {personTracks.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-700/70 px-2.5 py-2 text-xs text-zinc-500">
            No visible tracks
          </div>
        ) : (
          personTracks.slice(0, 5).map((track) => {
            const isSelected = selectedTargetId === track.id;
            const isConfirmed = confirmedTargetId === track.id;
            const normalizedTimState = timState.toUpperCase();

            const stateLabel = isConfirmed
              ? "TIM confirmed"
              : isSelected && normalizedTimState === "LOST"
                ? "Selected · LOST"
                : isSelected && normalizedTimState === "UNCERTAIN"
                  ? "Selected · UNCERTAIN"
                  : isSelected
                    ? "Selected"
                    : "Visible";

            return (
              <div
                key={track.id}
                className="flex min-w-[148px] shrink-0 items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-950/45 px-2 py-1.5 lg:min-w-0 lg:px-2.5 lg:py-2"
              >
                <div className="flex min-w-0 flex-col items-start gap-0.5">
                  <span className="font-mono text-sm font-semibold text-zinc-100">
                    #{track.id}
                  </span>

                  <span
                    className={
                      isConfirmed
                        ? "text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-300"
                        : isSelected
                          ? "text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-300"
                          : "text-[9px] uppercase tracking-[0.12em] text-zinc-600"
                    }
                  >
                    {stateLabel}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={targetBusy || disabled}
                  onClick={() => handleTargetFocus(track.id)}
                  className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-200 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 lg:px-3 lg:text-[10px]"
                >
                  Select
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="min-h-[12px] text-[9px] leading-tight text-zinc-500 lg:min-h-[18px] lg:text-[11px] lg:text-zinc-400">
        {targetMessage ?? ""}
      </div>
    </section>
  );
}
