export type OverlayKind = "detection" | "track" | "target" | "lost";

export interface OverlayStyle {
  stroke: string;
  fill: string;
  text: string;
  lineDash?: number[];
}

export function overlayStyle(kind: OverlayKind): OverlayStyle {
  if (kind === "track") {
    return {
      stroke: "#38bdf8",
      fill: "rgba(3, 105, 161, 0.92)",
      text: "#f0f9ff",
    };
  }

  if (kind === "target") {
    return {
      stroke: "#22c55e",
      fill: "rgba(34, 197, 94, 0.85)",
      text: "#ecfdf5",
    };
  }

  if (kind === "lost") {
    return {
      stroke: "#eab308",
      fill: "rgba(234, 179, 8, 0.9)",
      text: "#111827",
      lineDash: [7, 4],
    };
  }

  return {
    stroke: "#16a34a",
    fill: "rgba(22, 163, 74, 0.86)",
    text: "#ecfdf5",
  };
}
