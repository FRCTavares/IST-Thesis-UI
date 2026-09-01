import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";
import type { DashboardTelemetry } from "@/types/dashboard";
import { overlayStyle } from "@/components/dashboard/OverlayBox";

interface VideoOverlayProps {
  telemetry: DashboardTelemetry | null;
  videoUrl: string;
  onResolutionChange?: (resolution: { width: number; height: number } | null) => void;
}

interface NormalizedBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlapIoU(a: NormalizedBox, b: NormalizedBox): number {
  const ax1 = a.x - a.w * 0.5;
  const ay1 = a.y - a.h * 0.5;
  const ax2 = a.x + a.w * 0.5;
  const ay2 = a.y + a.h * 0.5;

  const bx1 = b.x - b.w * 0.5;
  const by1 = b.y - b.h * 0.5;
  const bx2 = b.x + b.w * 0.5;
  const by2 = b.y + b.h * 0.5;

  const ix1 = Math.max(ax1, bx1);
  const iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);

  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const intersection = iw * ih;
  if (intersection <= 0) {
    return 0;
  }

  const areaA = Math.max(0, ax2 - ax1) * Math.max(0, ay2 - ay1);
  const areaB = Math.max(0, bx2 - bx1) * Math.max(0, by2 - by1);
  const union = areaA + areaB - intersection;

  return union > 0 ? intersection / union : 0;
}

