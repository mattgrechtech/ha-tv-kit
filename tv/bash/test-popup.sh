#!/usr/bin/env bash
# ha-tv-kit · send a test pop-up to a TV.
# Usage:
#   ./test-popup.sh 192.168.1.60 ["Hello"]           # port 5001: TV Kiosk's TvOverlay-compatible mode, or TvOverlay (no token)
#   TV_KIOSK_TOKEN=<token> ./test-popup.sh 192.168.1.60  # port 2424: TV Kiosk's API with its token
# The token is read from the environment so it doesn't land in your shell history as an argument.
set -euo pipefail
[ $# -ge 1 ] || { echo "Usage: $0 <tv-ip> [message]" >&2; exit 2; }
msg="${2:-Pop-ups work}"
msg="${msg//\\/\\\\}"; msg="${msg//\"/\\\"}"
body="{\"title\":\"ha-tv-kit test\",\"message\":\"$msg\",\"smallIcon\":\"mdi:television\",\"corner\":\"top_end\",\"duration\":10}"
if [ -n "${TV_KIOSK_TOKEN:-}" ]; then
  url="http://$1:2424/api/v1/notify"
  hint="Is TV Kiosk running, is the token current, and is the API port still 2424 (its Settings)?"
  auth=(-H "Authorization: Bearer $TV_KIOSK_TOKEN")
else
  url="http://$1:5001/notify"
  hint="Is TV Kiosk's TvOverlay-compatible mode on (or TvOverlay installed and opened once), and allowed to draw over apps (tweaks.sh ... tv-kiosk / tvoverlay)?"
  auth=()
fi
if curl -fsS -m 8 -X POST "$url" -H 'Content-Type: application/json' ${auth[@]+"${auth[@]}"} -d "$body" >/dev/null; then
  echo "Sent. Look at the TV's top-right corner."
else
  echo "No answer from $url. $hint" >&2
  exit 1
fi
