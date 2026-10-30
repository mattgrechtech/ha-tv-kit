# 2. Prepare an Android TV / Google TV

This covers Google TV and Android TV sets and sticks: TCL, Hisense, Sony, Philips, Xiaomi, Chromecast with Google TV, Onn, Nvidia Shield and others. Samsung (Tizen), LG (webOS) and Roku can't be customised like this; add them to HA for control only, using the Samsung Smart TV, LG webOS or Roku integration.

By the end, the TV has no vendor ad channels or promo apps and feels snappier. It runs **TV Kiosk**, which shows your Home Assistant dashboard and pops up doorbell snapshots and alerts over whatever is playing. It also has a photo screensaver with optional background music, and it's paired with Home Assistant.

## The safety rules (every script follows them)

1. **Back up first.** `backup` saves the TV's package list and every setting the kit may change. The other scripts refuse to run until a backup exists.
2. **Dry run first.** `debloat` and `tweaks` only print what they *would* do until you add `-Apply` (PowerShell) or `--apply` (bash).
3. **Disable, never uninstall.** Apps are turned off with `pm disable-user`. They stay on the TV and come back with `restore`. Nothing in the kit uninstalls a system app.
4. **Protected list.** The scripts refuse anything in [`tv/packages/never-disable.txt`](../tv/packages/never-disable.txt), which covers:
   - Play Services, the setup app, settings, inputs and tuner, the remote, voice and Chromecast
   - the WebView, `adb` itself and network discovery
   - the Android TV Remote service that Home Assistant pairs with
   - TV Kiosk
5. **One command undoes everything:** `restore`. `status` shows what's changed and whether it has stuck.

The reference build behind this guide is two TCL Google TVs (Android 14). On each, 18 apps were disabled, animations set to 0.5×, Private DNS set, and Aerial Views with SmartTube background music set up. Both TVs were then restarted and checked: inputs, Chromecast, AirPlay, the remote and DNS all still worked. Other brands follow the same steps; the per-brand notes below say where menus differ.

## What you need

- A computer on the same network as the TV.
- **adb** (Android Debug Bridge) from Google's [SDK Platform-Tools](https://developer.android.com/tools/releases/platform-tools). Unzip it and add the folder to your PATH, or run the scripts from inside it.
- **The TV's IP address.** Find it in Settings → Network & Internet → your network, or in your router's device list. **Give the TV a DHCP reservation** in your router so the IP never changes.
- **The scripts:** [`tv/powershell/`](../tv/powershell) for Windows, or [`tv/bash/`](../tv/bash) for macOS, Linux, WSL and Git Bash. Both sets do the same thing and read the same backup files.

On Windows, if PowerShell refuses to run scripts: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Step 1: developer mode and network debugging

1. **Unlock Developer options** by pressing OK 7 times on the build number, until "You are now a developer":
   - **Google TV** (TCL, Hisense, Sony, Chromecast with Google TV, Onn, …): Settings → System → About → **Android TV OS build**.
   - **Older Android TV and Nvidia Shield:** Settings → Device Preferences → About → **Build**.
2. **Turn on debugging** in Settings → System (or Device Preferences) → **Developer options**. The name varies (see the table below):
   - **USB debugging** (on many TVs it also opens network port 5555)
   - **Network debugging** or **ADB debugging**
   - **Wireless debugging**
3. **Connect** from the computer:
   ```bash
   adb connect 192.168.1.60:5555
   ```
   On TVs that only offer **Wireless debugging** (Android 13+ TVs), open it and choose **Pair device with pairing code**. Then run `adb pair 192.168.1.60:<pairing-port>` with the 6-digit code, and `adb connect 192.168.1.60:<port>` with the port shown on that screen. The scripts accept `ip:port` wherever this guide writes the IP. The port can change after a restart.
