# ha-tv-kit · shared helpers for the TV scripts (sourced; don't run directly). macOS, Linux, WSL, Git Bash.
# Needs adb (Android SDK Platform-Tools) on PATH: https://developer.android.com/tools/releases/platform-tools

SETTING_KEYS="global:window_animation_scale global:transition_animation_scale global:animator_duration_scale
global:private_dns_mode global:private_dns_specifier global:cached_apps_freezer
secure:sleep_timeout secure:screensaver_enabled secure:screensaver_components secure:screensaver_activate_on_sleep
system:screen_off_timeout"

KIT_TV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

command -v adb >/dev/null 2>&1 || { echo "adb not found. Install Android SDK Platform-Tools and add it to PATH." >&2; exit 1; }

tv_target() { case "$1" in *:*) echo "$1" ;; *) echo "$1:5555" ;; esac; }

connect_tv() {
  adb connect "$1"
  local state
  state="$(adb -s "$1" get-state 2>/dev/null | tr -d '\r')"
  if [ "$state" != "device" ]; then
    echo "TV $1 is not ready (state: '$state')." >&2
    echo "On the TV, accept 'Allow USB debugging?' and tick 'Always allow', then run this again." >&2
    exit 1
  fi
}

tv_shell() { adb -s "$1" shell "$2" 2>&1 | tr -d '\r'; }

backup_dir() {
  case "$1" in *[!A-Za-z0-9_-]*|"") echo "Use letters, numbers, - or _ for the name (e.g. living-room)." >&2; exit 1 ;; esac
  mkdir -p "$KIT_TV_DIR/backups/$1"
  echo "$KIT_TV_DIR/backups/$1"
}

assert_backup() {
  [ -f "$1/settings-before.txt" ] || { echo "No backup in $1 yet. Run backup.sh for this TV first." >&2; exit 1; }
}

# One package per line; '#' starts a comment.
read_list() { sed -e 's/#.*$//' -e 's/[[:space:]]*$//' -e 's/^[[:space:]]*//' -e 's/\r$//' "$1" | grep -v '^$' || true; }

add_unique_line() { touch "$1"; grep -qxF "$2" "$1" || echo "$2" >> "$1"; }

usage_tv_name() { echo "Usage: $0 <tv-ip> <name> $1" >&2; exit 2; }