export function VideoOverlay({ telemetry, videoUrl, onResolutionChange }: VideoOverlayProps) {
  const videoRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTargetBoxRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const lastResolutionRef = useRef<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [streamSrc, setStreamSrc] = useState("");

  const detections = useMemo(() => telemetry?.detections ?? [], [telemetry]);
  const tracks = useMemo(() => telemetry?.tracks ?? [], [telemetry]);

  const targetPresentation = useMemo(() => {
    if (!telemetry) {
      return null;
    }

    const tim = telemetry.target_memory;
    const timState = String(tim?.state ?? "NO_DATA").toUpperCase();
    const timVisible = tim?.visible === true;

    const timTargetId =
      typeof tim?.target_track_id === "number" &&
      tim.target_track_id > 0
        ? tim.target_track_id
        : null;

    const selectedTargetId =
      typeof telemetry.target === "number" &&
      telemetry.target > 0
        ? telemetry.target
        : null;

    const targetId = timTargetId ?? selectedTargetId;

    if (targetId === null) {
      return null;
    }

    const track =
      telemetry.tracks.find((entry) => entry.id === targetId) ?? null;

    if (!track) {
      return null;
    }

    if (
      timTargetId === targetId &&
      timVisible &&
      (timState === "LOCKED" || timState === "REACQUIRED")
    ) {
      return { track, mode: "confirmed" as const };
    }

    if (
      timTargetId === targetId &&
      timVisible &&
      timState === "UNCERTAIN"
    ) {
      return { track, mode: "uncertain" as const };
    }

    if (
      timTargetId === targetId &&
      (timState === "LOST" || !timVisible)
    ) {
      return { track, mode: "lost" as const };
    }

    return { track, mode: "selected" as const };
  }, [telemetry]);

  const targetTrack = targetPresentation?.track ?? null;

  const reportResolution = useCallback(
    (width: number, height: number) => {
      if (!onResolutionChange) {
        return;
      }

      const normalizedWidth = Math.max(1, Math.floor(width));
      const normalizedHeight = Math.max(1, Math.floor(height));
      const nextValue = `${normalizedWidth}x${normalizedHeight}`;
      if (lastResolutionRef.current === nextValue) {
        return;
      }

      lastResolutionRef.current = nextValue;
      onResolutionChange({ width: normalizedWidth, height: normalizedHeight });
    },
    [onResolutionChange],
  );

  const clearResolution = useCallback(() => {
    if (!onResolutionChange) {
      return;
    }
    if (lastResolutionRef.current === null) {
      return;
    }

    lastResolutionRef.current = null;
    onResolutionChange(null);
  }, [onResolutionChange]);

  useEffect(() => {
    const separator = videoUrl.includes("?") ? "&" : "?";
    setStreamSrc(`${videoUrl}${separator}_t=${Date.now()}`);
    setVideoLoaded(false);
    setVideoError(false);
    clearResolution();
  }, [clearResolution, videoUrl]);

  useEffect(() => {
    if (videoLoaded || videoError) {
      return;
    }

    const interval = window.setInterval(() => {
      const image = videoRef.current;
      if (!image) {
        return;
      }
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        reportResolution(image.naturalWidth, image.naturalHeight);
        setVideoLoaded(true);
        setVideoError(false);
      }
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [reportResolution, videoLoaded, videoError]);

  useEffect(() => {
    if (!videoError) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const separator = videoUrl.includes("?") ? "&" : "?";
      setStreamSrc(`${videoUrl}${separator}_t=${Date.now()}`);
      setVideoError(false);
      setVideoLoaded(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [videoError, videoUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) {
      return;
    }

    const resize = () => {
      const rect = video.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width));
      canvas.height = Math.max(1, Math.floor(rect.height));
      draw();
    };

    const draw = () => {
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);

      const imgW = Math.max(1, video.naturalWidth || canvas.width);
      const imgH = Math.max(1, video.naturalHeight || canvas.height);
      if (video.naturalWidth > 0 && video.naturalHeight > 0) {
        reportResolution(video.naturalWidth, video.naturalHeight);
      }
      const scale = Math.min(canvas.width / imgW, canvas.height / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const offX = 0.5 * (canvas.width - drawW);
      const offY = 0.5 * (canvas.height - drawH);

      // Tracker IDs are the operator-facing person identifiers.
      // Suppress detector rectangles where ByteTrack already represents
      // the same person so the phone view does not show duplicate boxes.
      const displayDetections = detections.filter((det) =>
        tracks.every((track) => overlapIoU(det, track) < 0.55),
      );

      // The current TIM/selected target receives its own higher-level
      // presentation below; all other current ByteTrack candidates use
      // the ordinary numbered tracker presentation.
      const displayTracks =
        targetTrack === null
          ? tracks
          : tracks.filter((track) => track.id !== targetTrack.id);

      displayDetections.forEach((det) => {
        const x = offX + (det.x - 0.5 * det.w) * drawW;
        const y = offY + (det.y - 0.5 * det.h) * drawH;
        const w = det.w * drawW;
        const h = det.h * drawH;
        const style = overlayStyle("detection");
        context.setLineDash([]);
        context.strokeStyle = style.stroke;
        context.lineWidth = 2;
        context.strokeRect(x, y, w, h);

        const label = `${det.label} ${det.score.toFixed(2)}`;
        context.font = "12px IBM Plex Mono, monospace";
        const textW = Math.ceil(context.measureText(label).width) + 8;
        context.fillStyle = style.fill;
        context.fillRect(x, Math.max(0, y - 16), textW, 16);
        context.fillStyle = style.text;
        context.fillText(label, x + 4, Math.max(12, y - 4));
      });

      displayTracks.forEach((track) => {
        const x = offX + (track.x - 0.5 * track.w) * drawW;
        const y = offY + (track.y - 0.5 * track.h) * drawH;
        const w = track.w * drawW;
        const h = track.h * drawH;
        const style = overlayStyle("track");

        context.setLineDash([]);
        context.strokeStyle = style.stroke;
        context.lineWidth = 2;
        context.strokeRect(x, y, w, h);

        const label = `#${track.id}`;
        context.font = "600 14px IBM Plex Mono, monospace";

        const textW =
          Math.ceil(context.measureText(label).width) + 10;

        const labelX = Math.max(
          0,
          Math.min(canvas.width - textW, x),
        );

        const labelY = Math.max(0, y - 20);

        context.fillStyle = style.fill;
        context.fillRect(
          labelX,
          labelY,
          textW,
          20,
        );

        context.fillStyle = style.text;
        context.fillText(
          label,
          labelX + 5,
          labelY + 15,
        );
      });

      const timState = String(
        telemetry?.target_memory?.state ?? "NO_DATA",
      ).toUpperCase();

      if (timState === "NO_TARGET") {
        lastTargetBoxRef.current = null;
      }

      if (targetTrack && targetPresentation) {
        const isConfirmed = targetPresentation.mode === "confirmed";

        if (isConfirmed) {
          lastTargetBoxRef.current = targetTrack;
        }

        const x = offX + (targetTrack.x - 0.5 * targetTrack.w) * drawW;
        const y = offY + (targetTrack.y - 0.5 * targetTrack.h) * drawH;
        const w = targetTrack.w * drawW;
        const h = targetTrack.h * drawH;

        const style = overlayStyle(isConfirmed ? "target" : "lost");

        context.strokeStyle = style.stroke;
        context.lineWidth = isConfirmed ? 2.5 : 2;
        context.setLineDash(
          isConfirmed
            ? []
            : style.lineDash ?? [7, 4],
        );
        context.strokeRect(x, y, w, h);
        context.setLineDash([]);

        const label =
          targetPresentation.mode === "confirmed"
            ? `TIM TARGET #${targetTrack.id}`
            : targetPresentation.mode === "uncertain"
              ? `TIM UNCERTAIN #${targetTrack.id}`
              : targetPresentation.mode === "lost"
                ? `TIM LOST #${targetTrack.id}`
                : `SELECTED #${targetTrack.id}`;

        context.font = "12px IBM Plex Mono, monospace";
        const textW = Math.ceil(context.measureText(label).width) + 10;
        context.fillStyle = style.fill;
        context.fillRect(x, Math.max(0, y - 18), textW, 18);
        context.fillStyle = style.text;
        context.fillText(label, x + 5, Math.max(13, y - 5));
      } else if (
        timState !== "NO_TARGET" &&
        telemetry?.target !== null &&
        telemetry?.target !== undefined &&
        lastTargetBoxRef.current
      ) {
        const lost = lastTargetBoxRef.current;
        const x = offX + (lost.x - 0.5 * lost.w) * drawW;
        const y = offY + (lost.y - 0.5 * lost.h) * drawH;
        const w = lost.w * drawW;
        const h = lost.h * drawH;
        const style = overlayStyle("lost");
        context.strokeStyle = style.stroke;
        context.lineWidth = 2;
        context.setLineDash(style.lineDash ?? [7, 4]);
        context.strokeRect(x, y, w, h);
        context.setLineDash([]);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [detections, reportResolution, targetPresentation, targetTrack, telemetry?.target, tracks]);

  return (
    <div className="relative aspect-[4/3] h-auto min-h-0 w-full overflow-hidden rounded-md border border-zinc-700/80 bg-zinc-900 lg:aspect-auto lg:h-full lg:min-h-[320px] lg:rounded-lg">
      <img
        ref={videoRef}
        className="h-full w-full object-contain"
        src={streamSrc || videoUrl}
        alt="Dashboard stream"
        onLoad={() => {
          const image = videoRef.current;
          if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
            reportResolution(image.naturalWidth, image.naturalHeight);
          }
          setVideoLoaded(true);
          setVideoError(false);
        }}
        onError={() => {
          clearResolution();
          setVideoLoaded(false);
          setVideoError(true);
        }}
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {videoError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950/60">
          <div className="text-center">
            <div className="text-sm font-medium text-zinc-200">Video stream unavailable</div>
            <div className="mt-1 text-xs text-zinc-500">Check camera endpoint or stream process.</div>
          </div>
        </div>
      )}

      {!videoLoaded && !videoError && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          <Loader2 className="h-12 w-12 animate-spin text-zinc-300" />
          <div className="text-xs text-zinc-400">Connecting video stream...</div>
        </div>
      )}

      {videoLoaded && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-500/45 text-zinc-300 lg:h-14 lg:w-14">
          <Crosshair className="h-5 w-5 lg:h-7 lg:w-7" />
        </div>
      )}

      {videoLoaded && telemetry === null && (
        <div className="pointer-events-none absolute left-3 top-3 rounded border border-zinc-700/80 bg-zinc-900/85 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-zinc-400">
          Waiting telemetry overlay
        </div>
      )}

    </div>
  );
}
