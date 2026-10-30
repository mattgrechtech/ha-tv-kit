#!/usr/bin/env bash
# ha-tv-kit · optional TV tweaks. Run backup.sh first so restore.sh can undo them.
# Every run is a dry run (it prints the adb commands) until you add --apply.
# Usage:  ./tweaks.sh <tv-ip> <name> <tweak> [argument] [--apply]
#   faster-animations              animations at 0.5x (snappier UI on slow TVs)
#   private-dns <hostname>         DNS-over-TLS hostname (e.g. an ad-blocking DNS provider)
#   tv-kiosk                       lets TV Kiosk draw pop-ups over other apps and keep running
#   tvoverlay                      lets TvOverlay draw pop-ups over other apps (if you use it instead of TV Kiosk)
#   aerial-views [photos-folder]   Aerial Views as the screensaver; optionally copies your photos/videos to the TV
#   background-app <package>       keeps an app (e.g. org.smarttube.stable) playing behind the screensaver
#   sleep-minutes <n>              minutes after the screensaver starts before the TV sleeps
# Install apps on the TV first: these tweaks only configure apps already installed.
set -euo pipefail
. "$(dirname "$0")/common.sh"
apply=""; args=()
for a in "$@"; do if [ "$a" = "--apply" ]; then apply=1; else args+=("$a"); fi; done
set -- ${args[@]+"${args[@]}"}
[ $# -ge 3 ] || usage_tv_name "<tweak> [argument] [--apply]"
t="$(tv_target "$1")"; connect_tv "$t"; dir="$(backup_dir "$2")"; tweak="$3"; arg="${4:-}"
assert_backup "$dir"
installed="$(tv_shell "$t" "pm list packages" | sed 's/^package://')"
need() { grep -qxF "$1" <<< "$installed" || { echo "$1 isn't installed. Install it on the TV, open it once, then re-run." >&2; exit 1; }; }
# Runs an adb shell command, or only prints it in a dry run.
run() { if [ -n "$apply" ]; then tv_shell "$t" "$1" >/dev/null || true; else echo "would run: adb shell $1"; fi; }
done_msg() { [ -z "$apply" ] || echo "$1"; }
# Overlay permission and battery-optimisation exemption; restore.sh resets both.
grant_background() {
  run "appops set $1 SYSTEM_ALERT_WINDOW allow"
  run "dumpsys deviceidle whitelist +$1"
  [ -z "$apply" ] || add_unique_line "$dir/appops-by-kit.txt" "$1"
}

case "$tweak" in
  faster-animations)
    for k in window_animation_scale transition_animation_scale animator_duration_scale; do run "settings put global $k 0.5"; done
    done_msg "Animations set to 0.5x." ;;
  private-dns)
    [ -n "$arg" ] || { echo "Give a DNS-over-TLS hostname." >&2; exit 2; }
    run "settings put global private_dns_mode hostname"
    run "settings put global private_dns_specifier $arg"
    done_msg "Private DNS set to $arg. If apps stop loading, the hostname is wrong: run restore.sh." ;;
  tv-kiosk)
    kiosk=""
    for p in $TV_KIOSK_PACKAGES; do if grep -qxF "$p" <<< "$installed"; then kiosk="$p"; break; fi; done
    [ -n "$kiosk" ] || { echo "TV Kiosk isn't installed. Install it first: https://github.com/mattgrechtech/ha-tv-kiosk" >&2; exit 1; }
    grant_background "$kiosk"
    done_msg "TV Kiosk may now draw pop-ups over other apps and keep its service running." ;;
  tvoverlay)
    need com.tabdeveloper.tvoverlay; grant_background com.tabdeveloper.tvoverlay
    done_msg "TvOverlay may now draw over other apps. Test it with test-popup.sh." ;;
  aerial-views)
    need com.neilturner.aerialviews
    for perm in READ_MEDIA_IMAGES READ_MEDIA_VIDEO READ_EXTERNAL_STORAGE; do
      run "pm grant com.neilturner.aerialviews android.permission.$perm"   # missing ones fail quietly
    done
    if [ -n "$arg" ]; then
      run "mkdir -p /sdcard/Pictures/Screensaver"
      find "$arg" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.mp4' -o -iname '*.mov' -o -iname '*.mkv' \) -print0 |
        while IFS= read -r -d '' f; do
          if [ -n "$apply" ]; then adb -s "$t" push "$f" "/sdcard/Pictures/Screensaver/$(basename "$f")" >/dev/null && echo "pushed   $(basename "$f")"
          else echo "would push: $(basename "$f") -> /sdcard/Pictures/Screensaver/"; fi
        done
      run "content call --uri content://media --method scan_volume --arg external_primary"
    fi
    run "settings put secure screensaver_enabled 1"
    run "settings put secure screensaver_components com.neilturner.aerialviews/.ui.screensaver.DreamActivity"
    done_msg "Aerial Views is the screensaver. In the app, choose your sources (e.g. \"local media\" for your photos)." ;;
  background-app)
    [ -n "$arg" ] || { echo "Give the app's package name." >&2; exit 2; }
    need "$arg"; grant_background "$arg"
    # Android 12+ freezes cached background apps a moment after the screensaver starts; this stops that.
    run "settings put global cached_apps_freezer disabled"
    done_msg "$arg may keep playing behind other apps. Restart the TV for the freezer change: adb -s $t reboot" ;;
  sleep-minutes)
    [ -n "$arg" ] || { echo "Give a number of minutes." >&2; exit 2; }
    run "settings put secure sleep_timeout $((arg * 60000))"
    done_msg "The TV sleeps $arg minutes after the screensaver starts." ;;
  *) echo "Unknown tweak '$tweak'. See the comments at the top of this script." >&2; exit 2 ;;
esac

if [ -z "$apply" ]; then echo; echo "Dry run: nothing changed. Re-run with --apply."
else echo "Undo with: ./restore.sh $1 $2"; fi
