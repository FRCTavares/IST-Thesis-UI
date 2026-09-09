import type { DashboardDataMode } from "@/types/dashboard";

const runtimeConfig = window.__IST_THESIS_DASHBOARD_CONFIG__ ?? {};
const modeRaw = String(
  runtimeConfig.mode ?? import.meta.env.VITE_DASHBOARD_DATA_MODE ?? "backend",
);
const browserHost = window.location.hostname || "127.0.0.1";

function normalizeEndpointHost(rawUrl: string): string {
  try {
    const url = new URL(rawUrl, window.location.origin);
    const isLocalHost =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const browserIsRemote =
      browserHost !== "localhost" && browserHost !== "127.0.0.1";
    if (isLocalHost && browserIsRemote) {
      url.hostname = browserHost;
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export const dashboardConfig = {
  mode: parseMode(modeRaw),
  apiBaseUrl: normalizeEndpointHost(
    String(
      runtimeConfig.apiBaseUrl ??
        import.meta.env.VITE_DASHBOARD_API_BASE_URL ??
        `http://${browserHost}:8090`,
    ),
  ),
  wsUrl: normalizeEndpointHost(
    String(
      runtimeConfig.wsUrl ??
        import.meta.env.VITE_DASHBOARD_WS_URL ??
        `ws://${browserHost}:8765`,
    ),
  ),
  videoUrl: normalizeEndpointHost(
    `http://${browserHost}:8080/stream?topic=/camera/dashboard&type=mjpeg&qos_profile=sensor_data&quality=45`,
  ),
  // Local field-network access credential for the dashboard control POST
  // endpoints. Read ONLY from runtime config
  // (`window.__IST_THESIS_DASHBOARD_CONFIG__.controlToken`), never from a Vite
  // build-time value, so `vite build` cannot bake the secret into static
  // assets. Empty by default; the launcher injects it per session for a
  // non-loopback backend bind.
  controlToken: String(runtimeConfig.controlToken ?? ""),
};

function parseMode(input: string): DashboardDataMode {
  const mode = input.toLowerCase().trim();
  if (mode === "mock" || mode === "offline" || mode === "backend") {
    return mode;
  }
  return "backend";
}
