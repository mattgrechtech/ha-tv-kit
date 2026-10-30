# 4. A dashboard on the TV

Two parts: **what** to show (the House twin panel, or a card dashboard) and **how** a TV shows it full screen without a keyboard (a kiosk browser).

## The House twin panel

An illustrated cutaway of *your* house that comes alive:

- **House view:** lighting blends day → dusk → night with the real sun; TV rooms glow when the TV is on (tap to toggle); camera icons pulse for 90 s after motion (tap for a snapshot card that refreshes every 10 s, with a fallback to the last recording and a "Live view" button); the garage door shows open/closed; appliances on smart plugs show live watts; bins, the clock, weather and the current tariff band; a red banner and vignette during an emergency-feed alert.
- **Energy view (optional):** appears only if your home has energy data. It reads Home Assistant's own Energy dashboard settings (grid import/export, solar, battery, devices), or statistics you list in the panel's CONFIG (for example a retailer integration that runs a day or two behind). Pick a day with **◀ Previous day / Next day ▶**, step through it hour by hour (the slider, or Left/Right on the remote) or press **Play**; the house lighting follows the hour, energy flows animate over the house and appliance hotspots show that hour's use. **Today** jumps to today (or the latest day with data). **Now** appears only when you have live power sensors (a switchboard monitor such as Shelly, IoTaWatt or Emporia, or plugs) and shows current watts. On the full page there's also a 14-day strip and a 24 × 14 **cost heatmap** priced at your tariff.
- **TV mode:** full screen, no side panel, a ticker along the bottom. Open `/house?tv=1`, or press the button in the side panel. Press the **⚡ Energy** button to open the Energy view: the house shrinks into the top of the screen and the chart sits below it, so nothing covers the house; **◀ House** (or Back) returns. Every control is a real button with a large focus ring, so a TV remote's D-pad reaches it. The Energy card carries `data-tvkiosk-keys="page"`, so the companion TV Kiosk app passes the remote's arrows to the page there: Left/Right move along the buttons (or step the hour on the slider), Down goes to the slider, Up comes back. To alternate House and Energy automatically, set `energy.tvCycleSeconds` (0 = off, the default).

### 1. Make your renders

Follow [`dashboard/house-twin/RENDERS.md`](../dashboard/house-twin/RENDERS.md): an AI image model turns a floor plan and a few photos into three pixel-aligned renders (`day.jpg`, `dusk.jpg`, `night.jpg`). No renders yet? The panel still works and shows a placeholder.

### 2. Install

1. Copy `dashboard/house-twin/house-twin.js`, your three renders and the three `bin-*.png` files to `/config/www/house-twin/` (create the folder; File editor, Studio Code Server or the Samba share).
2. Add the `panel_custom` block from [`homeassistant/configuration.example.yaml`](../homeassistant/configuration.example.yaml) to `configuration.yaml`.
3. Check configuration, restart. **House** appears in the sidebar.

### 3. Configure

Everything is in the `CONFIG` block at the top of `house-twin.js`: title, TVs, cameras, garage, appliances, room-light glows, bins, tariff bands and rates, energy statistic IDs, the emergency-feed source, and every hotspot position on the render. Each line is commented. Entity IDs come from Developer tools → States; statistic IDs from Developer tools → Statistics. Delete anything your home doesn't have.

After every edit: bump `?v=1` → `?v=2` in `module_url` (configuration.yaml), restart, and reload the browser. Otherwise browsers keep the old file.

