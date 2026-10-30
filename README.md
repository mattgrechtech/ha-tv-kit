# ha-tv-kit

**A Home Assistant smart home that uses your TVs.** Doorbell snapshots, bin night, "garage still open" and emergency alerts pop up on the TV you're watching; a live illustrated "house twin" dashboard runs full screen on the TV; cleaned-up Google TVs with a photo screensaver and music behind it; alerts when something breaks or the fridge stops cooling; spoken announcements with quiet hours; energy costs by the hour; and, optionally, an AI that can manage it all but asks before changing anything.

Built to follow along with a video series, one step at a time. Everything is generic: you put your own entity IDs, IPs and names in one config file and one config block.

> Status: early (v0.1). Built from a working home setup (Home Assistant 2026.x with Google TV sets); the kit itself is being tested step by step in the video series. Expect to adjust entity IDs and package lists for your devices.

## Features

| | What you get | Guide |
|---|---|---|
| 🏠 | Home Assistant on a mini PC, Raspberry Pi or a Windows Hyper-V VM (script included), with backups from day one | [01 Install](docs/01-install-home-assistant.md) |
| 📺 | Google/Android TV prep over adb: backup, **reversible** debloat with a protected-package list and restore scripts (PowerShell + bash), faster animations, Aerial Views photo screensaver, background music, Projectivy | [02 TV prep](docs/02-tv-prep.md) |
| 🔔 | TV pop-ups through TvOverlay: camera/doorbell snapshot (blueprint), bin night, garage left open, emergency-feed alerts (bushfire example) | [03 TV notifications](docs/03-tv-notifications.md) |
| 🖼️ | The **House twin** panel: your house as an illustration, live (TVs, cameras, garage, appliances, bins, tariff, emergency banner), an energy replay and cost heatmap, and a full-screen TV mode. Kiosk guidance (Fully Kiosk, Kite AOS or the companion TV Kiosk app, coming soon) and no-login TV setup | [04 TV dashboard](docs/04-tv-dashboard.md) |
| 🛠️ | "Something broke" alerts (label what to watch), error alerts, an appliance watchdog (fridge not cooling / running non-stop) with tunable thresholds, speaker announcements with quiet hours | [05 Alerts](docs/05-alerts.md) |
| ⚡ | Energy dashboard done right, smart plugs, tariff rates as config; retailer integrations as examples | [06 Energy](docs/06-energy.md) |
| 🤖 | Optional: Claude manages Home Assistant through ha-mcp, reads freely, **asks before every change** | [07 AI](docs/07-ai-with-ha-mcp.md) |

## Companion app: TV Kiosk

