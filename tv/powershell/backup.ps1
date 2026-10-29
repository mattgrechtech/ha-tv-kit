# ha-tv-kit · back up a TV's package list and settings before changing anything.
# Usage:  .\backup.ps1 -Tv 192.168.1.60 -Name living-room
# Writes tv\backups\<Name>\ (git-ignored: it describes your device). The FIRST backup is the one
# restore.ps1 uses; later runs are saved with a timestamp and never overwrite it.
param(
  [Parameter(Mandatory)][string]$Tv,
  [Parameter(Mandatory)][string]$Name
)
. "$PSScriptRoot\common.ps1"
$t = Get-TvTarget $Tv
Connect-Tv $t
$dir = Get-BackupDir $Name
$suffix = if (Test-Path (Join-Path $dir 'settings-before.txt')) { '-' + (Get-Date -Format 'yyyyMMdd-HHmmss') } else { '-before' }

$device = foreach ($p in 'ro.product.manufacturer', 'ro.product.model', 'ro.build.version.release', 'ro.product.cpu.abilist') {
  "$p=$(Invoke-TvShell $t "getprop $p")"
}
Write-Lines (Join-Path $dir "device$suffix.txt") $device
Write-Lines (Join-Path $dir "packages$suffix.txt") ((Invoke-TvShell $t 'pm list packages') -split "`r?`n" | ForEach-Object { $_ -replace '^package:', '' } | Sort-Object)
Write-Lines (Join-Path $dir "disabled$suffix.txt") ((Invoke-TvShell $t 'pm list packages -d') -split "`r?`n" | Where-Object { $_ } | ForEach-Object { $_ -replace '^package:', '' } | Sort-Object)
$settings = foreach ($k in $SettingKeys) {
  $ns, $key = $k -split ' '
  "$ns`t$key`t$(Invoke-TvShell $t "settings get $ns $key")"
}
Write-Lines (Join-Path $dir "settings$suffix.txt") $settings

$device | Out-Host
Write-Host "Backup saved to $dir (files *$suffix.txt)." -ForegroundColor Green
