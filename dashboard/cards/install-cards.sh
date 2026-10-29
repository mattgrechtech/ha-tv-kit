#!/bin/sh
# ha-tv-kit · install Mushroom, Bubble Card, ApexCharts card and Kiosk Mode without HACS,
# then register them as dashboard resources. Paste into the Home Assistant "Terminal & SSH" app.
# Re-running is safe: files are overwritten and resources are de-duplicated.
# With HACS (or the built-in community store) you can install the same cards from the UI instead.
#
# What it does: downloads each card from its project's latest GitHub release, stops Home Assistant
# Core briefly, backs up /config/.storage/lovelace_resources, adds the four resources, starts Core.
set -u
D=/config/www/community
get() { mkdir -p "$D/$1" && wget -q -O "$D/$1/$2" "$3" && echo "ok   $1/$2 ($(wc -c < "$D/$1/$2") bytes)" || echo "FAIL $1/$2"; }
get mushroom        mushroom.js        https://github.com/piitaya/lovelace-mushroom/releases/latest/download/mushroom.js
get bubble-card     bubble-card.js     https://github.com/Clooos/Bubble-Card/releases/latest/download/bubble-card.js
get apexcharts-card apexcharts-card.js https://github.com/RomRider/apexcharts-card/releases/latest/download/apexcharts-card.js
get kiosk-mode      kiosk-mode.js      https://github.com/NemesisRE/kiosk-mode/releases/latest/download/kiosk-mode.js

R=/config/.storage/lovelace_resources
ha core stop
[ -f "$R" ] || echo '{"version":1,"minor_version":1,"key":"lovelace_resources","data":{"items":[]}}' > "$R"
cp "$R" "$R.bak-$(date +%Y%m%d%H%M)"
jq --argjson new '[
  {"id":"mushroom","url":"/local/community/mushroom/mushroom.js?v=1","type":"module"},
  {"id":"bubble_card","url":"/local/community/bubble-card/bubble-card.js?v=1","type":"module"},
  {"id":"apexcharts_card","url":"/local/community/apexcharts-card/apexcharts-card.js?v=1","type":"module"},
  {"id":"kiosk_mode","url":"/local/community/kiosk-mode/kiosk-mode.js?v=1","type":"module"}
]' '.data.items = ((.data.items + $new) | unique_by(.id))' "$R" > /tmp/res.json && cp /tmp/res.json "$R"
ha core start
echo "=== resources ==="; jq -r '.data.items[] | .url' "$R"
echo "Hard-refresh your browser (Ctrl+F5) to load the new cards."