4. **Allow the computer.** The TV asks **"Allow USB debugging?"** (or "Allow network debugging?"). Tick **Always allow from this computer** and press **Allow**. The prompt can time out: if `adb devices` says `unauthorized`, run `adb connect` again and accept the fresh prompt.

| Device | Debug setting | Notes |
|---|---|---|
| TCL Google TV | USB debugging, then `adb connect ip:5555` | Verified on the reference build (Android 14) |
| Sony Bravia (Google TV) | USB debugging | Same Google TV menus |
| Hisense (Google TV) | USB debugging | Same Google TV menus |
| Chromecast with Google TV, Google TV Streamer | USB debugging (port 5555 over Ethernet); over Wi-Fi, **Wireless debugging** with a pairing code | Both are on Android 14; Android 13 split Wireless debugging from USB debugging ([third-party guide](https://allaboutchromecast.com/using-adb-on-google-tv-streamer/); [Android docs](https://developer.android.com/tools/adb): wireless pairing on TV needs Android 13+) |
| Onn (Google TV) | USB debugging | Same Google TV menus |
| Nvidia Shield TV | **Network debugging** (port 5555); it shows the IP on screen | Device Preferences path ([third-party guide](https://stb-tester.com/manual/android)) |

> **Security:** while debugging is on, anything on your network that the TV has authorised can control it. Only authorise your own computer and Home Assistant. You can turn debugging off when you're done, but HA's Android Debug Bridge integration (Step 10) needs it on.

## Step 2: back up

```powershell
cd tv\powershell
.\backup.ps1 -Tv 192.168.1.60 -Name living-room
```
```bash
cd tv/bash && chmod +x *.sh
./backup.sh 192.168.1.60 living-room
```

The backup goes to `tv/backups/living-room/` and records:

- the model, Android version and CPU type
- every package, and the packages that are already disabled
- every setting the kit may change

That folder is in `.gitignore`: it describes your device, so don't publish it. Later backups get a timestamp and never overwrite the first one, which is the one `restore` goes back to.

## Step 3: debloat (optional, reversible)

TVs ship with vendor ad channels, promo apps, retail demos and duplicate assistants that slow them down. The kit **disables** them: the app stays on the TV, can't run, and comes back with `restore`.

1. **Build your list from your own TV.**
   1. Open `tv/backups/<name>/packages-before.txt`.
   2. Compare it with the examples in [`tv/packages/examples/`](../tv/packages/examples). They come from specific models; don't apply them blindly.
   3. Copy one to a new file, for example `tv/packages/my-tv.txt`.
   4. Keep only lines that appear on your TV and that you understand. Search a package name online if you're unsure; when in doubt, leave it out.

   Sort what you keep into two tiers:
   - **Tier 1, usually safe:** vendor ad and content channels, promo messages, retail demo apps, tutorials, Google Feedback, Play Games.
   - **Tier 2, only if you don't use it:**
     - vendor voice assistants, phone-casting apps, accounts and browsers
     - game overlays and YouTube Music
     - factory-installed streaming apps
     - Google's ambient-mode screensaver (`…tv.dreamx`), but only if you switch to Aerial Views. Until you do, the screensaver is blank.
2. **Dry run.** This shows what would happen and changes nothing. Every line says `disable`, `skip` (not installed) or `REFUSED` (protected):
   ```powershell
   .\debloat.ps1 -Tv 192.168.1.60 -Name living-room -List ..\packages\my-tv.txt
   ```
   ```bash
   ./debloat.sh 192.168.1.60 living-room ../packages/my-tv.txt
   ```
3. **Apply:** run the same command with `-Apply` (PowerShell) or `--apply` (bash).
4. **Restart the TV** (`adb -s 192.168.1.60:5555 reboot`) and check that:
   - it boots normally
   - HDMI inputs and the tuner work
   - the remote and its voice button work
   - casting works
   - your streaming apps open

Don't bother disabling the Google TV home screen (`launcherx`). On the reference TVs, Google's setup app (`setupwraith`) re-enables it at every boot, so the change doesn't stick. The kit protects both.

**Brand notes**

- **TCL:** the example list is the reference build's (TCL Google TV, Android 14). Never touch `com.tcl.tv*` (live TV, inputs, home components): the protected list blocks it.
- **Sony:** the Samba Interactive TV service (ACR) is better turned off in its own setting (Step 4) than disabled.
- **Other brands:** there's no vendor-published list of packages that are safe to disable. Only disable what you can identify, and keep `restore` handy. Lists from other models are welcome as pull requests.

### Undo everything

```powershell
.\restore.ps1 -Tv 192.168.1.60 -Name living-room
```
```bash
./restore.sh 192.168.1.60 living-room
```

`restore` does three things:

- re-enables every package the kit disabled
- removes the permissions and battery exemptions the kit granted
- puts each setting back to its backed-up value

Restart the TV afterwards. Add `-PackagesOnly` / `--packages-only` to undo only the debloat. As a last resort, a factory reset (Settings → System → Reset) also brings everything back.

## Step 4: privacy settings (with the remote)

These live in the TV's own menus, not in adb settings the kit can safely set. Menu names vary by model and firmware.

- **Google ads (all Google TVs):** Settings → Privacy → **Ads** → *Delete advertising ID* (or *Reset advertising ID*). Ad personalisation is managed in Google's My Ad Center. ([Google](https://support.google.com/googletv/answer/13392198))
- **Usage & diagnostics:** turn it off in Settings → Privacy (or Device Preferences). On Chromecast and Google TV Streamer, it's in the Google Home app. ([Google](https://support.google.com/chromecast/answer/6076570))
- **ACR (automatic content recognition)** is a vendor feature: Google TV itself doesn't use it, but some TV makers do. ([Consumer Reports](https://www.consumerreports.org/electronics/privacy/how-to-turn-off-smart-tv-snooping-features-a4840102036/))
  - **TCL:** turn off *Viewing information services* where your model has it (usually under Settings → Privacy). This setting is cited by [third-party guides](https://9meters.com/technology/tv/how-to-disable-automatic-content-recognition-acr-on-your-tv); TCL doesn't document it. Also opt out of the *User Experience Improvement Program* in Settings → Privacy → User Agreements ([Consumer Reports](https://www.consumerreports.org/electronics/privacy/how-to-turn-off-smart-tv-snooping-features-a4840102036/)).
  - **Sony:** set **Samba Interactive TV** to off. It's in Settings → All Settings (just below Privacy), or System Preferences on older sets. You can also choose *Disagree and Disable* during setup. ([Consumer Reports](https://www.consumerreports.org/electronics/privacy/how-to-turn-off-smart-tv-snooping-features-a4840102036/); [Sony](https://www.sony.ca/en/electronics/support/articles/00182856))
  - **Hisense (Google TV):** look under Settings → System → Privacy for *Viewing Information Services* or *Smart TV Experience* ([third-party guide](https://9meters.com/technology/tv/how-to-disable-automatic-content-recognition-acr-on-your-tv)).

## Step 5: quick wins

```powershell
.\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -FasterAnimations            # dry run
.\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -FasterAnimations -Apply
```
```bash
./tweaks.sh 192.168.1.60 living-room faster-animations            # dry run
./tweaks.sh 192.168.1.60 living-room faster-animations --apply
```

Animations at 0.5× make a slow TV feel much faster.

Optionally, `-PrivateDns <hostname>` / `private-dns <hostname>` sets a DNS-over-TLS provider, for example an ad-blocking DNS. Use the provider's *DNS-over-TLS* hostname. If apps stop loading afterwards, the hostname is wrong: run `restore`.

## Step 6: TV Kiosk (dashboard and pop-ups in one app)

[**TV Kiosk**](https://github.com/mattgrechtech/ha-tv-kiosk) is this kit's free, open-source companion app (Apache-2.0). It replaces two apps:

- **the kiosk browser:** it shows your Home Assistant dashboard full screen, signs in without typing a password, and restarts itself after a crash
- **the pop-up app:** it shows pop-ups over any app, including camera snapshots from a doorbell, with optional buttons. It also answers TvOverlay's `/notify` format, so the kit's automations work unchanged.

Home Assistant controls it over REST (with a token) or MQTT.

> **Status: pre-alpha.** It has been tested on one TCL Google TV (Android 14), including a 72-hour run. Pop-ups show a camera **snapshot**, not live video. Check [its README](https://github.com/mattgrechtech/ha-tv-kiosk#readme) for what's built and how to install it. It needs Android 10 or newer.

1. **Install it** following [its README](https://github.com/mattgrechtech/ha-tv-kiosk#install). Until a release APK is published there, that means building it ([build set-up](https://github.com/mattgrechtech/ha-tv-kiosk/blob/main/docs/build-setup.md)); its `provision` script then installs and configures it over adb in one go.
2. **Open it once.** First-run setup finds Home Assistant, signs in and lets you pick a dashboard.
3. **Let it draw over other apps and keep running.** Many TVs only allow this over adb:
   ```powershell
   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -TvKiosk -Apply
   ```
   ```bash
   ./tweaks.sh 192.168.1.60 living-room tv-kiosk --apply
   ```
4. **Test a pop-up.** Port 5001 needs *TvOverlay-compatible pop-ups* turned on in TV Kiosk's settings. To use its token API on port 2424 instead, run `.\test-popup.ps1 -Tv 192.168.1.60 -Token <token>` or `TV_KIOSK_TOKEN=<token> ./test-popup.sh 192.168.1.60`.
   ```powershell
   .\test-popup.ps1 -Tv 192.168.1.60
   ```
   ```bash
   ./test-popup.sh 192.168.1.60
   ```

Then connect it to Home Assistant: [TV notifications](03-tv-notifications.md) and [TV dashboard](04-tv-dashboard.md).

**Screensaver or dashboard?** TV Kiosk keeps the screen on while the dashboard is in front (its `keep_screen_on` setting, on by default), so the screensaver won't start over the dashboard. Keep it on for an always-visible wall display. Turn it off in TV Kiosk's settings if you want Aerial Views (Step 7) to take over when idle.

Already using TvOverlay or Fully Kiosk? They still work with the kit (see docs 03 and 04). Run only one pop-up app per TV, because TvOverlay and TV Kiosk's compatible mode both use port 5001.

## Step 7: a photo screensaver (Aerial Views)

1. On the TV, install **Aerial Views** from the Play Store and open it once.
2. Copy your photos and set it as the screensaver (dry run first, then add `-Apply` / `--apply`):
   ```powershell
   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -AerialViews -PhotosFolder C:\Pictures\TV -Apply
   ```
   ```bash
   ./tweaks.sh 192.168.1.60 living-room aerial-views ~/Pictures/TV --apply
   ```
3. In Aerial Views, choose your sources: for example local media only, or its built-in aerial videos.
4. Optional: set how long after the screensaver starts the TV goes to sleep, with `-SleepMinutes 60` / `sleep-minutes 60`.

**TCL (and possibly other brands): open Aerial Views once after every full restart.** After a cold boot (power cut, firmware update, `reboot`), TCL's boot manager (`TclAppBoot`) refuses to bind a third-party screensaver until that app has been opened once. Until then, no screensaver starts. Turning the TV off and on with the remote is only standby, so it doesn't trigger this. To fix it, open Aerial Views from the apps row and press Home.

## Step 8: background music behind the screensaver (optional)

The official YouTube app keeps the screen awake, so the screensaver never starts while it plays. **SmartTube**, an open-source YouTube client for TVs, can keep playing behind other apps.

1. **Download SmartTube only from its official GitHub releases.**
   - Pick the build for your TV's CPU: see `ro.product.cpu.abilist` in `tv/backups/<name>/device-before.txt`, usually `armeabi-v7a` or `arm64-v8a`.
   - Check the published checksum if there is one.
   - Install it with `adb -s 192.168.1.60:5555 install SmartTube_*.apk`.
2. **In SmartTube:** Settings → Player → **Background playback → Behind other apps**. Other choices stop the music when the screensaver starts. The setting applies to videos started after you change it.
3. **Let it keep running:**
   ```powershell
   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -BackgroundApp org.smarttube.stable -Apply
   ```
   ```bash
   ./tweaks.sh 192.168.1.60 living-room background-app org.smarttube.stable --apply
   ```
   This does three things:
   - allows SmartTube to draw over other apps
   - exempts it from battery optimisation
   - sets `cached_apps_freezer` to `disabled`. This is the developer option *Suspend execution for cached apps*. Android freezes cached background apps ([Android docs](https://source.android.com/docs/core/perf/cached-apps-freezer)), and on the reference TVs it froze SmartTube about a second after the screensaver started.

   **Restart the TV** afterwards. The freezer change only applies after a restart. Turning Developer options off may reset it, so run `status` if the music stops again.

After installing, check the package name in the TV's package list; the stable build is usually `org.smarttube.stable`. Third-party YouTube clients may conflict with YouTube's terms of service; that's your call.

## Step 9: Projectivy Launcher (optional)

Projectivy is a popular ad-free launcher. Install it from the Play Store and set it as the home app in its own settings (its option to intercept the Home button).

**Expect one limit on Google TV:** after a cold boot, Projectivy doesn't take the Home button until it has been opened once. That's because Google's home screen can't be disabled for good (Step 3). Remove Projectivy any time from Settings → Apps; if you used its accessibility option, turn that off first.

## Step 10: add the TV to Home Assistant

1. **Android TV Remote** integration: Settings → Devices & services → Add integration → *Android TV Remote*. Enter the TV's IP, then type the pairing code shown on the TV. This gives you a `media_player.*` entity and a `remote.*` entity (power, volume, app launching). It relies on the TV's Android TV Remote service, which the debloat scripts never disable.
2. **Android Debug Bridge** integration (optional; adds app launching by package name and extra state): Add integration → *Android Debug Bridge* → host = the TV's IP, port 5555. HA uses its own key, so the TV shows a **new** "Allow USB debugging?" prompt. Accept it quickly and tick Always allow; if the form timed out, submit it again.
3. Put the `media_player` entity ID and the TV's IP in `tvs:` in `tv_kit_config.yaml`.

## Step 11: check it stuck

```powershell
.\status.ps1 -Tv 192.168.1.60 -Name living-room
```
```bash
./status.sh 192.168.1.60 living-room
```

`status` is read-only. It shows:

- each package the kit disabled, flagged `ENABLED` if something has turned it back on
- each setting next to its backed-up value
- the overlay permission and battery exemption of the apps you set up
- the current home app

Run it after a restart and after every firmware update.

Next: [TV notifications](03-tv-notifications.md).

## Gotchas

- **TVs that are off don't answer on the network.** Turn them on, or enable "network standby" / "wake on LAN" in the TV's settings, before running scripts.
- **Android's own notifications don't pop up on Google TV.** That's why the kit uses TV Kiosk, or TvOverlay, for pop-ups.
- **After a big firmware update,** run `backup` again (it keeps the original and writes a timestamped copy), then run `status`. Updates can re-enable apps or reset overlay permissions; re-run `debloat` and `tweaks` for anything that changed.
- **Don't poll the audio service.** When checking whether music plays, use `adb shell dumpsys audio` once and look for a player in `state:started`. `dumpsys media_session` can go stale. Running `dumpsys media.audio_flinger` in a loop coincided with audioserver crash loops on the reference TVs.
- **Turn debugging off between sessions** if you don't use HA's ADB integration: Developer options → USB/Network/Wireless debugging.
