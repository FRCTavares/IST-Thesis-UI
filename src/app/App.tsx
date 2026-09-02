import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Radar,
  ScrollText,
  Settings,
} from "lucide-react";
import {
  DashboardWebSocketProvider,
  useDashboardRealtime,
} from "@/features/dashboard/providers/dashboardWebSocketProvider";
import { VideoOverlay } from "@/components/dashboard/VideoOverlay";
import { FieldHealthStrip } from "@/components/dashboard/FieldHealthStrip";
import { ChartsWorkspace } from "@/components/dashboard/ChartsWorkspace";
import { StatusPanel } from "@/components/dashboard/StatusPanel";
import { LoggingPanel } from "@/components/dashboard/LoggingPanel";
import { PanelShell } from "@/components/dashboard/PanelShell";
import { dashboardConfig } from "@/services/config";
import { CANONICAL_DETECTOR } from "@/services/runtimeProfile";
import type {
  DashboardLogEntry,
  DashboardLogLevel,
  DashboardLogSource,
  MetricsSnapshot,
} from "@/types/dashboard";
import { useDashboardMetrics } from "@/features/dashboard/hooks/useDashboardMetrics";

type DashboardTab = "overview" | "charts" | "logging";
type UiDensity = "compact" | "cozy";

const DEFAULT_LOG_BUFFER_LIMIT = 2000;
const DASHBOARD_LOGS_STORAGE_KEY = "dashboard.log.entries.v1";
const DASHBOARD_LOGS_PAUSED_STORAGE_KEY = "dashboard.log.paused.v1";
const DASHBOARD_UI_DENSITY_STORAGE_KEY = "dashboard.ui.density.v1";
const DASHBOARD_DEFAULT_TAB_STORAGE_KEY = "dashboard.ui.defaultTab.v1";
const DASHBOARD_LOG_BUFFER_STORAGE_KEY = "dashboard.log.bufferLimit.v1";

interface StreamResolution {
  width: number;
  height: number;
}

function inferLogLevel(message: string): DashboardLogLevel {
  const text = message.toLowerCase();
  if (/(error|failed|fail|cannot|down|invalid)/.test(text)) {
    return "error";
  }
  if (/(warn|degrad|retry|slow|closing)/.test(text)) {
    return "warn";
  }
  if (
    /(started|stopped|requested|connected|live|downloaded|deleted|cleared)/.test(
      text,
    )
  ) {
    return "info";
  }
  return "debug";
}

function isDashboardTab(value: string): value is DashboardTab {
  return value === "overview" || value === "charts" || value === "logging";
}

