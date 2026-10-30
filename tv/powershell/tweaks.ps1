# ha-tv-kit · optional TV tweaks. Each switch is independent; run backup.ps1 first so restore.ps1 can undo them.
# Every run is a dry run (it prints the adb commands) until you add -Apply.
# Examples:
#   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -FasterAnimations              # dry run
#   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -FasterAnimations -Apply       # do it
#   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -TvKiosk -Apply
#   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -AerialViews -PhotosFolder C:\Pictures\TV -Apply
#   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -BackgroundApp org.smarttube.stable -Apply
#   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -PrivateDns dns.example-filter.com -SleepMinutes 60 -Apply
# Install apps (TV Kiosk, Aerial Views, ...) on the TV first: these switches only configure apps that are
# already installed.
param(
  [Parameter(Mandatory)][string]$Tv,
  [Parameter(Mandatory)][string]$Name,
  [switch]$FasterAnimations,      # animations at 0.5x: the UI feels much snappier on slow TVs
  [string]$PrivateDns,            # a DNS-over-TLS hostname (e.g. an ad-blocking DNS provider)
  [switch]$TvKiosk,               # lets TV Kiosk draw pop-ups over other apps and keep running
  [switch]$TvOverlay,             # lets TvOverlay draw pop-ups over other apps (if you use it instead of TV Kiosk)
  [switch]$AerialViews,           # sets Aerial Views as the screensaver
  [string]$PhotosFolder,          # with -AerialViews: copies these photos/videos to the TV for the screensaver
  [string]$BackgroundApp,         # keeps an app (e.g. SmartTube) playing behind the screensaver
  [int]$SleepMinutes,             # minutes after the screensaver starts before the TV sleeps
  [switch]$Apply                  # without it, nothing on the TV changes
)
. "$PSScriptRoot\common.ps1"
$t = Get-TvTarget $Tv
Connect-Tv $t
$dir = Get-BackupDir $Name
Assert-Backup $dir
$installed = Get-Packages $t
$script:skipped = $false

function Need([string]$pkg, [string]$what) {
  if ($installed -notcontains $pkg) { Write-Host "$what ($pkg) isn't installed. Install it on the TV, open it once, then re-run." -ForegroundColor Yellow; $script:skipped = $true; return $false }
  $true
}
# Runs an adb shell command, or only prints it in a dry run.
function Run([string]$cmd) {
  if ($Apply) { Invoke-TvShell $t $cmd | Out-Null } else { Write-Host "would run: adb shell $cmd" -ForegroundColor DarkGray }
}
function Done([string]$msg) { if ($Apply) { Write-Host $msg -ForegroundColor Green } }
# Overlay permission and battery-optimisation exemption; restore.ps1 resets both.
function Grant-Background([string]$pkg) {
  Run "appops set $pkg SYSTEM_ALERT_WINDOW allow"
  Run "dumpsys deviceidle whitelist +$pkg"
  if ($Apply) { Add-UniqueLine (Join-Path $dir 'appops-by-kit.txt') $pkg }
}

if ($FasterAnimations) {
  foreach ($k in 'window_animation_scale', 'transition_animation_scale', 'animator_duration_scale') { Run "settings put global $k 0.5" }
  Done 'Animations set to 0.5x.'
}
if ($PrivateDns) {
  Run 'settings put global private_dns_mode hostname'
  Run "settings put global private_dns_specifier $PrivateDns"
  Done "Private DNS set to $PrivateDns. If apps stop loading, the hostname is wrong: run restore.ps1."
}
if ($TvKiosk) {
  $kiosk = $TvKioskPackages | Where-Object { $installed -contains $_ } | Select-Object -First 1
  if (-not $kiosk) { Write-Host "TV Kiosk isn't installed. Install it first: https://github.com/mattgrechtech/ha-tv-kiosk" -ForegroundColor Yellow; $script:skipped = $true }
  else {
    Grant-Background $kiosk
    Done 'TV Kiosk may now draw pop-ups over other apps and keep its service running.'
  }
}
if ($TvOverlay -and (Need 'com.tabdeveloper.tvoverlay' 'TvOverlay')) {
  Grant-Background 'com.tabdeveloper.tvoverlay'
  Done 'TvOverlay may now draw over other apps. Test it with test-popup.ps1.'
}
if ($AerialViews -and (Need 'com.neilturner.aerialviews' 'Aerial Views')) {
  foreach ($perm in 'android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO', 'android.permission.READ_EXTERNAL_STORAGE') {
    Run "pm grant com.neilturner.aerialviews $perm"   # the ones your Android version lacks fail quietly
  }
  if ($PhotosFolder) {
    Run 'mkdir -p /sdcard/Pictures/Screensaver'
    Get-ChildItem $PhotosFolder -File | Where-Object { $_.Extension -match '^\.(jpe?g|png|webp|mp4|mov|mkv)$' } | ForEach-Object {
      if ($Apply) { adb -s $t push $_.FullName "/sdcard/Pictures/Screensaver/$($_.Name)" | Out-Null; Write-Host "pushed   $($_.Name)" }
      else { Write-Host "would push: $($_.Name) -> /sdcard/Pictures/Screensaver/" -ForegroundColor DarkGray }
    }
    Run 'content call --uri content://media --method scan_volume --arg external_primary'
  }
  Run 'settings put secure screensaver_enabled 1'
  Run 'settings put secure screensaver_components com.neilturner.aerialviews/.ui.screensaver.DreamActivity'
  Done 'Aerial Views is the screensaver. In the app, choose your sources (e.g. "local media" for your photos).'
}
if ($BackgroundApp -and (Need $BackgroundApp $BackgroundApp)) {
  Grant-Background $BackgroundApp
  # Android 12+ freezes cached background apps a moment after the screensaver starts; this stops that.
  Run 'settings put global cached_apps_freezer disabled'
  Done "$BackgroundApp may keep playing behind other apps. Restart the TV for the freezer change: adb -s $t reboot"
}
if ($SleepMinutes -gt 0) {
  Run "settings put secure sleep_timeout $($SleepMinutes * 60000)"
  Done "The TV sleeps $SleepMinutes minutes after the screensaver starts."
}

if (-not $Apply) { Write-Host "`nDry run: nothing changed. Re-run with -Apply." -ForegroundColor Yellow }
elseif (-not $script:skipped) { Write-Host "Undo with: .\restore.ps1 -Tv $Tv -Name $Name" }
if ($script:skipped) { exit 1 }
