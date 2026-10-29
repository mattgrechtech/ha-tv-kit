# ha-tv-kit · create a Home Assistant OS virtual machine on Windows (Hyper-V).
# See docs/01-install-home-assistant.md first.
#
# 1. Enable Hyper-V (Windows 10/11 Pro, Enterprise or Education), restart.
# 2. Download the Hyper-V image (haos_ova-<version>.vhdx.zip) from https://www.home-assistant.io/installation/windows
#    into the same folder as this script.
# 3. In an ADMINISTRATOR PowerShell:
#      Get-NetAdapter | Where-Object Status -eq Up        # find your network adapter's name
#      powershell -ExecutionPolicy Bypass -File .\setup-ha-vm.ps1 -Adapter 'Ethernet'
#
# Your network drops for a few seconds while the bridged switch is created. Re-running is safe.
param(
  [string]$Adapter = 'Ethernet',            # 'Ethernet' (best) or 'Wi-Fi'
  [string]$VmName = 'HomeAssistant',
  [string]$SwitchName = 'HA-Bridge',
  [string]$VmDir = 'C:\HyperV\HomeAssistant',
  [int]$MemoryGB = 4,
  [int]$Cpus = 2,
  [int]$DiskGB = 64
)
$ErrorActionPreference = 'Stop'
$dir = $PSScriptRoot

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run this from an administrator PowerShell.'
}
if (-not (Get-Command New-VM -ErrorAction SilentlyContinue)) { throw 'Hyper-V is not enabled. Turn it on in "Turn Windows features on or off", restart, then run this again.' }
if (-not (Get-NetAdapter -Name $Adapter -ErrorAction SilentlyContinue)) {
  Get-NetAdapter | Format-Table Name, Status, InterfaceDescription -AutoSize
  throw "No adapter called '$Adapter'. Pass -Adapter with one of the names above."
}

# 1. Find and unpack the image
$zip = Get-ChildItem $dir -Filter 'haos_ova-*.vhdx.zip' | Sort-Object Name | Select-Object -Last 1
if ($zip -and -not (Get-ChildItem $dir -Filter 'haos_ova-*.vhdx')) { Expand-Archive $zip.FullName -DestinationPath $dir }
$vhdx = Get-ChildItem $dir -Filter 'haos_ova-*.vhdx' | Sort-Object Name | Select-Object -Last 1
if (-not $vhdx) { throw "No haos_ova-*.vhdx(.zip) found in $dir" }
Write-Host "Image: $($vhdx.Name)"

# 2. Copy the disk to the VM folder and grow it
New-Item -ItemType Directory -Force $VmDir | Out-Null
$disk = Join-Path $VmDir 'haos.vhdx'
if (-not (Test-Path $disk)) { Copy-Item $vhdx.FullName $disk; Resize-VHD -Path $disk -SizeBytes ($DiskGB * 1GB) }

# 3. A bridged (external) switch so the VM gets its own address on your network, like a real device
if (-not (Get-VMSwitch -Name $SwitchName -ErrorAction SilentlyContinue)) {
  New-VMSwitch -Name $SwitchName -NetAdapterName $Adapter -AllowManagementOS $true | Out-Null
  Write-Host "Created external switch $SwitchName on $Adapter"
}

# 4. The VM: Generation 2, Secure Boot off (HA OS needs this), fixed memory, starts with Windows
if (-not (Get-VM -Name $VmName -ErrorAction SilentlyContinue)) {
  New-VM -Name $VmName -Generation 2 -MemoryStartupBytes ($MemoryGB * 1GB) -VHDPath $disk -SwitchName $SwitchName -Path $VmDir | Out-Null
  Set-VMFirmware -VMName $VmName -EnableSecureBoot Off
  Set-VMProcessor -VMName $VmName -Count $Cpus
  Set-VMMemory -VMName $VmName -DynamicMemoryEnabled $false
  Set-VM -Name $VmName -AutomaticStartAction Start -AutomaticStopAction ShutDown -CheckpointType Disabled
}

Start-VM -Name $VmName
Write-Host 'Started. Give it 5-10 minutes, then open http://homeassistant.local:8123 (or the VM IP shown in Hyper-V Manager, port 8123).'
Get-VM -Name $VmName | Select-Object Name, State, CPUUsage, MemoryAssigned, Uptime | Format-Table -AutoSize