function DashboardPage() {
  const { telemetry, status } = useDashboardRealtime();
  const activeModel = CANONICAL_DETECTOR;
  const [controlStatus, setControlStatus] = useState("Ready.");
  const [samples, setSamples] = useState<MetricsSnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<DashboardLogEntry[]>([]);
  const [isLogIntakePaused, setIsLogIntakePaused] = useState(false);
  const [uiDensity, setUiDensity] = useState<UiDensity>("cozy");
  const [defaultTab, setDefaultTab] = useState<DashboardTab>("overview");
  const [logBufferLimit, setLogBufferLimit] = useState(
    DEFAULT_LOG_BUFFER_LIMIT,
  );
  const [streamResolution, setStreamResolution] =
    useState<StreamResolution | null>(null);

  const lastSocketStatusRef = useRef<string | null>(null);
  const lastControlStatusRef = useRef<string | null>(null);

  const hasTelemetry = Boolean(telemetry);
  const statusLower = status.toLowerCase();
  const explicitlyDisconnected =
    /(disconnected|retry|error|fail|closed|closing|connecting)/.test(
      statusLower,
    );
  const explicitlyConnected = /(connected|live|open)/.test(statusLower);
  const isLinkUp =
    hasTelemetry || (explicitlyConnected && !explicitlyDisconnected);
  const streamResolutionLabel = streamResolution
    ? `${streamResolution.width}x${streamResolution.height}`
    : "Unknown";
  const inferenceResolutionLabel = telemetry?.inference_resolution
    ? `${telemetry.inference_resolution.width}x${telemetry.inference_resolution.height}`
    : streamResolutionLabel;

  const metricState = useDashboardMetrics(telemetry, activeModel);

  useEffect(() => {
    try {
      let loadedBufferLimit = DEFAULT_LOG_BUFFER_LIMIT;
      const rawBufferLimit = window.localStorage.getItem(
        DASHBOARD_LOG_BUFFER_STORAGE_KEY,
      );
      if (rawBufferLimit) {
        const parsedLimit = Number(rawBufferLimit);
        if ([500, 1000, 2000, 5000].includes(parsedLimit)) {
          loadedBufferLimit = parsedLimit;
          setLogBufferLimit(parsedLimit);
        }
      }

      const rawDensity = window.localStorage.getItem(
        DASHBOARD_UI_DENSITY_STORAGE_KEY,
      );
      if (rawDensity === "compact" || rawDensity === "cozy") {
        setUiDensity(rawDensity);
      }

      const rawDefaultTab = window.localStorage.getItem(
        DASHBOARD_DEFAULT_TAB_STORAGE_KEY,
      );
      if (rawDefaultTab && isDashboardTab(rawDefaultTab)) {
        setDefaultTab(rawDefaultTab);

        if (!window.matchMedia("(max-width: 1023px)").matches) {
          setActiveTab(rawDefaultTab);
        }
      }

      const rawLogs = window.localStorage.getItem(DASHBOARD_LOGS_STORAGE_KEY);
      if (rawLogs) {
        const parsed = JSON.parse(rawLogs) as DashboardLogEntry[];
        if (Array.isArray(parsed)) {
          const sanitized = parsed
            .filter(
              (entry) =>
                entry &&
                typeof entry.message === "string" &&
                typeof entry.timestamp_iso === "string",
            )
            .slice(0, loadedBufferLimit);
          if (sanitized.length > 0) {
            setLogEntries(sanitized);
          }
        }
      }

      const rawPaused = window.localStorage.getItem(
        DASHBOARD_LOGS_PAUSED_STORAGE_KEY,
      );
      if (rawPaused === "1") {
        setIsLogIntakePaused(true);
      }
    } catch {
      // Ignore storage parse errors and continue with defaults.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DASHBOARD_LOGS_STORAGE_KEY,
        JSON.stringify(logEntries),
      );
    } catch {
      // Ignore storage write errors when localStorage is unavailable.
    }
  }, [logEntries]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DASHBOARD_LOGS_PAUSED_STORAGE_KEY,
        isLogIntakePaused ? "1" : "0",
      );
    } catch {
      // Ignore storage write errors when localStorage is unavailable.
    }
  }, [isLogIntakePaused]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DASHBOARD_UI_DENSITY_STORAGE_KEY, uiDensity);
      window.localStorage.setItem(
        DASHBOARD_DEFAULT_TAB_STORAGE_KEY,
        defaultTab,
      );
      window.localStorage.setItem(
        DASHBOARD_LOG_BUFFER_STORAGE_KEY,
        String(logBufferLimit),
      );
    } catch {
      // Ignore storage write errors when localStorage is unavailable.
    }
  }, [defaultTab, logBufferLimit, uiDensity]);

  useEffect(() => {
    setLogEntries((prev) => prev.slice(0, logBufferLimit));
  }, [logBufferLimit]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");

    const enforceMobileOverview = () => {
      if (media.matches) {
        setActiveTab("overview");
      }
    };

    enforceMobileOverview();
    media.addEventListener("change", enforceMobileOverview);

    return () => {
      media.removeEventListener("change", enforceMobileOverview);
    };
  }, []);

  const appendLog = (
    source: DashboardLogSource,
    message: string,
    level?: DashboardLogLevel,
  ) => {
    if (isLogIntakePaused) {
      return;
    }
    const entry: DashboardLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp_iso: new Date().toISOString(),
      source,
      level: level ?? inferLogLevel(message),
      message,
    };
    setLogEntries((prev) => [entry, ...prev].slice(0, logBufferLimit));
  };

  useEffect(() => {
    const snapshot = metricState.snapshot;
    if (!snapshot) {
      return;
    }

    setSamples((prev: MetricsSnapshot[]) => {
      const next = [...prev, snapshot];
      if (next.length > 2400) {
        next.shift();
      }
      return next;
    });
  }, [metricState.snapshot]);

  useEffect(() => {
    if (!status) {
      return;
    }
    if (lastSocketStatusRef.current === status) {
      return;
    }
    appendLog("socket", status);
    lastSocketStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!controlStatus) {
      return;
    }
    if (lastControlStatusRef.current === controlStatus) {
      return;
    }
    appendLog("control", controlStatus);
    lastControlStatusRef.current = controlStatus;
  }, [controlStatus]);

  const handleLogout = () => {
    appendLog("system", "Logout requested. Session state cleared.", "warn");
    setSamples([]);
    setStreamResolution(null);
    setActiveTab(
      window.matchMedia("(max-width: 1023px)").matches
        ? "overview"
        : defaultTab,
    );
    setIsSidebarCollapsed(false);
    setIsSettingsOpen(false);
    setControlStatus("Logged out. Session state cleared.");
  };

  const handleExportLogsJson = () => {
    const blob = new Blob([JSON.stringify(logEntries, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dashboard_logs_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setControlStatus(`Exported ${logEntries.length} log entries to JSON.`);
  };

  const handleExportLogsCsv = () => {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      ["timestamp_iso", "level", "source", "message"],
      ...logEntries.map((entry) => [
        entry.timestamp_iso,
        entry.level,
        entry.source,
        entry.message,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => escape(String(cell))).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dashboard_logs_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setControlStatus(`Exported ${logEntries.length} log entries to CSV.`);
  };

  const handleClearLogs = () => {
    setLogEntries([]);
    setControlStatus("Logs cleared.");
  };

  return (
    <div className={`min-h-screen w-full ui-density-${uiDensity}`}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[92px] flex-col items-center justify-between border-r border-zinc-700/80 bg-zinc-800/70 py-4 lg:flex">
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex flex-col items-center gap-1 select-none"
            aria-hidden="true"
          >
            <Radar className="h-6 w-6 text-zinc-300/90" />
            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              UAV
            </div>
          </div>

          <div className="mb-2 mt-2 h-px w-10 bg-zinc-700/80" />

          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex h-12 w-12 items-center justify-center rounded-lg border transition-all ${
              activeTab === "overview"
                ? "border-zinc-500/70 bg-zinc-700/40 text-zinc-100 shadow-[0_0_14px_rgba(100,116,139,0.18)]"
                : "border-zinc-800 bg-zinc-900/65 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
            aria-label="Overview"
            title="Overview"
          >
            <LayoutDashboard className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("charts")}
            className={`flex h-12 w-12 items-center justify-center rounded-lg border transition-all ${
              activeTab === "charts"
                ? "border-zinc-500/70 bg-zinc-700/40 text-zinc-100 shadow-[0_0_14px_rgba(100,116,139,0.18)]"
                : "border-zinc-800 bg-zinc-900/65 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
            aria-label="Charts"
            title="Charts"
          >
            <BarChart3 className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logging")}
            className={`flex h-12 w-12 items-center justify-center rounded-lg border transition-all ${
              activeTab === "logging"
                ? "border-zinc-500/70 bg-zinc-700/40 text-zinc-100 shadow-[0_0_14px_rgba(100,116,139,0.18)]"
                : "border-zinc-800 bg-zinc-900/65 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
            aria-label="Logging"
            title="Logging"
          >
            <ScrollText className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="mb-1 h-px w-10 bg-zinc-700/80" />
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/65 text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-12 w-12 items-center justify-center rounded-lg border border-red-900/80 bg-red-950/45 text-red-300 transition-all hover:border-red-700 hover:bg-red-900/35 hover:text-red-200"
            aria-label="Disconnect"
            title="Disconnect / Logout"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-[92px]">
        <div
          className={`mx-auto w-full max-w-[1640px] ${uiDensity === "compact" ? "p-1.5 sm:p-2 lg:p-3" : "p-1.5 sm:p-2 lg:p-4"}`}
        >
          <div className="mb-1 flex h-9 items-center justify-between rounded-md border border-zinc-700/80 bg-zinc-800/70 px-2 lg:hidden">
            <div className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-zinc-300" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                UAV
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-7 items-center gap-1.5 rounded-md border px-2 text-[9px] font-semibold uppercase tracking-[0.1em] ${
                  isLinkUp
                    ? "border-emerald-800/70 bg-emerald-950/35 text-emerald-300"
                    : "border-red-900/70 bg-red-950/35 text-red-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isLinkUp ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
                {isLinkUp ? "Live" : "Offline"}
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/70 text-zinc-400"
                aria-label="Settings"
                title="Settings"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-red-900/70 bg-red-950/35 text-red-300"
                aria-label="Disconnect"
                title="Disconnect"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {isSidebarCollapsed && (
            <div className="mb-3 hidden justify-end lg:flex">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="h-9 w-9 rounded-md border border-zinc-700/80 bg-zinc-900/90 text-zinc-300 shadow-[0_8px_24px_rgba(2,6,23,0.35)] transition-all hover:border-zinc-500 hover:text-zinc-100"
                aria-label="Expand side panel"
                title="Expand side panel"
              >
                <ChevronRight className="mx-auto h-4 w-4" />
              </button>
            </div>
          )}

          {activeTab === "overview" ? (
            <div className="grid gap-1.5 lg:gap-3">
              <div
                className={`grid grid-cols-1 gap-2 transition-[grid-template-columns] duration-300 ease-in-out lg:gap-3 ${
                  isSidebarCollapsed
                    ? "lg:grid-cols-1"
                    : "lg:grid-cols-[2.2fr_1fr]"
                } lg:items-stretch`}
              >
                <PanelShell
                  title="Live Camera Feed"
                  className="flex h-full flex-col overflow-hidden"
                  headerClassName="hidden lg:flex"
                  contentClassName="flex-1 p-0 lg:p-2.5"
                >
                  <VideoOverlay
                    telemetry={telemetry}
                    videoUrl={dashboardConfig.videoUrl}
                    onResolutionChange={setStreamResolution}
                  />
                </PanelShell>

                {!isSidebarCollapsed && (
                  <StatusPanel
                    status={status}
                    telemetry={telemetry}
                    isLinkUp={isLinkUp}
                    currentResolutionLabel={inferenceResolutionLabel}
                  />
                )}
              </div>

              <FieldHealthStrip snapshot={metricState.snapshot} />
            </div>
          ) : null}

          {activeTab === "charts" ? (
            <div className="grid grid-cols-1 gap-3">
              <ChartsWorkspace samples={samples} />
            </div>
          ) : null}

          {activeTab === "logging" ? (
            <div className="grid grid-cols-1 gap-3 lg:min-h-[calc(100vh-2rem)] lg:items-stretch">
              <LoggingPanel
                entries={logEntries}
                isPaused={isLogIntakePaused}
                bufferLimit={logBufferLimit}
                onTogglePaused={() => setIsLogIntakePaused((prev) => !prev)}
                onClearLogs={handleClearLogs}
                onExportJson={handleExportLogsJson}
                onExportCsv={handleExportLogsCsv}
              />
            </div>
          ) : null}
        </div>
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-700/80 bg-zinc-900/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Settings
            </div>
            <div className="space-y-3 rounded-md border border-zinc-700/70 bg-zinc-900/60 p-3 text-sm text-zinc-300">
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Density
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUiDensity("compact")}
                    className={`h-8 rounded-md border px-3 text-xs transition-all ${
                      uiDensity === "compact"
                        ? "border-zinc-500 bg-zinc-700/50 text-zinc-100"
                        : "border-zinc-700 bg-zinc-900/70 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                    }`}
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    onClick={() => setUiDensity("cozy")}
                    className={`h-8 rounded-md border px-3 text-xs transition-all ${
                      uiDensity === "cozy"
                        ? "border-zinc-500 bg-zinc-700/50 text-zinc-100"
                        : "border-zinc-700 bg-zinc-900/70 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                    }`}
                  >
                    Cozy
                  </button>
                </div>
              </div>

              <label className="grid gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Default Tab
                </span>
                <select
                  value={defaultTab}
                  onChange={(e) =>
                    setDefaultTab(e.target.value as DashboardTab)
                  }
                  className="h-9 rounded-md border border-zinc-700 bg-zinc-950/80 px-3 text-sm text-zinc-100 transition-all focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                >
                  <option value="overview">Overview</option>
                  <option value="charts">Charts</option>
                  <option value="logging">Logging</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Log Buffer Limit
                </span>
                <select
                  value={logBufferLimit}
                  onChange={(e) => setLogBufferLimit(Number(e.target.value))}
                  className="h-9 rounded-md border border-zinc-700 bg-zinc-950/80 px-3 text-sm text-zinc-100 transition-all focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                >
                  <option value={500}>500 entries</option>
                  <option value={1000}>1000 entries</option>
                  <option value={2000}>2000 entries</option>
                  <option value={5000}>5000 entries</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200 transition-all hover:border-zinc-500 hover:text-zinc-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <DashboardWebSocketProvider>
      <DashboardPage />
    </DashboardWebSocketProvider>
  );
}
