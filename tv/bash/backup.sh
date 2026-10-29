#!/usr/bin/env bash
# ha-tv-kit · back up a TV's package list and settings before changing anything.
# Usage:  ./backup.sh 192.168.1.60 living-room
# Writes tv/backups/<name>/ (git-ignored: it describes your device). The FIRST backup is the one
# restore.sh uses; later runs are saved with a timestamp and never overwrite it.
set -euo pipefail
. "$(dirname "$0")/common.sh"
[ $# -eq 2 ] || usage_tv_name ""
t="$(tv_target "$1")"; connect_tv "$t"; dir="$(backup_dir "$2")"
if [ -f "$dir/settings-before.txt" ]; then suffix="-$(date +%Y%m%d-%H%M%S)"; else suffix="-before"; fi

for p in ro.product.manufacturer ro.product.model ro.build.version.release ro.product.cpu.abilist; do
  echo "$p=$(tv_shell "$t" "getprop $p")"
done > "$dir/device$suffix.txt"
tv_shell "$t" "pm list packages" | sed 's/^package://' | sort > "$dir/packages$suffix.txt"
tv_shell "$t" "pm list packages -d" | sed 's/^package://' | grep -v '^$' | sort > "$dir/disabled$suffix.txt" || true
for k in $SETTING_KEYS; do
  ns="${k%%:*}"; key="${k#*:}"
  printf '%s\t%s\t%s\n' "$ns" "$key" "$(tv_shell "$t" "settings get $ns $key")"
done > "$dir/settings$suffix.txt"

cat "$dir/device$suffix.txt"
echo "Backup saved to $dir (files *$suffix.txt)."
