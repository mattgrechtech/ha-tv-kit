# ha-tv-kit · disable pre-installed apps on an Android/Google TV (reversible).
# Usage:
#   .\debloat.ps1 -Tv 192.168.1.60 -Name living-room -List ..\packages\examples\tcl-google-tv.txt          # dry run
#   .\debloat.ps1 -Tv 192.168.1.60 -Name living-room -List ..\packages\examples\tcl-google-tv.txt -Apply   # do it
#
# Uses `pm disable-user` (the app stays installed; restore.ps1 re-enables it). Never uninstalls.
# Refuses anything matching tv\packages\never-disable.txt. Skips packages your TV doesn't have.
# Build your list from YOUR TV's package list (tv\backups\<Name>\packages-before.txt), not just an example.
param(
  [Parameter(Mandatory)][string]$Tv,
  [Parameter(Mandatory)][string]$Name,
  [Parameter(Mandatory)][string]$List,
  [switch]$Apply
)
. "$PSScriptRoot\common.ps1"
$t = Get-TvTarget $Tv
Connect-Tv $t
$dir = Get-BackupDir $Name
Assert-Backup $dir

$enabled = (Invoke-TvShell $t 'pm list packages -e') -split "`r?`n" | ForEach-Object { ($_ -replace '^package:', '').Trim() } | Where-Object { $_ }
$never = Read-PackageList (Join-Path (Split-Path $PSScriptRoot -Parent) 'packages\never-disable.txt')
$plan = @()
foreach ($p in Read-PackageList $List) {
  $hit = $never | Where-Object { $p -like "*$_*" } | Select-Object -First 1
  if ($hit) { Write-Host "REFUSED  $p  (protected: matches '$hit')" -ForegroundColor Red; continue }
  if ($enabled -notcontains $p) { Write-Host "skip     $p  (not installed, or already disabled)" -ForegroundColor DarkGray; continue }
  Write-Host "disable  $p"
  $plan += $p
}

if (-not $Apply) { Write-Host "`nDry run: nothing changed. $($plan.Count) package(s) would be disabled. Re-run with -Apply." -ForegroundColor Yellow; exit 0 }

$log = Join-Path $dir 'disabled-by-kit.txt'
foreach ($p in $plan) {
  $out = Invoke-TvShell $t "pm disable-user --user 0 $p"
  if ($out -match 'disabled') { Add-UniqueLine $log $p; Write-Host "ok       $p" -ForegroundColor Green }
  else { Write-Host "FAILED   $p  ($out)" -ForegroundColor Red }
}
Write-Host "`nDone. Restart the TV (adb -s $t reboot), then check: it boots, inputs/HDMI work, the remote's voice button works, casting works."
Write-Host "Undo with: .\restore.ps1 -Tv $Tv -Name $Name"
