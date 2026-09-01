#!/usr/bin/env bash

set +u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MODE="${VITE_DASHBOARD_DATA_MODE:-backend}"
HOST="${DASHBOARD_UI_HOST:-127.0.0.1}"
PORT="${DASHBOARD_UI_PORT:-5173}"
INSTALL=0

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
  -h, --help      Show this help

Environment:
  VITE_DASHBOARD_DATA_MODE
  DASHBOARD_UI_HOST
  DASHBOARD_UI_PORT
  XDG_STATE_HOME
  VITE_DASHBOARD_API_BASE_URL
  VITE_DASHBOARD_WS_URL

The launcher runs the actual Vite Node process in the foreground. It does not
background npm or create repository-root runtime logs. For field access, select
an explicitly approved bind host such as 0.0.0.0 only when required.
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

VITE_ENTRY="$UI_ROOT/node_modules/vite/bin/vite.js"

if [ ! -f "$VITE_ENTRY" ]; then
    printf 'ERROR: Vite is not installed at %s\n' "$VITE_ENTRY" >&2
    printf 'Run this launcher once with --install.\n' >&2
    exit 3
fi

mkdir -p "$LOG_DIR" || exit 1

export VITE_DASHBOARD_DATA_MODE="$MODE"

{
    printf '%s mode=%s host=%s port=%s root=%s\n' \
        "$(date --iso-8601=seconds)" \
        "$MODE" \
        "$HOST" \
        "$PORT" \
        "$UI_ROOT"
} >> "$LAUNCH_LOG"

printf 'IST Thesis UI\n'
printf '  root:  %s\n' "$UI_ROOT"
printf '  mode:  %s\n' "$MODE"
printf '  host:  %s\n' "$HOST"
printf '  port:  %s\n' "$PORT"
printf '  state: %s\n' "$STATE_ROOT"
printf '\n'

exec node "$VITE_ENTRY" \
    --host "$HOST" \
    --port "$PORT"
