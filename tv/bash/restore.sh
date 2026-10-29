#!/usr/bin/env bash
# ha-tv-kit · undo everything the kit's TV scripts changed.
# Usage:  ./restore.sh 192.168.1.60 living-room [--packages-only]
# Re-enables every package debloat.sh disabled, resets the permissions tweaks.sh granted, and puts
# every setting back to the value in settings-before.txt. Restart the TV afterwards.
set -euo pipefail
. "$(dirname "$0")/common.sh"
[ $# -ge 2 ] || usage_tv_name "[--packages-only]"
t="$(tv_target "$1")"; connect_tv "$t"; dir="$(backup_dir "$2")"
assert_backup "$dir"
stamp="$(date +%Y%m%d-%H%M%S)"

if [ -f "$dir/disabled-by-kit.txt" ]; then
  while IFS= read -r p; do echo "enable   $p  $(tv_shell "$t" "pm enable --user 0 $p")"; done < <(read_list "$dir/disabled-by-kit.txt")
  mv "$dir/disabled-by-kit.txt" "$dir/disabled-by-kit.restored-$stamp.txt"
else
  echo "No packages were disabled by the kit."
fi
[ "${3:-}" = "--packages-only" ] && exit 0

if [ -f "$dir/appops-by-kit.txt" ]; then
  while IFS= read -r p; do
    tv_shell "$t" "appops set $p SYSTEM_ALERT_WINDOW default" >/dev/null
    tv_shell "$t" "dumpsys deviceidle whitelist -$p" >/dev/null
    echo "reset    $p  (overlay permission, battery whitelist)"
  done < <(read_list "$dir/appops-by-kit.txt")
  mv "$dir/appops-by-kit.txt" "$dir/appops-by-kit.restored-$stamp.txt"
fi

while IFS=$'\t' read -r ns key value; do
  [ -n "${key:-}" ] || continue
  value="${value%$'\r'}"
  if [ -z "$value" ] || [ "$value" = "null" ]; then tv_shell "$t" "settings delete $ns $key" >/dev/null; echo "delete   $ns $key"
  else tv_shell "$t" "settings put $ns $key '$value'" >/dev/null; echo "put      $ns $key = $value"; fi
done < "$dir/settings-before.txt"
echo
echo "Restored. Restart the TV: adb -s $t reboot"
