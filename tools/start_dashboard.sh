#!/usr/bin/env bash

set +u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MODE="${VITE_DASHBOARD_DATA_MODE:-backend}"
HOST="${DASHBOARD_UI_HOST:-127.0.0.1}"
PORT="${DASHBOARD_UI_PORT:-5173}"
INSTALL=0
DEV_MODE=0

STATE_ROOT="${XDG_STATE_HOME:-$HOME/.local/state}/ist-thesis-ui"
LOG_DIR="$STATE_ROOT/log"
LAUNCH_LOG="$LOG_DIR/launcher.log"

usage() {
    cat <<USAGE
Usage: ./tools/start_dashboard.sh [options]

Options:
  --mode MODE     Dashboard data mode: backend, mock, or offline
                  Default: ${MODE}
  --host HOST     Vite bind host
                  Default: ${HOST}
  --port PORT     Vite port
                  Default: ${PORT}
  --install       Run npm ci before launching
  --dev           Run the Vite development server instead of prebuilt dist
  -h, --help      Show this help

Environment:
  VITE_DASHBOARD_DATA_MODE
  DASHBOARD_UI_HOST
  DASHBOARD_UI_PORT
  XDG_STATE_HOME
  VITE_DASHBOARD_API_BASE_URL
  VITE_DASHBOARD_WS_URL

The default runtime serves the already-built dist/ tree with Python's standard
library HTTP server. It performs no npm install, frontend compilation, Vite
transformation, or network download at runtime. Use --dev only for frontend
development. Runtime configuration is written to dist/runtime-config.js before
the static server starts.
USAGE
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --mode)
            if [ "$#" -lt 2 ]; then
                printf 'ERROR: --mode requires a value\n' >&2
                exit 2
            fi
            MODE="$2"
            shift 2
            ;;
        --host)
            if [ "$#" -lt 2 ]; then
                printf 'ERROR: --host requires a value\n' >&2
                exit 2
            fi
            HOST="$2"
            shift 2
            ;;
        --port)
            if [ "$#" -lt 2 ]; then
                printf 'ERROR: --port requires a value\n' >&2
                exit 2
            fi
            PORT="$2"
            shift 2
            ;;
        --install)
            INSTALL=1
            shift
            ;;
        --dev)
            DEV_MODE=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            printf 'ERROR: unknown argument: %s\n\n' "$1" >&2
            usage >&2
            exit 2
            ;;
    esac
done

case "$MODE" in
    backend|mock|offline)
        ;;
    *)
        printf 'ERROR: invalid mode %q; expected backend, mock, or offline\n' "$MODE" >&2
        exit 2
        ;;
esac

if [ -z "$HOST" ]; then
    printf 'ERROR: host must not be empty\n' >&2
    exit 2
fi

if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
    printf 'ERROR: port must be an integer: %s\n' "$PORT" >&2
    exit 2
fi

if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    printf 'ERROR: port must be between 1 and 65535: %s\n' "$PORT" >&2
    exit 2
fi

cd "$UI_ROOT" || exit 1

if [ "$INSTALL" -eq 1 ]; then
    printf 'Installing locked frontend dependencies with npm ci...\n'
    npm ci
    INSTALL_STATUS=$?

    if [ "$INSTALL_STATUS" -ne 0 ]; then
        printf 'ERROR: npm ci failed with status %s\n' "$INSTALL_STATUS" >&2
        exit "$INSTALL_STATUS"
    fi
fi

mkdir -p "$LOG_DIR" || exit 1

RUNTIME_KIND="static"

if [ "$DEV_MODE" -eq 1 ]; then
    RUNTIME_KIND="vite-dev"
fi

{
    printf '%s mode=%s runtime=%s host=%s port=%s root=%s\n' \
        "$(date --iso-8601=seconds)" \
        "$MODE" \
        "$RUNTIME_KIND" \
        "$HOST" \
        "$PORT" \
        "$UI_ROOT"
} >> "$LAUNCH_LOG"

printf 'IST Thesis UI\n'
printf '  root:    %s\n' "$UI_ROOT"
printf '  mode:    %s\n' "$MODE"
printf '  runtime: %s\n' "$RUNTIME_KIND"
printf '  host:    %s\n' "$HOST"
printf '  port:    %s\n' "$PORT"
printf '  state:   %s\n' "$STATE_ROOT"
printf '\n'

if [ "$DEV_MODE" -eq 1 ]; then
    VITE_ENTRY="$UI_ROOT/node_modules/vite/bin/vite.js"

    if [ ! -f "$VITE_ENTRY" ]; then
        printf 'ERROR: Vite is not installed at %s\n' "$VITE_ENTRY" >&2
        printf 'Run this launcher once with --install.\n' >&2
        exit 3
    fi

    export VITE_DASHBOARD_DATA_MODE="$MODE"

    exec node "$VITE_ENTRY" \
        --host "$HOST" \
        --port "$PORT"
fi

DIST_ROOT="$UI_ROOT/dist"
DIST_INDEX="$DIST_ROOT/index.html"
RUNTIME_CONFIG="$DIST_ROOT/runtime-config.js"

if [ ! -f "$DIST_INDEX" ]; then
    printf 'ERROR: prebuilt frontend is missing: %s\n' "$DIST_INDEX" >&2
    printf 'Run npm run build before field use.\n' >&2
    exit 4
fi

if ! command -v python3 >/dev/null 2>&1; then
    printf 'ERROR: python3 is required for the static frontend server\n' >&2
    exit 4
fi

RUNTIME_API="${VITE_DASHBOARD_API_BASE_URL:-}"
RUNTIME_WS="${VITE_DASHBOARD_WS_URL:-}"

python3 - "$MODE" "$RUNTIME_API" "$RUNTIME_WS" "$RUNTIME_CONFIG" <<'PY_RUNTIME'
import json
import sys
from pathlib import Path

mode, api_url, ws_url, output_path = sys.argv[1:]

config = {"mode": mode}

if api_url:
    config["apiBaseUrl"] = api_url

if ws_url:
    config["wsUrl"] = ws_url

payload = (
    "window.__IST_THESIS_DASHBOARD_CONFIG__ = "
    + json.dumps(config, separators=(",", ":"))
    + ";\n"
)

Path(output_path).write_text(payload, encoding="utf-8")
PY_RUNTIME

printf '  dist:    %s\n' "$DIST_ROOT"
printf '  config:  %s\n' "$RUNTIME_CONFIG"
printf '\n'

exec python3 -m http.server "$PORT" \
    --bind "$HOST" \
    --directory "$DIST_ROOT"
