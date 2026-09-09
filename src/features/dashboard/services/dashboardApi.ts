import { dashboardConfig } from "@/services/config";
import type { DashboardControlResponse } from "@/types/dashboard";

export async function requestTargetFocus(
  target: number | null,
): Promise<DashboardControlResponse> {
  if (dashboardConfig.mode === "mock" || dashboardConfig.mode === "offline") {
    return { ok: true, requested_target: target, action: "target" };
  }

  try {
    return await postJson<DashboardControlResponse>(
      `${dashboardConfig.apiBaseUrl}/api/target`,
      { target },
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "target focus request failed",
    };
  }
}

async function postJson<T>(url: string, payload: object): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // The backend control endpoints require a bearer token when configured for a
  // non-loopback bind. Read-only telemetry never carries it.
  if (dashboardConfig.controlToken) {
    headers.Authorization = `Bearer ${dashboardConfig.controlToken}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  let json: unknown = null;

  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const serverError =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error?: unknown }).error ?? "request failed")
        : `HTTP ${response.status}`;

    throw new Error(serverError);
  }

  if (json === null) {
    throw new Error("empty response from control API");
  }

  return json as T;
}
