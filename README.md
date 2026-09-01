# Micro-UAV Dashboard (Frontend)

This folder contains the dashboard frontend used to monitor perception and telemetry for the Micro-UAV thesis stack.

Technology:

- React + TypeScript + Vite
- Tailwind CSS
- shadcn/ui-compatible setup (`components.json`, Tailwind variables, utility helpers)
- `lucide-react` icons
- `recharts` charts

## Folder architecture

Inside `src/`:

- `app/` app entry and composition
- `components/` shared and dashboard-specific UI components
- `features/` dashboard feature logic, hooks, providers, and services
- `types/` shared TypeScript contracts
- `services/` app-level configuration and service wiring
- `utils/` utility helpers

## Run locally

The authoritative frontend launcher is owned by this repository:

```bash
./tools/start_dashboard.sh --mode backend
```

For the first run, or after dependency changes:

```bash
./tools/start_dashboard.sh --install --mode backend
```

Standalone development modes do not require ROS or `IST-Thesis-Code`:

```bash
./tools/start_dashboard.sh --mode mock
./tools/start_dashboard.sh --mode offline
```

The launcher defaults to `127.0.0.1:5173`. Override the bind host or port explicitly when needed:

```bash
./tools/start_dashboard.sh --mode backend --host 0.0.0.0 --port 5173
```

Binding to `0.0.0.0` exposes the frontend on reachable interfaces and should only be used on the intended field network. Backend API, WebSocket, video, firewall, and access-control policy remain separate `IST-Thesis-Code` contracts.

Launcher state is written outside the repository under `${XDG_STATE_HOME:-$HOME/.local/state}/ist-thesis-ui/`. The launcher executes the actual Vite Node process in the foreground rather than backgrounding an `npm run dev` wrapper, so signals and process shutdown remain deterministic.

Production build validation remains available directly:

```bash
npm ci
npm run build
```

## Environment variables

Use `.env` (see `.env.example`):

- `VITE_DASHBOARD_DATA_MODE`
  - `mock`
  - `offline`
  - `backend` (default if env var is not set)
- `VITE_DASHBOARD_API_BASE_URL`
  - HTTP base URL for backend API calls (`/api/model`, `/api/replay`)
- `VITE_DASHBOARD_WS_URL`
  - WebSocket endpoint for telemetry stream

Default behavior without env overrides is `backend` mode.
For standalone frontend work without ROS, set `VITE_DASHBOARD_DATA_MODE=mock`.

## Data modes

### mock

- Generates synthetic telemetry payloads and detections.
- Supports UI development without ROS or backend running.

### offline

- Keeps the dashboard UI live with a static mock payload.
- Useful for demos where no network data should be consumed.

### backend

- Connects to dashboard bridge contracts:
  - `POST /api/model`
  - `POST /api/replay`
  - WebSocket telemetry stream
- Current live implementation is ROS-native (`dashboard_bridge_node` + `web_video_server`).

## Backend integration readiness

The dashboard service adapters are prepared in:

- `src/features/dashboard/services/dashboardApi.ts`
- `src/features/dashboard/services/dashboardSocket.ts`
- `src/features/dashboard/services/dashboardWebSocketProvider.ts`

These files define the expected backend contract and include safe placeholder behavior so a running backend is not required during frontend development.

## Live ROS dashboard notes (2026-03-25)

- The dashboard video stream URL should include sensor-data QoS for compatibility with best-effort image publishers:
  - `http://<PI_IP>:8080/stream?topic=/camera/dashboard&type=mjpeg&qos_profile=sensor_data`
- Frontend default config now uses this URL pattern in `src/services/config.ts`.
- Frontend control requests use backend control API endpoints:
  - `POST /api/model`
  - `POST /api/replay`
- Default control API target is `http://<dashboard-host>:8090` and localhost-style env values are normalized to the active browser host for remote sessions.
- Bounding boxes are rendered from normalized center/size values coming from dashboard telemetry.
- Those normalized values depend on dashboard bridge `img_w/img_h` matching the detection bbox coordinate basis (currently inference size `640x640`).

## ROS integration path

Current flow:

`ROS topics -> dashboard_bridge_node + web_video_server -> dashboard API/WebSocket/video -> React frontend`

Planned evolution:

- Extract bridge responsibilities into a dedicated backend service layer.
- Keep frontend contracts stable while decoupling ROS internals.
