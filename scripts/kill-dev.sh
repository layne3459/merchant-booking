#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-all}"
ROOT="merchant-booking"

kill_by_patterns() {
  local patterns=("$@")
  local pids
  pids=$(ps aux 2>/dev/null | grep "$ROOT" | grep -E "$(IFS='|'; echo "${patterns[*]}")" | grep -v grep | awk '{print $2}' || true)
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
}

if [ "$TARGET" = "api" ] || [ "$TARGET" = "all" ]; then
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k 3000/tcp 2>/dev/null || true
  fi
  kill_by_patterns "dev:api" "@merchant-booking/api dev" "nest start --watch"
fi

if [ "$TARGET" = "mini" ] || [ "$TARGET" = "all" ]; then
  kill_by_patterns "dev:mini" "dev:mp-weixin" "@merchant-booking/mini dev" "uni -p mp-weixin"
fi

sleep 0.5
