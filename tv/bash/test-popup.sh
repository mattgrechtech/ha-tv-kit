#!/usr/bin/env bash
# ha-tv-kit · send a test pop-up to a TV running TvOverlay (port 5001, no authentication).
# Usage:  ./test-popup.sh 192.168.1.60 ["Hello"]
set -euo pipefail
[ $# -ge 1 ] || { echo "Usage: $0 <tv-ip> [message]" >&2; exit 2; }
msg="${2:-Pop-ups work}"
msg="${msg//\\/\\\\}"; msg="${msg//\"/\\\"}"
if curl -fsS -m 8 -X POST "http://$1:5001/notify" -H 'Content-Type: application/json' \
     -d "{\"title\":\"ha-tv-kit test\",\"message\":\"$msg\",\"smallIcon\":\"mdi:television\",\"corner\":\"top_end\",\"duration\":10}" >/dev/null; then
  echo "Sent. Look at the TV's top-right corner."
else
  echo "No answer from $1:5001. Is TvOverlay installed, opened once and allowed to draw over apps (tweaks.sh ... tvoverlay)?" >&2
  exit 1
fi
