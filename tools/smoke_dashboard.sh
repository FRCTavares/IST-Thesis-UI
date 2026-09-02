#!/usr/bin/env bash

set +u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

PORT="$(
  python3 - <<'PY'
import socket

sock = socket.socket()
sock.bind(("127.0.0.1", 0))
print(sock.getsockname()[1])
sock.close()
PY
)"

LOG_FILE="$(mktemp)"
PID=""

cleanup() {
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    kill -TERM -- "-$PID" 2>/dev/null || true
    wait "$PID" 2>/dev/null || true
  fi

  rm -f "$LOG_FILE"
}

trap cleanup EXIT INT TERM

setsid ./tools/start_dashboard.sh \
  --mode offline \
  --host 127.0.0.1 \
  --port "$PORT" \
  >"$LOG_FILE" 2>&1 &

PID=$!

READY=0

for _ in $(seq 1 80); do
  if python3 - "$PORT" <<'PY' >/dev/null 2>&1
import sys
from urllib.request import urlopen

port = int(sys.argv[1])

with urlopen(
    f"http://127.0.0.1:{port}/",
    timeout=0.5,
) as response:
    body = response.read().decode("utf-8")

if response.status != 200:
    raise SystemExit(1)

if '<div id="root"></div>' not in body:
    raise SystemExit(1)
PY
  then
    READY=1
    break
  fi

  if ! kill -0 "$PID" 2>/dev/null; then
    break
  fi

  sleep 0.1
done

if [ "$READY" -ne 1 ]; then
  printf 'ERROR: production dashboard smoke did not become ready\n' >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

printf 'Production dashboard HTTP smoke PASS on port %s\n' "$PORT"

kill -TERM -- "-$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
PID=""

sleep 0.2

python3 - "$PORT" <<'PY'
import socket
import sys

port = int(sys.argv[1])

sock = socket.socket()
sock.settimeout(0.5)
status = sock.connect_ex(("127.0.0.1", port))
sock.close()

if status == 0:
    raise SystemExit(
        "dashboard listener survived deterministic shutdown"
    )

print("Dashboard shutdown smoke PASS")
PY