Positions are percentages of the render; [`RENDERS.md`](../dashboard/house-twin/RENDERS.md#map-the-hotspots) shows how to measure them.

**Privacy:** `/config/www` is readable on your network without login. Fine for an illustration; never put camera images or anything sensitive there.

## Option: a card dashboard

[`dashboard/cards/`](../dashboard/cards) has `install-cards.sh` (installs Mushroom, Bubble Card, ApexCharts and Kiosk Mode from their GitHub releases and registers them, without HACS) and an example dashboard: greeting and status chips, TV media cards with pop-up remotes, an energy graph. If you use HACS or the built-in community store, install the same cards from there instead. Add `?kiosk` to a dashboard URL to hide HA's header and sidebar.

## Showing it on the TV: a kiosk browser

A kiosk browser opens one URL full screen, keeps the screen awake, reloads after a crash and starts at boot. The kit's default is **TV Kiosk**, its companion app, because the same app also draws the pop-ups from [docs/03](03-tv-notifications.md). That makes it one app per TV instead of two. Fully Kiosk Browser and Kite AOS remain good alternatives.

| | **TV Kiosk** (companion app, recommended) | **Fully Kiosk Browser** | **Kite AOS** |
|---|---|---|---|
| Licence | Open source (Apache-2.0), free | Proprietary. Core features are free; a paid **PLUS** licence per device unlocks kiosk mode, motion detection and remote admin | Open source (Apache-2.0) |
| Android TV | Built for Android TV / Google TV (Android 10+). Tested so far on one TCL Google TV (Android 14) | Yes, from the Play Store or its own APK | Has an Android TV build: check the project's releases for your device |
| Home Assistant | **REST** (token) and **MQTT** with HA discovery. Also draws pop-ups over any app, with a TvOverlay-compatible mode | Official **Fully Kiosk Browser** integration: screen on/off, brightness, load URL, screensaver, sensors | Talks to HA over **MQTT**: needs the Mosquitto broker app and the MQTT integration |
| Best for | One app for dashboard, pop-ups and control. **Pre-alpha**: check its status first | Most mature, most features | Free and open source, MQTT-based |

There are other open-source kiosk apps with HA support (for example FreeKiosk); check their Android TV support before choosing. Install apps from the Play Store or the project's own GitHub releases only.

### TV Kiosk

Install it and give it the overlay permission as in [docs/02, Step 6](02-tv-prep.md#step-6-tv-kiosk-dashboard-and-pop-ups-in-one-app). What its [README](https://github.com/mattgrechtech/ha-tv-kiosk#readme) lists today:

- **Setup with the remote:** first-run setup finds Home Assistant, signs in and lists your dashboards, so there's no URL to type. HA's header and sidebar are hidden. For this panel, choose the House twin, or set the start page to `http://192.168.1.50:8123/house?tv=1`.
- **Remote:** the arrows jump between a page's buttons and OK presses them. An on-screen pointer is optional. Hold OK (or press Menu) for a quick menu. The House twin's Energy card passes the remote's arrows to the page (see TV mode above).
- **Several pages:** it can rotate through dashboards and black the screen on a night schedule.
- **Stays up:** it retries failed loads, replaces a crashed WebView and restarts itself after a crash. *Open the dashboard when the TV starts* is a setting (`boot_start`), off by default.
- **Control:** REST with a token, and MQTT with HA discovery. See its [Home Assistant set-up](https://github.com/mattgrechtech/ha-tv-kiosk/blob/main/docs/home-assistant.md) and [API](https://github.com/mattgrechtech/ha-tv-kiosk/blob/main/docs/api.md).
- **Screen:** it keeps the screen on over the dashboard by default (`keep_screen_on`). Turn that off if you want the TV's screensaver (for example Aerial Views) when idle.

It doesn't replace the TV's launcher, and it can't wake a TV from deep standby by itself. Use the Android TV Remote integration's `media_player.turn_on` for that.

### Fully Kiosk Browser

1. Install it on the TV, open it, and set the **Start URL** to `http://192.168.1.50:8123/house?tv=1` (your HA IP).
2. In its settings:
   - Device management → **Launch on boot**
   - Web content → enable JavaScript and autoplay
   - turn on **Keep screen on** if you want the dashboard always visible, or leave the screen to the TV's screensaver
3. For the HA integration, go to Settings → Remote administration, enable it and **set a strong password**. Then add the *Fully Kiosk Browser* integration in HA with the TV's IP and that password. Remote admin listens on port 2323: keep it LAN-only, like everything else here.

Fully Kiosk doesn't draw pop-ups over other apps, so pair it with TvOverlay ([docs/03](03-tv-notifications.md#tvoverlay-alternative)).

### Kite AOS

1. Install the Mosquitto broker app in HA (Settings → Apps) and the MQTT integration. Create a dedicated MQTT user for the kiosk (Settings → People → Users).
2. Install the Android TV build of Kite on the TV from the project's official releases. Set its URL to `http://192.168.1.50:8123/house?tv=1`, and enter the broker address and the MQTT user's credentials in its settings, following the project's README.

## No login on the TV: trusted_networks (optional)

Typing a password with a TV remote is painful. HA's `trusted_networks` auth provider lets requests from specific IPs log in as a chosen user without a password.

1. **Create a dedicated user:** Settings → People → Add person "TV", allow login, **not an administrator**, tick **Can only log in from the local network**. Set a long random password (it's only used if the bypass fails). Turn on Advanced mode in your profile, then open Settings → People → **Users** → TV and copy its **ID**.
2. **Reserve each TV's IP** in your router (DHCP reservation). This is essential: the trust is tied to the IP.
3. **Add** the `auth_providers` block from [`configuration.example.yaml`](../homeassistant/configuration.example.yaml) to `configuration.yaml`, with **each TV's IP as a /32** (exactly that one address, never a whole range like `/24`) and the TV user's ID:
   ```yaml
   homeassistant:
     auth_providers:
       - type: trusted_networks
         trusted_networks:
           - 192.168.1.60/32
         trusted_users:
           192.168.1.60/32: YOUR_TV_USER_ID
         allow_bypass_login: true
       - type: homeassistant
   ```
   Keep the `homeassistant` provider, or nobody can log in with a password. Check configuration and restart.
4. Open the dashboard URL in the kiosk browser. It should go straight in. **Some people report the bypass still shows a screen asking them to pick the user, needing one button press** (once, or after HA restarts); that's normal behaviour for some HA versions and browsers.

### Security trade-offs (read before enabling)

- **Anyone who gets the TV's IP gets the TV user's session.** On a home LAN, a device can claim another device's IP. That's why the user must be a non-admin, the trust must be `/32` per TV, and untrusted devices belong on a guest Wi-Fi.
- **Non-admin isn't read-only.** HA has no per-device permissions: the TV user can still control every device (lights, the garage opener if you have one, sirens) through the UI or API. It just can't change the configuration. If you have locks or alarms in HA, weigh this carefully.
- **Never** combine trusted_networks with exposing HA to the internet through port forwarding. Use HA Cloud or a VPN (WireGuard, Tailscale) for remote access instead; trusted_networks only applies to the listed LAN IPs.
- If a TV is replaced or its IP changes, update or remove its line.

The alternative is simply logging in once on the TV with the TV user: HA keeps the session (a refresh token) until you log it out.
