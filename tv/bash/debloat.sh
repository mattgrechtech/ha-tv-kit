#!/usr/bin/env bash
# ha-tv-kit · disable pre-installed apps on an Android/Google TV (reversible).
# Usage:
#   ./debloat.sh 192.168.1.60 living-room ../packages/examples/tcl-google-tv.txt          # dry run
#   ./debloat.sh 192.168.1.60 living-room ../packages/examples/tcl-google-tv.txt --apply  # do it
#
# Uses `pm disable-user` (the app stays installed; restore.sh re-enables it). Never uninstalls.
# Refuses anything matching tv/packages/never-disable.txt. Skips packages your TV doesn't have.
# Build your list from YOUR TV's package list (tv/backups/<name>/packages-before.txt), not just an example.
set -euo pipefail
. "$(dirname "$0")/common.sh"
[ $# -ge 3 ] || usage_tv_name "<list-file> [--apply]"
t="$(tv_target "$1")"; connect_tv "$t"; dir="$(backup_dir "$2")"; list="$3"; apply="${4:-}"
assert_backup "$dir"

enabled="$(tv_shell "$t" "pm list packages -e" | sed 's/^package://')"
never="$(read_list "$KIT_TV_DIR/packages/never-disable.txt")"
plan=()
while IFS= read -r p; do
  hit=""
  while IFS= read -r n; do [ -n "$n" ] || continue; case "$p" in *"$n"*) hit="$n"; break ;; esac; done <<< "$never"
  if [ -n "$hit" ]; then echo "REFUSED  $p  (protected: matches '$hit')"; continue; fi
  if ! grep -qxF "$p" <<< "$enabled"; then echo "skip     $p  (not installed, or already disabled)"; continue; fi
  echo "disable  $p"; plan+=("$p")
done < <(read_list "$list")

if [ "$apply" != "--apply" ]; then echo; echo "Dry run: nothing changed. ${#plan[@]} package(s) would be disabled. Re-run with --apply."; exit 0; fi

for p in ${plan[@]+"${plan[@]}"}; do
  out="$(tv_shell "$t" "pm disable-user --user 0 $p")"
  case "$out" in *disabled*) add_unique_line "$dir/disabled-by-kit.txt" "$p"; echo "ok       $p" ;; *) echo "FAILED   $p  ($out)" ;; esac
done
echo
echo "Done. Restart the TV (adb -s $t reboot), then check: it boots, inputs/HDMI work, the remote's voice button works, casting works."
echo "Undo with: ./restore.sh $1 $2"
