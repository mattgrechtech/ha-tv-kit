#!/usr/bin/env bash
# ha-tv-kit · optional TV tweaks. Run backup.sh first so restore.sh can undo them.
# Usage:  ./tweaks.sh <tv-ip> <name> <tweak> [argument]
#   faster-animations              animations at 0.5x (snappier UI on slow TVs)
#   private-dns <hostname>         DNS-over-TLS hostname (e.g. an ad-blocking DNS provider)
#   tvoverlay                      lets TvOverlay draw pop-ups over other apps
#   aerial-views [photos-folder]   Aerial Views as the screensaver; optionally copies your photos/videos to the TV
#   background-app <package>       keeps an app (e.g. org.smarttube.stable) playing behind the screensaver
#   sleep-minutes <n>              minutes after the screensaver starts before the TV sleeps
# Install apps from the Play Store on the TV first: these tweaks only configure apps already installed.
set -euo pipefail
. "$(dirname "$0")/common.sh"
[ $# -ge 3 ] || usage_tv_name "<tweak> [argument]"
t="$(tv_target "$1")"; connect_tv "$t"; dir="$(backup_dir "$2")"; tweak="$3"; arg="${4:-}"
assert_backup "$dir"
installed="$(tv_shell "$t" "pm list packages" | sed 's/^package://')"
need() { grep -qxF "$1" <<< "$installed" || { echo "$1 isn't installed. Install it from the Play Store on the TV, open it once, then re-run." >&2; exit 1; }; }
grant_overlay() { tv_shell "$t" "appops set $1 SYSTEM_ALERT_WINDOW allow" >/dev/null; add_unique_line "$dir/appops-by-kit.txt" "$1"; }

case "$tweak" in
  faster-animations)
    for k in window_animation_scale transition_animation_scale animator_duration_scale; do tv_shell "$t" "settings put global $k 0.5" >/dev/null; done
    echo "Animations set to 0.5x." ;;
  private-dns)
    [ -n "$arg" ] || { echo "Give a DNS-over-TLS hostname." >&2; exit 2; }
    tv_shell "$t" "settings put global private_dns_mode hostname" >/dev/null
    tv_shell "$t" "settings put global private_dns_specifier $arg" >/dev/null
    echo "Private DNS set to $arg. If apps stop loading, the hostname is wrong: run restore.sh." ;;
  tvoverlay)
    need com.tabdeveloper.tvoverlay; grant_overlay com.tabdeveloper.tvoverlay
    echo "TvOverlay may now draw over other apps. Test it with test-popup.sh." ;;
  aerial-views)
    need com.neilturner.aerialviews
    for perm in READ_MEDIA_IMAGES READ_MEDIA_VIDEO READ_EXTERNAL_STORAGE; do
      tv_shell "$t" "pm grant com.neilturner.aerialviews android.permission.$perm" >/dev/null || true   # missing ones fail quietly
    done
    if [ -n "$arg" ]; then
      tv_shell "$t" "mkdir -p /sdcard/Pictures/Screensaver" >/dev/null
      find "$arg" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.mp4' -o -iname '*.mov' -o -iname '*.mkv' \) -print0 |
        while IFS= read -r -d '' f; do adb -s "$t" push "$f" "/sdcard/Pictures/Screensaver/$(basename "$f")" >/dev/null && echo "pushed   $(basename "$f")"; done
      tv_shell "$t" "content call --uri content://media --method scan_volume --arg external_primary" >/dev/null
    fi
    tv_shell "$t" "settings put secure screensaver_enabled 1" >/dev/null
    tv_shell "$t" "settings put secure screensaver_components com.neilturner.aerialviews/.ui.screensaver.DreamActivity" >/dev/null
    echo "Aerial Views is the screensaver. In the app, choose your sources (e.g. \"local media\" for your photos)." ;;
  background-app)
    [ -n "$arg" ] || { echo "Give the app's package name." >&2; exit 2; }
    need "$arg"; grant_overlay "$arg"
    tv_shell "$t" "dumpsys deviceidle whitelist +$arg" >/dev/null
    # Android 12+ freezes cached background apps a moment after the screensaver starts; this stops that.
    tv_shell "$t" "settings put global cached_apps_freezer disabled" >/dev/null
    echo "$arg may keep playing behind other apps. Restart the TV for the freezer change: adb -s $t reboot" ;;
  sleep-minutes)
    [ -n "$arg" ] || { echo "Give a number of minutes." >&2; exit 2; }
    tv_shell "$t" "settings put secure sleep_timeout $((arg * 60000))" >/dev/null
    echo "The TV sleeps $arg minutes after the screensaver starts." ;;
  *) echo "Unknown tweak '$tweak'. See the comments at the top of this script." >&2; exit 2 ;;
esac
