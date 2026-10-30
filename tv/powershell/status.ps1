# ha-tv-kit · show what the kit changed on a TV and whether it's still in place. Read-only: changes nothing.
# Usage:  .\status.ps1 -Tv 192.168.1.60 -Name living-room
# Run it after a restart or a firmware update: updates can re-enable apps or reset permissions.
# It only reads package state and settings. It never polls audio services (`dumpsys media.audio_flinger`
# in a loop has coincided with audioserver crash loops on some TVs).
param(
  [Parameter(Mandatory)][string]$Tv,
  [Parameter(Mandatory)][string]$Name
)
. "$PSScriptRoot\common.ps1"
$t = Get-TvTarget $Tv
Connect-Tv $t
$dir = Get-BackupDir $Name
Assert-Backup $dir

foreach ($p in 'ro.product.manufacturer', 'ro.product.model', 'ro.build.version.release') { Write-Host "$p=$(Invoke-TvShell $t "getprop $p")" }

Write-Host "`nPackages the kit disabled:" -ForegroundColor Cyan
$log = Join-Path $dir 'disabled-by-kit.txt'
if (Test-Path $log) {
  $disabled = Get-Packages $t '-d'
  foreach ($p in Read-PackageList $log) {
    if ($disabled -contains $p) { Write-Host "  disabled  $p" } else { Write-Host "  ENABLED   $p  (re-enabled since: run debloat again if you still want it off)" -ForegroundColor Yellow }
  }
} else { Write-Host '  none' }

Write-Host "`nSettings (now / before the kit):" -ForegroundColor Cyan
foreach ($line in Get-Content (Join-Path $dir 'settings-before.txt')) {
  $ns, $key, $before = $line -split "`t", 3
  if (-not $key) { continue }
  $now = Invoke-TvShell $t "settings get $ns $key"
  $mark = if ($now -ne $before) { '*' } else { ' ' }
  Write-Host "  $mark $ns $key = $now  (was $before)"
}

Write-Host "`nApps the kit allowed to draw over others / keep running:" -ForegroundColor Cyan
$apps = Join-Path $dir 'appops-by-kit.txt'
if (Test-Path $apps) {
  $whitelist = Invoke-TvShell $t 'dumpsys deviceidle whitelist'
  foreach ($p in Read-PackageList $apps) {
    $overlay = Invoke-TvShell $t "appops get $p SYSTEM_ALERT_WINDOW"
    $idle = if ($whitelist -match [regex]::Escape(",$p,")) { 'battery-exempt' } else { 'NOT battery-exempt' }
    Write-Host "  $p  $overlay  $idle"
  }
} else { Write-Host '  none' }

Write-Host "`nHome app:" -ForegroundColor Cyan
Write-Host "  $(Invoke-TvShell $t 'cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME' -split "`r?`n" | Select-Object -Last 1)"
Write-Host "`n* = differs from the backup (expected for settings you changed with tweaks)."
