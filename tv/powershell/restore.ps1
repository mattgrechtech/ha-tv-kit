# ha-tv-kit · undo everything the kit's TV scripts changed.
# Usage:  .\restore.ps1 -Tv 192.168.1.60 -Name living-room [-PackagesOnly]
# Re-enables every package debloat.ps1 disabled, resets the permissions tweaks.ps1 granted, and puts
# every setting back to the value in settings-before.txt. Restart the TV afterwards.
param(
  [Parameter(Mandatory)][string]$Tv,
  [Parameter(Mandatory)][string]$Name,
  [switch]$PackagesOnly
)
. "$PSScriptRoot\common.ps1"
$t = Get-TvTarget $Tv
Connect-Tv $t
$dir = Get-BackupDir $Name
Assert-Backup $dir
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

$log = Join-Path $dir 'disabled-by-kit.txt'
if (Test-Path $log) {
  foreach ($p in Read-PackageList $log) { Write-Host "enable   $p  $(Invoke-TvShell $t "pm enable --user 0 $p")" }
  Move-Item $log (Join-Path $dir "disabled-by-kit.restored-$stamp.txt")
} else { Write-Host 'No packages were disabled by the kit.' }
if ($PackagesOnly) { exit 0 }

$apps = Join-Path $dir 'appops-by-kit.txt'
if (Test-Path $apps) {
  foreach ($p in Read-PackageList $apps) {
    Invoke-TvShell $t "appops set $p SYSTEM_ALERT_WINDOW default" | Out-Null
    Invoke-TvShell $t "dumpsys deviceidle whitelist -$p" | Out-Null
    Write-Host "reset    $p  (overlay permission, battery whitelist)"
  }
  Move-Item $apps (Join-Path $dir "appops-by-kit.restored-$stamp.txt")
}

foreach ($line in Get-Content (Join-Path $dir 'settings-before.txt')) {
  $ns, $key, $value = $line -split "`t", 3
  if (-not $key) { continue }
  if ($value -eq 'null' -or $value -eq '') { Invoke-TvShell $t "settings delete $ns $key" | Out-Null; Write-Host "delete   $ns $key" }
  else { Invoke-TvShell $t "settings put $ns $key '$value'" | Out-Null; Write-Host "put      $ns $key = $value" }
}
Write-Host "`nRestored. Restart the TV: adb -s $t reboot" -ForegroundColor Green
