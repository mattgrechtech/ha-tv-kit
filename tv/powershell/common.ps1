# ha-tv-kit · shared helpers for the TV scripts (dot-sourced; don't run directly).
# Needs adb (Android SDK Platform-Tools) on PATH: https://developer.android.com/tools/releases/platform-tools

# Settings the kit may change. backup.ps1 snapshots them; restore.ps1 puts them back.
$script:SettingKeys = @(
  'global window_animation_scale', 'global transition_animation_scale', 'global animator_duration_scale',
  'global private_dns_mode', 'global private_dns_specifier', 'global cached_apps_freezer',
  'secure sleep_timeout', 'secure screensaver_enabled', 'secure screensaver_components', 'secure screensaver_activate_on_sleep',
  'system screen_off_timeout'
)

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
  Write-Host 'adb not found. Install Android SDK Platform-Tools and add the folder to PATH.' -ForegroundColor Red
  exit 1
}

function Get-TvTarget([string]$Tv) { if ($Tv -match ':\d+$') { $Tv } else { "${Tv}:5555" } }

function Connect-Tv([string]$Target) {
  adb connect $Target | Out-Host
  $state = (adb -s $Target get-state 2>$null | Out-String).Trim()
  if ($state -ne 'device') {
    Write-Host "TV $Target is not ready (state: '$state')." -ForegroundColor Yellow
    Write-Host "On the TV, accept 'Allow USB debugging?' and tick 'Always allow', then run this again." -ForegroundColor Yellow
    exit 1
  }
}

function Invoke-TvShell([string]$Target, [string]$Command) {
  (adb -s $Target shell $Command 2>&1 | Out-String).Trim()
}

function Get-BackupDir([string]$Name) {
  if ($Name -notmatch '^[A-Za-z0-9_-]+$') { Write-Host 'Use letters, numbers, - or _ for -Name (e.g. living-room).' -ForegroundColor Red; exit 1 }
  $d = Join-Path (Split-Path $PSScriptRoot -Parent) "backups\$Name"
  New-Item -ItemType Directory -Force $d | Out-Null
  (Resolve-Path $d).Path
}

function Assert-Backup([string]$Dir) {
  if (-not (Test-Path (Join-Path $Dir 'settings-before.txt'))) {
    Write-Host "No backup in $Dir yet. Run backup.ps1 for this TV first." -ForegroundColor Red
    exit 1
  }
}

# One package per line; '#' starts a comment.
function Read-PackageList([string]$Path) {
  Get-Content $Path | ForEach-Object { ($_ -replace '#.*$', '').Trim() } | Where-Object { $_ }
}

# Write UTF-8 without a BOM so the bash scripts can read the same backup files.
function Write-Lines([string]$Path, [string[]]$Lines) {
  if ($null -eq $Lines) { $Lines = @() }
  [IO.File]::WriteAllLines($Path, [string[]]$Lines)
}

# TV Kiosk (https://github.com/mattgrechtech/ha-tv-kiosk): release build, then the debug build developers install.
$script:TvKioskPackages = @('io.github.mattgrechtech.tvkiosk', 'io.github.mattgrechtech.tvkiosk.debug')

function Get-Packages([string]$Target, [string]$Flags = '') {
  (Invoke-TvShell $Target "pm list packages $Flags") -split "`r?`n" | ForEach-Object { ($_ -replace '^package:', '').Trim() } | Where-Object { $_ }
}

function Add-UniqueLine([string]$Path, [string]$Line) {
  $existing = if (Test-Path $Path) { @(Get-Content $Path) } else { @() }
  if ($existing -notcontains $Line) { Write-Lines $Path (@($existing) + $Line) }
}
