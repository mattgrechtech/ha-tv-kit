#!/usr/bin/env bash
# ha-tv-kit · show what the kit changed on a TV and whether it's still in place. Read-only: changes nothing.
# Usage:  ./status.sh 192.168.1.60 living-room
# Run it after a restart or a firmware update: updates can re-enable apps or reset permissions.
# It only reads package state and settings. It never polls audio services (`dumpsys media.audio_flinger`
# in a loop has coincided with audioserver crash loops on some TVs).
set -euo pipefail
. "$(dirname "$0")/common.sh"
[ $# -eq 2 ] || usage_tv_name ""
t="$(tv_target "$1")"; connect_tv "$t"; dir="$(backup_dir "$2")"
assert_backup "$dir"

for p in ro.product.manufacturer ro.product.model ro.build.version.release; do echo "$p=$(tv_shell "$t" "getprop $p")"; done

echo; echo "Packages the kit disabled:"
if [ -f "$dir/disabled-by-kit.txt" ]; then
  disabled="$(tv_shell "$t" "pm list packages -d" | sed 's/^package://')"
  while IFS= read -r p; do
    if grep -qxF "$p" <<< "$disabled"; then echo "  disabled  $p"
    else echo "  ENABLED   $p  (re-enabled since: run debloat again if you still want it off)"; fi
  done < <(read_list "$dir/disabled-by-kit.txt")
else echo "  none"; fi

echo; echo "Settings (now / before the kit):"
while IFS=$'\t' read -r ns key before; do
  [ -n "${key:-}" ] || continue
  before="${before%$'\r'}"
  now="$(tv_shell "$t" "settings get $ns $key")"
  mark=" "; [ "$now" = "$before" ] || mark="*"
  echo "  $mark $ns $key = $now  (was $before)"
done < "$dir/settings-before.txt"

echo; echo "Apps the kit allowed to draw over others / keep running:"
if [ -f "$dir/appops-by-kit.txt" ]; then
  whitelist="$(tv_shell "$t" "dumpsys deviceidle whitelist")"
  while IFS= read -r p; do
    idle="NOT battery-exempt"; grep -qF ",$p," <<< "$whitelist" && idle="battery-exempt"
    echo "  $p  $(tv_shell "$t" "appops get $p SYSTEM_ALERT_WINDOW")  $idle"
  done < <(read_list "$dir/appops-by-kit.txt")
else echo "  none"; fi

echo; echo "Home app:"
echo "  $(tv_shell "$t" "cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME" | tail -n 1)"
echo; echo "* = differs from the backup (expected for settings you changed with tweaks)."
