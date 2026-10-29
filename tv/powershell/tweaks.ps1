# ha-tv-kit · optional TV tweaks. Each switch is independent; run backup.ps1 first so restore.ps1 can undo them.
# Examples:
#   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -FasterAnimations
#   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -TvOverlay
#   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -AerialViews -PhotosFolder C:\Pictures\TV
#   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -BackgroundApp org.smarttube.stable
#   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -PrivateDns dns.example-filter.com -SleepMinutes 60
# Install apps (TvOverlay, Aerial Views, ...) from the Play Store on the TV first: these switches only
# configure apps that are already installed.
param(
  [Parameter(Mandatory)][string]$Tv,
  [Parameter(Mandatory)][string]$Name,
  [switch]$FasterAnimations,      # animations at 0.5x: the UI feels much snappier on slow TVs
  [string]$PrivateDns,            # a DNS-over-TLS hostname (e.g. an ad-blocking DNS provider)
  [switch]$TvOverlay,             # lets TvOverlay draw pop-ups over other apps
  [switch]$AerialViews,           # sets Aerial Views as the screensaver
  [string]$PhotosFolder,          # with -AerialViews: copies these photos/videos to the TV for the screensaver
  [string]$BackgroundApp,         # keeps an app (e.g. SmartTube) playing behind the screensaver
  [int]$SleepMinutes              # minutes after the screensaver starts before the TV sleeps
)
. "$PSScriptRoot\common.ps1"
$t = Get-TvTarget $Tv
Connect-Tv $t
$dir = Get-BackupDir $Name
Assert-Backup $dir
$installed = (Invoke-TvShell $t 'pm list packages') -split "`r?`n" | ForEach-Object { ($_ -replace '^package:', '').Trim() }
function Need([string]$pkg, [string]$what) {
  if ($installed -notcontains $pkg) { Write-Host "$what ($pkg) isn't installed. Install it from the Play Store on the TV, open it once, then re-run." -ForegroundColor Yellow; return $false }
  $true
}
function Grant-Overlay([string]$pkg) {
  Invoke-TvShell $t "appops set $pkg SYSTEM_ALERT_WINDOW allow" | Out-Null
  Add-UniqueLine (Join-Path $dir 'appops-by-kit.txt') $pkg
}

if ($FasterAnimations) {
  foreach ($k in 'window_animation_scale', 'transition_animation_scale', 'animator_duration_scale') { Invoke-TvShell $t "settings put global $k 0.5" | Out-Null }
  Write-Host 'Animations set to 0.5x.' -ForegroundColor Green
}
if ($PrivateDns) {
  Invoke-TvShell $t 'settings put global private_dns_mode hostname' | Out-Null
  Invoke-TvShell $t "settings put global private_dns_specifier $PrivateDns" | Out-Null
  Write-Host "Private DNS set to $PrivateDns. If apps stop loading, the hostname is wrong: run restore.ps1." -ForegroundColor Green
}
if ($TvOverlay -and (Need 'com.tabdeveloper.tvoverlay' 'TvOverlay')) {
  Grant-Overlay 'com.tabdeveloper.tvoverlay'
  Write-Host 'TvOverlay may now draw over other apps. Test it with test-popup.ps1.' -ForegroundColor Green
}
if ($AerialViews -and (Need 'com.neilturner.aerialviews' 'Aerial Views')) {
  foreach ($perm in 'android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO', 'android.permission.READ_EXTERNAL_STORAGE') {
    Invoke-TvShell $t "pm grant com.neilturner.aerialviews $perm" | Out-Null   # the ones your Android version lacks fail quietly
  }
  if ($PhotosFolder) {
    Invoke-TvShell $t 'mkdir -p /sdcard/Pictures/Screensaver' | Out-Null
    Get-ChildItem $PhotosFolder -File | Where-Object { $_.Extension -match '^\.(jpe?g|png|webp|mp4|mov|mkv)$' } | ForEach-Object {
      adb -s $t push $_.FullName "/sdcard/Pictures/Screensaver/$($_.Name)" | Out-Null; Write-Host "pushed   $($_.Name)"
    }
    Invoke-TvShell $t 'content call --uri content://media --method scan_volume --arg external_primary' | Out-Null
  }
  Invoke-TvShell $t 'settings put secure screensaver_enabled 1' | Out-Null
  Invoke-TvShell $t 'settings put secure screensaver_components com.neilturner.aerialviews/.ui.screensaver.DreamActivity' | Out-Null
  Write-Host 'Aerial Views is the screensaver. In the app, choose your sources (e.g. "local media" for your photos).' -ForegroundColor Green
}
if ($BackgroundApp -and (Need $BackgroundApp $BackgroundApp)) {
  Grant-Overlay $BackgroundApp
  Invoke-TvShell $t "dumpsys deviceidle whitelist +$BackgroundApp" | Out-Null
  # Android 12+ freezes cached background apps a moment after the screensaver starts; this stops that.
  Invoke-TvShell $t 'settings put global cached_apps_freezer disabled' | Out-Null
  Write-Host "$BackgroundApp may keep playing behind other apps. Restart the TV for the freezer change: adb -s $t reboot" -ForegroundColor Green
}
if ($SleepMinutes -gt 0) {
  Invoke-TvShell $t "settings put secure sleep_timeout $($SleepMinutes * 60000)" | Out-Null
  Write-Host "The TV sleeps $SleepMinutes minutes after the screensaver starts." -ForegroundColor Green
}
