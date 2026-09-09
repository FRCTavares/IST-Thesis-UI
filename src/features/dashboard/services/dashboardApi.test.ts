import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  dashboardConfig: {
    mode: "backend" as "backend" | "mock" | "offline",
    apiBaseUrl: "http://pi:8090",
    wsUrl: "ws://pi:8765",
    videoUrl: "",
    controlToken: "",
  },
}));

vi.mock("@/services/config", () => mocked);

import { requestTargetFocus } from "./dashboardApi";

let calls: Array<{ url: string; init: RequestInit }>;

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  mocked.dashboardConfig.mode = "backend";
  mocked.dashboardConfig.controlToken = "";
});

function lastHeaders(): Record<string, string> {
  return (calls[0]?.init.headers ?? {}) as Record<string, string>;
}

describe("dashboard control API authentication", () => {
  it("omits Authorization when no control token is configured", async () => {
    await requestTargetFocus(5);

    expect(calls).toHaveLength(1);
    expect(lastHeaders().Authorization).toBeUndefined();
    expect(lastHeaders()["Content-Type"]).toBe("application/json");
  });

  it("sends a bearer token on the control POST when configured", async () => {
    mocked.dashboardConfig.controlToken = "field-secret-xyz";

    await requestTargetFocus(5);

    expect(lastHeaders().Authorization).toBe("Bearer field-secret-xyz");
  });

  it("does not call the backend in mock mode", async () => {
    mocked.dashboardConfig.mode = "mock";

    const result = await requestTargetFocus(null);

    expect(calls).toHaveLength(0);
    expect(result.ok).toBe(true);
  });
});
