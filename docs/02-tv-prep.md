# 2. Prepare an Android TV / Google TV

This covers Google TV and Android TV sets and sticks (TCL, Hisense, Sony, Philips, Xiaomi, Chromecast with Google TV, Nvidia Shield, …). Samsung (Tizen), LG (webOS) and Roku can't be customised like this: add them to HA for control only (Samsung Smart TV, LG webOS and Roku integrations).

Everything here is **reversible**: the scripts back up first and `restore` undoes every change.

## What you need

- A computer on the same network as the TV.
- **adb** (Android Debug Bridge) from Google's [SDK Platform-Tools](https://developer.android.com/tools/releases/platform-tools). Unzip it and add the folder to your PATH (or run the scripts from inside it).
- The TV's IP address (TV: Settings → Network & Internet → your network; or your router's device list). **Give the TV a DHCP reservation** in your router so the IP never changes.
- The scripts in [`tv/powershell/`](../tv/powershell) (Windows) or [`tv/bash/`](../tv/bash) (macOS, Linux, WSL, Git Bash). Both do the same thing and read the same backup files.

On Windows, if PowerShell refuses to run scripts: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Step 1: developer mode and network debugging

1. On the TV: **Settings → System → About** → scroll to **Android TV OS build** → press OK on it **7 times** until "You are now a developer".
2. **Settings → System → Developer options** → turn on **USB debugging** (on some TVs it's called **Network debugging** or **ADB debugging**).
3. On the computer:
   ```bash
   adb connect 192.168.1.60:5555
   ```
4. The TV shows **"Allow USB debugging?"**: tick **Always allow from this computer** and press **Allow**. The prompt can time out; if `adb devices` says `unauthorized`, run `adb connect` again and accept the fresh prompt.

> **Security:** with debugging on, anything on your network that the TV has authorised can control it. Only authorise your own computer and Home Assistant. You can turn debugging off again when you're done, but HA's Android Debug Bridge integration (below) needs it on.

## Step 2: back up

```powershell
cd tv\powershell
.\backup.ps1 -Tv 192.168.1.60 -Name living-room
```
```bash
cd tv/bash && chmod +x *.sh
./backup.sh 192.168.1.60 living-room
```

This saves the model, Android version, every package, the already-disabled packages and the settings the kit may change into `tv/backups/living-room/`. That folder is in `.gitignore`: it describes your device, so don't publish it.

## Step 3: debloat (optional, reversible)

TVs ship with vendor ad channels, promo apps, retail demos and duplicate assistants that slow them down. The kit **disables** them (`pm disable-user`): the app stays on the TV, can't run, and comes back with `restore`.

1. **Build your list from your own TV.** Open `tv/backups/<name>/packages-before.txt`. Compare it with the examples in [`tv/packages/examples/`](../tv/packages/examples) (they are examples from specific models, not lists to apply blindly). Copy one to a new file and keep only lines that appear on your TV and that you understand. Search the package name online if unsure; when in doubt, leave it out.
   - **Tier 1, usually safe:** vendor ad/content channels, promo messages, retail demo apps, tutorials, Google Feedback, Play Games.
   - **Tier 2, only if unused:** vendor voice assistants, vendor phone-casting apps, vendor accounts and browsers, game overlays, YouTube Music, the ambient-mode screensaver (only if you switch to Aerial Views), factory-installed streaming apps.
2. **Dry run** (shows what would happen, changes nothing):
   ```powershell
   .\debloat.ps1 -Tv 192.168.1.60 -Name living-room -List ..\packages\my-tv.txt
   ```
   ```bash
   ./debloat.sh 192.168.1.60 living-room ../packages/my-tv.txt
   ```
3. **Apply:** add `-Apply` (PowerShell) or `--apply` (bash).
4. **Restart the TV** (`adb -s 192.168.1.60:5555 reboot`) and check: it boots normally, HDMI inputs and the tuner work, the remote and its voice button work, casting works, your streaming apps open.

The scripts **refuse** anything matching [`tv/packages/never-disable.txt`](../tv/packages/never-disable.txt): Play Services and Store, the setup wizard, settings apps, inputs/tuner, Bluetooth and remote services, voice search, Chromecast built-in, keyboards, factory apps. Add your vendor's critical packages there too.

### Undo everything

```powershell
.\restore.ps1 -Tv 192.168.1.60 -Name living-room
```
```bash
./restore.sh 192.168.1.60 living-room
```
It re-enables every package the kit disabled, resets the permissions it granted and puts each setting back to the backed-up value. Restart the TV afterwards. As a last resort, a factory reset (Settings → System → Reset) also brings everything back.

## Step 4: quick wins

```powershell
.\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -FasterAnimations
```
```bash
./tweaks.sh 192.168.1.60 living-room faster-animations
```
Animations at 0.5× make a slow TV feel much faster. Optional: `-PrivateDns <hostname>` / `private-dns <hostname>` sets a DNS-over-TLS provider (for example an ad-blocking DNS); if apps stop loading, the hostname is wrong, so run `restore`.

## Step 5: a photo screensaver (Aerial Views)

1. On the TV, install **Aerial Views** from the Play Store and open it once.
2. Copy your photos and set it as the screensaver:
   ```powershell
   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -AerialViews -PhotosFolder C:\Pictures\TV
   ```
   ```bash
   ./tweaks.sh 192.168.1.60 living-room aerial-views ~/Pictures/TV
   ```
3. In Aerial Views, choose your sources (e.g. local media only, or its built-in aerial videos).
4. Optional: how long after the screensaver starts the TV goes to sleep: `-SleepMinutes 60` / `sleep-minutes 60`.

Some vendors block third-party screensavers from starting after a full reboot until the app has been opened once. If the screensaver reverts, open Aerial Views once after each restart.

## Step 6: background music behind the screensaver

The official YouTube app keeps the screen awake, so the screensaver never starts. **SmartTube** (an open-source YouTube client for TVs) can keep playing behind other apps:

1. Download SmartTube **only from its official GitHub releases** and pick the build for your TV's CPU (`ro.product.cpu.abilist` in `tv/backups/<name>/device-before.txt`, usually `armeabi-v7a` or `arm64-v8a`). Check the published checksum if there is one. Install with `adb -s 192.168.1.60:5555 install SmartTube_*.apk`.
2. In SmartTube: Settings → Player → **Background playback → Behind other apps** (applies to videos started after the change).
3. Let it keep running:
   ```powershell
   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -BackgroundApp org.smarttube.stable
   ```
   ```bash
   ./tweaks.sh 192.168.1.60 living-room background-app org.smarttube.stable
   ```
   This allows it to draw over other apps, exempts it from battery optimisation and turns off Android's cached-app freezer, which otherwise freezes it about a second after the screensaver starts. **Restart the TV** afterwards.

Check the package name in your backup's package list after installing (the stable build is usually `org.smarttube.stable`). Third-party YouTube clients may conflict with YouTube's terms of service; that's your call.

## Step 7: Projectivy Launcher (optional)

Projectivy is a popular ad-free launcher. Install it from the Play Store and set it as the home app in its own settings. Google TV re-enables its home screen if you disable it (and the kit refuses to), so on most Google TV models Projectivy takes over only after it has been opened once after each boot (its settings include an option to intercept the Home button). Remove it any time from Settings → Apps.

## Step 8: add the TV to Home Assistant

1. **Android TV Remote** integration: Settings → Devices & services → Add integration → *Android TV Remote* → enter the TV's IP → type the pairing code shown on the TV. Gives a `media_player.*` and `remote.*` entity (power, volume, app launching).
2. **Android Debug Bridge** integration (optional, for app launching by package name and extra state): Add integration → *Android Debug Bridge* → host = the TV's IP, port 5555. HA uses its own key, so the TV shows a **new** "Allow USB debugging?" prompt: accept it quickly (tick Always allow), then submit the form again if it timed out.
3. Put the `media_player` entity ID and the TV's IP in `tvs:` in `tv_kit_config.yaml`.

Next: [TV notifications](03-tv-notifications.md).

## Gotchas

- **TVs that are off don't answer** on the network; turn them on (or enable "network standby" / "wake on LAN" in the TV's settings) before running scripts.
- Android's own notifications don't pop up on Google TV, which is why the kit uses TvOverlay (or the companion [TV Kiosk](https://github.com/mattgrechtech/ha-tv-kiosk) app, whose own adb provisioning scripts grant the same overlay permission).
- After a big TV firmware update, run `backup` again (it keeps the original and writes a timestamped copy) and check that your disabled packages are still disabled.