**TV Kiosk** (Apache-2.0, coming soon at [ha-tv-kiosk](https://github.com/mattgrechtech/ha-tv-kiosk); the names are working titles) is a sister project: one free, open-source Android TV / Google TV app that does what this kit currently uses three tools for. It shows the dashboard full screen, draws pop-ups over any app, and is controlled from Home Assistant over REST or MQTT (with HA discovery), so there's no paid kiosk licence and no adb needed for day-to-day control.

- It can answer TvOverlay's `/notify` format on port 5001 (an opt-in mode), so the kit's `script.tv_popup`, blueprints and automations work without changes. Camera snapshots show over any app, including YouTube.
- You pick the dashboard from a list in its settings, with no URL typing. Sign-in is "sign in once on this TV", or a single click with the kit's `trusted_networks` TV user ([docs/04](docs/04-tv-dashboard.md#no-login-on-the-tv-trusted_networks-optional)).
- Its adb provisioning scripts follow the same pattern as the kit's `tv/` scripts.

The kit works without it (Fully Kiosk or Kite AOS plus TvOverlay), and the app works without the kit. **TV Kiosk is pre-alpha**: so far it has been tested on one TCL Google TV (Android 14), including a 72-hour soak test. Check its README for the current status before relying on it.

## Prerequisites

- Something to run Home Assistant OS on: a mini PC, Raspberry Pi 4/5, HA Green/Yellow, or a Windows 10/11 Pro PC with Hyper-V.
- A home network where you can set **DHCP reservations** (fixed IPs) and, ideally, a **guest Wi-Fi**.
- For the TV parts: an **Android TV / Google TV** (built in or a stick) and a computer with **adb** (Android SDK Platform-Tools).
- Optional: the HA Companion app on your phone, cameras (Ring, Reolink, UniFi Protect, …), Sonos or other speakers, energy-monitoring smart plugs, a garage door sensor, your council's bin schedule, a local emergency feed.
- Comfort with copying files and editing YAML. Every step is spelled out.

## Quick start

1. **Install Home Assistant** and set up backups: [docs/01](docs/01-install-home-assistant.md).
2. **Copy the kit into HA:**
   - `homeassistant/packages/*.yaml` → `/config/packages/`
   - `homeassistant/blueprints/automation/ha-tv-kit/` → `/config/blueprints/automation/ha-tv-kit/`
   - merge [`homeassistant/configuration.example.yaml`](homeassistant/configuration.example.yaml) into `/config/configuration.yaml` (at least `packages: !include_dir_named packages`)
3. **Edit the one config file**, `/config/packages/tv_kit_config.yaml`: HA URL, TVs and their IPs, phones, speakers, quiet hours, bins, emergency feed.
4. Developer tools → YAML → **Check configuration** → **Restart**.
5. **Prepare a TV** ([docs/02](docs/02-tv-prep.md)), install TvOverlay, and test:
   ```bash
   ./tv/bash/test-popup.sh 192.168.1.60
   ```
   then from HA: Developer tools → Actions → `script.tv_popup`.
6. Add features one guide at a time: [03](docs/03-tv-notifications.md) → [04](docs/04-tv-dashboard.md) → [05](docs/05-alerts.md) → [06](docs/06-energy.md) → [07](docs/07-ai-with-ha-mcp.md).

The example IPs throughout are placeholders: `192.168.1.50` for Home Assistant and `192.168.1.60`/`.61` for TVs. Use your own.

## Repository layout

```
homeassistant/
  packages/                   drop-in HA packages
    tv_kit_config.yaml        ← THE file to edit (IPs, TVs, phones, speakers, quiet hours, …)
    tv_kit_scripts.yaml       script.tv_popup, script.phone_notify, script.announce
    tv_kit_bins.yaml          bin night reminder
    tv_kit_garage.yaml        garage left open
    tv_kit_emergency.yaml     emergency-feed alert (bushfire example)
    tv_kit_health.yaml        offline + error alerts
  blueprints/automation/ha-tv-kit/
    camera_motion_tv_popup.yaml    doorbell/motion → TV pop-up with snapshot
    appliance_power_watchdog.yaml  fridge stopped / running non-stop
  configuration.example.yaml  lines to merge into configuration.yaml
dashboard/
  house-twin/                 the House twin panel (CONFIG block at the top), bin icons, render guide
  cards/                      card dashboard example + card installer
tv/
  powershell/  bash/          backup, debloat, restore, tweaks, test-popup
  packages/                   never-disable list + example debloat lists
host/setup-ha-vm.ps1          Hyper-V VM for Home Assistant OS
ai/claude-settings.example.json   allow/ask permission split for ha-mcp
tools/validate.py             YAML/JSON/JS checks + privacy scan
docs/                         one guide per topic
```

## Safety and privacy

This kit trusts your **local network**. Read this before you start.

- **LAN trust model.** TvOverlay (port 5001) has **no authentication**: anything on your network can show pop-ups on your TVs. adb debugging lets authorised computers control a TV. `/config/www` (the `/local/` URLs, including the house renders and bin icons) is readable **without a login**. That's acceptable on a home network you control, and only there.
- **Guest Wi-Fi.** Put visitors, and smart gadgets you don't trust, on a guest network isolated from your TVs and Home Assistant.
- **Don't expose any of it to the internet.** No port forwarding for Home Assistant, TvOverlay (5001), adb (5555), kiosk remote admin, or ha-mcp. For remote access use HA Cloud (Nabu Casa) or a VPN (WireGuard, Tailscale).
- **Never put camera images in `/config/www`.** Pop-ups use the camera's short-lived, tokenised `entity_picture` link.
- **The no-login TV user** (trusted_networks) is a convenience with a cost: a device that takes over a TV's IP gets that session, and non-admin HA users can still control every device. Use `/32` per TV, a non-admin user, DHCP reservations, and skip it if you have locks or alarms in HA. Details in [docs/04](docs/04-tv-dashboard.md#security-trade-offs-read-before-enabling).
- **Secrets stay with you.** Passwords, tokens, the ha-mcp connect URL and backup keys go in a password manager and in HA's own screens, never in this repo, a chat or a screenshot. If one leaks, rotate it.
- **Security devices are off-limits to automation by AI** (locks, alarm panels, sirens, garage openers) unless you deliberately decide otherwise. The kit only ever *notifies* about the garage.
- **Emergency alerts supplement official warnings.** They are not a warning system.
- **Mains wiring is for licensed electricians.** Plug-in devices and battery sensors are fine to do yourself.
- **Debloating is reversible but not risk-free.** Back up first, build the list from your own TV, start with Tier 1, keep the restore script.
- **Publishing your own fork?** Run `python tools/validate.py`: it flags private IPs other than the kit's placeholders, MAC addresses, e-mail addresses and token-like strings. Also check renders and screenshots for your street, house number or number plates.

## Contributing

Issues and pull requests are welcome, especially debloat lists for other TV models, other emergency feeds and other kiosk apps. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[MIT](LICENSE). Third-party apps and integrations mentioned here (TvOverlay, Aerial Views, SmartTube, Projectivy, Fully Kiosk Browser, Kite AOS, Waste Collection Schedule, ha-mcp, the dashboard cards, retailer integrations) have their own licences and terms. This project is not affiliated with Home Assistant, Nabu Casa, Google, any TV maker or any of those projects.
