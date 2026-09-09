import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadDashboardConfig(runtime: Record<string, unknown>) {
  vi.stubGlobal("window", {
    __IST_THESIS_DASHBOARD_CONFIG__: runtime,
    location: { hostname: "127.0.0.1", origin: "http://127.0.0.1" },
  });
  vi.resetModules();
  return (await import("./config")).dashboardConfig;
}

describe("dashboard runtime configuration — control token", () => {
  it("reads the control token from runtime config only", async () => {
    const config = await loadDashboardConfig({
      controlToken: "runtime-secret",
    });
    expect(config.controlToken).toBe("runtime-secret");
  });

  it("is empty when runtime config carries no token", async () => {
    const config = await loadDashboardConfig({});
    expect(config.controlToken).toBe("");
  });

  it("has no Vite build-time control-token fallback in source", () => {
    const configPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "config.ts",
    );
    const source = readFileSync(configPath, "utf8");
    expect(source).not.toContain("VITE_DASHBOARD_CONTROL_TOKEN");
    expect(source).not.toContain(
      "import.meta.env.VITE_DASHBOARD_CONTROL_TOKEN",
    );
  });
});
