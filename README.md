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

## Runtime boundary

`IST-Thesis-UI` owns only the browser-facing React/Vite frontend.

The live runtime backend remains in `FRCTavares/IST-Thesis-Code`:

- `dashboard_bridge_node` owns the dashboard HTTP API and telemetry WebSocket;
- `web_video_server` owns the MJPEG video stream;
- TIM-MARS remains the selected-person identity authority;
- ROS nodes, perception, tracking, control, and flight-safety logic remain outside this repository.

The live data path is therefore:

    IST-Thesis-Code ROS runtime
        -> HTTP API :8090
        -> telemetry WebSocket :8765
        -> MJPEG video :8080
        -> IST-Thesis-UI frontend :5173

`mock` and `offline` modes are standalone frontend modes and do not require
`IST-Thesis-Code` or ROS.

## Environment variables

Use `.env` if explicit endpoint overrides are required; see `.env.example`.

- `VITE_DASHBOARD_DATA_MODE`
  - `backend` — live backend mode and the default;
  - `mock` — generated telemetry;
  - `offline` — one static mock payload with no backend connection.
- `VITE_DASHBOARD_API_BASE_URL`
  - HTTP base URL for the dashboard API;
  - default logical endpoint: `http://<dashboard-host>:8090`.
- `VITE_DASHBOARD_WS_URL`
  - telemetry WebSocket endpoint;
  - default logical endpoint: `ws://<dashboard-host>:8765`.

When the browser is opened from a remote host, localhost-style API and WebSocket
values are normalized to the browser-visible dashboard host.

The video URL is derived from the browser host and currently resolves to:

    http://<dashboard-host>:8080/stream?topic=/camera/dashboard&type=mjpeg&qos_profile=sensor_data&quality=45

## Live ports

| Port | Owner | Purpose |
|---|---|---|
| `5173` | `IST-Thesis-UI` | Vite frontend |
| `8090` | `IST-Thesis-Code` / `dashboard_bridge_node` | HTTP control API |
| `8765` | `IST-Thesis-Code` / `dashboard_bridge_node` | telemetry WebSocket |
| `8080` | `IST-Thesis-Code` / `web_video_server` | MJPEG dashboard video |

The frontend launcher defaults to `127.0.0.1:5173`. Binding it to `0.0.0.0`
is an explicit network-exposure choice; it is not itself an authentication,
firewall, or CORS policy.

## Current HTTP API contract

The frontend currently consumes these dashboard bridge endpoints:

- `GET /api/models`
  - returns the model catalogue and availability information;
- `POST /api/model`
  - requests detector-model reconfiguration;
- `POST /api/tracker`
  - requests tracker reconfiguration;
- `POST /api/target`
  - explicitly selects or clears the TIM-MARS target.

Replay control is not part of the current dashboard HTTP API.

### Frozen flight-profile reconfiguration

The normal frozen live profile starts the dashboard bridge with runtime
reconfiguration disabled.

In that profile:

- `POST /api/model` can legitimately return HTTP `409`;
- `POST /api/tracker` can legitimately return HTTP `409`.

This is intentional. Detector and tracker changes require restarting the live
stack with an explicitly validated configuration. The field frontend must not
treat a `409` response as evidence that the dashboard bridge is unavailable.

## Target-selection semantics

`POST /api/target` is not a permanent assignment of physical identity to one
tracker ID.

A request such as:

    {"target": 3}

uses the person currently represented by tracker ID `3` as the operator's
bootstrap selection. The dashboard bridge forwards that selection to the
TIM-MARS selection authority.

TIM-MARS then remains responsible for the selected physical person. If the same
person is subsequently associated with a different tracker ID, for example
`12`, the frontend must treat the TIM-MARS status/current target track as
authoritative rather than continuing to assume tracker ID `3`.

Clearing the selection sends an explicit TIM-MARS clear command. A JSON `null`
target is the canonical clear representation accepted by the frontend API
adapter.

The important distinction is:

- tracker ID: transient association identity;
- operator selection: bootstrap reference to the physical person;
- TIM-MARS: ongoing selected-person identity authority.

## Telemetry and bounding-box coordinates

Dashboard telemetry contains tracks and detections as normalized center/size
boxes:

- `x`, `y` — normalized box centre;
- `w`, `h` — normalized box width and height.

The dashboard bridge converts incoming pixel-space track/detection boxes into
stream-normalized coordinates using the current camera reference dimensions
(`camera_ref_w`, `camera_ref_h`). Those reference dimensions are also updated
from received camera metadata when valid image dimensions are available.

Therefore the frontend overlay contract is **not** "divide boxes by the
640x640 detector inference size". The detector may run at `640x640`, while the
dashboard video/reference image can use different dimensions such as
`1280x720`.

`VideoOverlay.tsx` consumes the already normalized telemetry values and maps
them onto the displayed video while preserving the video's rendered aspect
ratio.

## Backend integration

Frontend service adapters are located in:

- `src/features/dashboard/services/dashboardApi.ts`
- `src/features/dashboard/services/dashboardSocket.ts`
- `src/features/dashboard/services/dashboardWebSocketProvider.ts`
- `src/services/config.ts`

The frontend does not import ROS libraries or access the `IST-Thesis-Code`
filesystem. Integration occurs only through the HTTP, WebSocket, and MJPEG
runtime contracts described above.
