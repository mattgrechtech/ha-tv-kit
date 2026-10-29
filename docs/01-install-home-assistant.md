# 1. Install Home Assistant

Home Assistant (HA) is the hub everything else in this kit runs on. You want **Home Assistant OS**: it includes the add-on store ("Apps"), backups and updates. Pick one of these hosts.

| Host | Good for | Notes |
|---|---|---|
| **Mini PC** (an old Intel NUC or similar, 8 GB RAM, SSD) | The long-term home | Install HA OS directly, wired Ethernet. Best choice. |
| **Home Assistant Green / Yellow** | Plug-and-play | Official hardware, HA OS pre-installed. |
| **Raspberry Pi 4/5** (4 GB+) | Small homes, low power | Use an SSD over USB rather than an SD card; SD cards wear out. |
| **Windows PC, Hyper-V VM** | Trying it out | It stops whenever the PC sleeps or restarts. Move to a mini PC later (backup → restore). |
| **Proxmox on a mini PC** | Tinkerers running other VMs | Use the community HA OS VM script or the official `.qcow2`. |

Avoid **Docker Desktop on Windows/macOS**: it has no host networking, so device discovery breaks, and the container install has no Apps.

## Option A: a mini PC or Raspberry Pi

Follow the official guide for your hardware at [home-assistant.io/installation](https://www.home-assistant.io/installation/). It's a flash-and-boot process: write the image to the disk or SSD with Balena Etcher or Raspberry Pi Imager, plug in Ethernet, power on, wait 5–10 minutes, open `http://homeassistant.local:8123`.

## Option B: a Hyper-V VM on Windows

Needs Windows 10/11 **Pro, Enterprise or Education** (Home has no Hyper-V).

1. **Turn on Hyper-V:** Start → "Turn Windows features on or off" → tick **Hyper-V** → OK → restart.
2. **Download** the Hyper-V image (`haos_ova-<version>.vhdx.zip`) from [home-assistant.io/installation/windows](https://www.home-assistant.io/installation/windows). Put it in a folder together with [`host/setup-ha-vm.ps1`](../host/setup-ha-vm.ps1).
3. **Find your network adapter's name.** Open PowerShell **as administrator** (right-click Start → Terminal (Admin)) and run:
   ```powershell
   Get-NetAdapter | Where-Object Status -eq Up
   ```
   Use `Ethernet` if you can. `Wi-Fi` works but some Wi-Fi drivers don't bridge well.
4. **Create the VM** (same admin window, in that folder):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\setup-ha-vm.ps1 -Adapter 'Ethernet'
   ```
   It unzips the image, makes a 64 GB disk, creates a bridged switch (your network drops for a few seconds), creates a Generation 2 VM with Secure Boot off, 2 CPUs and 4 GB RAM, and starts it with Windows. Re-running it is safe.
5. **Wait 5–10 minutes**, then open `http://homeassistant.local:8123`. If that name doesn't resolve, find the VM's IP in Hyper-V Manager (Networking tab) or your router's device list.

Stop Windows sleeping if HA should keep running: Settings → System → Power → Screen and sleep → "Never" when plugged in.

## Onboarding

1. Create your **owner account** (a strong, unique password in a password manager).
2. Set your **home location**: it drives the sun, weather, emergency-feed radius and the energy dashboard. It's stored only in your HA.
3. HA finds devices on your network; add the ones you recognise, skip the rest for now.

## Do these straight away

- **Backups:** Settings → System → Backups → set up automatic backups: daily, keep 7, to a second location (Google Drive or OneDrive via their integrations, a NAS, or HA Cloud) as well as local. **Save the backup encryption key in your password manager**: without it a backup can't be restored.
- **Two-factor authentication** on your account: your profile (bottom-left) → Security → Multi-factor authentication.
- **A non-admin account** for every other household member (Settings → People → Add person). Note that HA has no per-device permissions: non-admins can still control every device, they just can't change the configuration.
- **A DHCP reservation** for the HA box in your router so its IP never changes. The kit's examples use `192.168.1.50`; yours will differ.
- **Apps** (Settings → Apps / Add-ons → store):
  - **File editor** or **Studio Code Server**: edit YAML in the browser.
  - **Terminal & SSH**: run the `ha` CLI and the kit's install scripts.
  - **Samba share** (optional): open `\\<HA_IP>\config` from Windows/macOS to copy files. Set its username and password in the app's configuration, and turn on **Start on boot** and **Watchdog**.

## Install the kit's Home Assistant files

1. Copy `homeassistant/packages/*.yaml` to `/config/packages/` (create the folder).
2. Copy `homeassistant/blueprints/automation/ha-tv-kit/` to `/config/blueprints/automation/ha-tv-kit/`.
3. Merge [`homeassistant/configuration.example.yaml`](../homeassistant/configuration.example.yaml) into your `/config/configuration.yaml`. At minimum you need:
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```
4. Edit **`/config/packages/tv_kit_config.yaml`**: it's the one place for your IPs, TVs, phones and speakers.
5. Developer tools → YAML → **Check configuration**, then **Restart**.

Nothing in the packages fires until the matching devices exist, so you can install everything now and add devices as you follow the other guides.

## Updating Home Assistant safely

- Read the release notes' "Backward-incompatible changes" section first.
- Updates create a backup automatically if you tick the option; keep it ticked.
- If something breaks: Settings → System → Backups → the pre-update backup → Restore.

## Moving from the VM to a mini PC later

Make a full backup, download it, install HA OS on the new box, and choose **Restore from backup** during onboarding. Give the new box the old IP (DHCP reservation) so TVs, phones and the kit's `ha_url` keep working.
