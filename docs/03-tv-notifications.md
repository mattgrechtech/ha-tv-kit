# 3. Pop-ups on the TV (TvOverlay)

Home Assistant sends a small web request to the TV; **TvOverlay** draws a pop-up over whatever is playing: a doorbell snapshot, "bins out tonight", "garage still open", an emergency alert.

## How it fits together

```
camera motion / bin night / garage / emergency feed
        │  (automation)
        ▼
script.tv_popup  ──reads──  sensor.tv_kit_config  (TV list, HA URL)
        │  for each TV whose media_player is on
        ▼
rest_command.tvoverlay_notify  ──HTTP POST :5001──▶  TvOverlay on the TV
```

## Step 1: install TvOverlay on each TV

1. Play Store on the TV → **TvOverlay** → Install → open it once.
2. Let it draw over other apps:
   ```powershell
   .\tweaks.ps1 -Tv 192.168.1.60 -Name living-room -TvOverlay
   ```
   ```bash
   ./tweaks.sh 192.168.1.60 living-room tvoverlay
   ```
3. Test from your computer:
   ```powershell
   .\test-popup.ps1 -Tv 192.168.1.60
   ```
   ```bash
   ./test-popup.sh 192.168.1.60
   ```
   A pop-up should appear top right.

> **Security:** TvOverlay listens on port **5001 with no authentication**. Anything on your network can put text and images on your TV. That's acceptable on a home network you trust; put visitors and smart gadgets you don't trust on a **guest Wi-Fi** that can't reach the TVs, and never forward port 5001 from the internet.

Other pop-up apps exist (PiPup, "Notifications for Android TV"), but at the time of writing PiPup is no longer distributed and the other is region-locked in some countries. TvOverlay's API: `title`, `message`, `image` (URL, MDI icon or base64), `video` (RTSP/HLS), `smallIcon`, `smallIconColor`, `corner` (`top_start`, `top_end`, `bottom_start`, `bottom_end`), `duration` (seconds).

## Step 2: configure the kit

In `/config/packages/tv_kit_config.yaml`:

```yaml
ha_url: "http://192.168.1.50:8123"     # how the TV reaches HA: use the IP, TVs often can't resolve .local
tvs: >-
  {{ {
    'media_player.living_room_tv': '192.168.1.60',
    'media_player.bedroom_tv': '192.168.1.61'
  } }}
phone_notify: "{{ ['notify.mobile_app_your_phone'] }}"
```

The `rest_command` is already in that file. Check configuration and restart. Then test from Developer tools → Actions:

```yaml
action: script.tv_popup
data:
  title: Hello
  message: From Home Assistant
  icon: mdi:home
```

Use `script.tv_popup` in any automation of your own. One TV failing (off, unplugged) never stops the others.

## Doorbell or camera motion → pop-up with a snapshot

Use the blueprint: Settings → Automations & scenes → **Blueprints** → *Camera motion or doorbell → TV pop-up* → Create automation. Pick:

- **Motion or doorbell:** an event entity such as `event.front_door_motion` or `event.front_door_ding` (Ring, Reolink, UniFi Protect and others), or a motion `binary_sensor`.
- **Camera:** the camera for the snapshot. Battery cameras often have no live still; try the "last recording" camera if the pop-up shows no picture.
- Title, message, seconds on screen, cooldown (default 3 minutes so a busy driveway doesn't flood the screen), and optionally a phone alert too.

Make one automation per camera.

**Privacy:** the snapshot link is the camera's `entity_picture`, a short-lived, tokenised link served by HA. Never save snapshots into `/config/www`: everything there is readable on your network **without logging in**.

## Bin night

`tv_kit_bins.yaml` runs at 18:00 on the day before collection: a phone alert and a TV pop-up naming the bins, with a coloured bin picture.

1. Install the community **Waste Collection Schedule** integration and set it up for your council (many councils worldwide are supported; check its docs). Create a sensor whose value is **days until the next collection** (value template `{{ value.daysTo }}`).
2. Put the sensor and calendar entity IDs in `bin_days_sensor` and `bin_calendar` in `tv_kit_config.yaml`.
3. Copy `dashboard/house-twin/bin-red.png`, `bin-yellow.png`, `bin-green.png` to `/config/www/tv/`.
4. Bin colours differ between councils: edit the keywords and image names in `tv_kit_bins.yaml` to match yours. Change the time in its `at:` line.

## Garage left open

`tv_kit_garage.yaml`: after 10 minutes open, a phone alert with the garage camera attached, repeating every 30 minutes and cleared automatically when the door closes; at 9 pm, if it's still open, a phone alert and a red TV pop-up.

1. You need a door sensor: a contact or tilt sensor on the door (Zigbee, Bluetooth such as Shelly BLU Door/Window with an ESPHome Bluetooth proxy, or your opener's own integration).
2. In `tv_kit_config.yaml`, point `binary_sensor.tv_kit_garage_door` at your sensor (`on` = open), and set `garage_camera` if you have one.

The kit only **notifies**. It never opens or closes the door.

## Emergency alerts from a local feed (example: bushfires)

`tv_kit_emergency.yaml` watches a **geo_location** feed: whenever a new incident appears within the radius of your home, you get a critical phone alert (breaks through silent mode), a red 60-second TV pop-up and a loud announcement on your speakers, even in quiet hours.

**This supplements official warnings; it is not a warning system.** Feeds can be late, incomplete or offline. Keep your official emergency app, radio and local alerts.

1. Add a feed for your area. The example is the Queensland (Australia) bushfire feed, which is configured in YAML:
   ```yaml
   geo_location:
     - platform: qld_bushfire
       radius: 20            # km around your Home zone
   ```
   Other feeds with geo_location entities include the NSW Rural Fire Service feed, GeoNet NZ (quakes and volcanoes), USGS earthquakes, and the generic GeoJSON and GeoRSS platforms (point them at your local emergency service's public feed if it publishes one). Check Settings → Devices & services → Add integration and the HA integrations list for your region.
2. Open any `geo_location.*` entity in Developer tools → States and copy its `source` attribute into `emergency_sources` in `tv_kit_config.yaml`. Set `emergency_title` to what the alert should say.

Test without a real incident: the automation needs a real feed event, so test its pieces from Developer tools → Actions instead: `script.tv_popup` with a red `color` and `duration: 60`, `script.phone_notify` with `level: critical`, and `script.announce` with `priority: emergency`. To check the feed itself, temporarily raise its `radius` until an incident appears, then set it back.

## Troubleshooting

| Symptom | Check |
|---|---|
| No pop-up at all | Run `test-popup` from your computer. If that fails, TvOverlay isn't running or lacks the overlay permission. |
| Test works, HA doesn't | The TV's `media_player` must be **on** (the script skips TVs that are off); check the IP in `tvs`; look at the automation's trace. |
| Pop-up without the picture | `ha_url` must be reachable **from the TV** (use the IP). Battery cameras may have no live still: use the last-recording camera. |
| Pop-ups stopped after a TV update | Re-run the TvOverlay tweak; updates can reset the overlay permission. |
