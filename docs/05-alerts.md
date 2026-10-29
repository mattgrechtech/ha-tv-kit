# 5. Alerts: something broke, the fridge, and spoken announcements

All alerts go through `script.phone_notify`, which sends to every notify action in `phone_notify` (`tv_kit_config.yaml`). Install the **Home Assistant Companion app** on each phone first; the notify action is named after the phone (`notify.mobile_app_<phone_name>`; find it in Developer tools → Actions).

`script.phone_notify` levels: `normal`, `time-sensitive` (shows through Focus/Do Not Disturb on iOS, high priority on Android) and `critical` (breaks through silent mode; iOS asks permission for critical alerts the first time). Alerts with a `tag` replace each other and clear themselves when the problem is fixed.

## Something went offline

`tv_kit_health.yaml` needs no entity IDs. Instead you **label** what matters:

1. Settings → Labels → Create label **watch** (or set `watch_label` to another name).
2. Give that label to the entities you'd miss: each camera, each TV's media player, your energy sensor, the fridge plug's power sensor, the bin schedule sensor, a phone's battery sensor.
3. When any of them stays `unavailable`/`unknown` for `watch_offline_minutes` (default 60), you get one alert listing them all; it clears itself when they're back.

`sensor.tv_kit_watched_offline` (a count, with the names as an attribute) is handy on a dashboard too.

## Automation and integration errors

The same package alerts you (at most once every 10 minutes) when an automation, script, `rest_command` or custom integration logs an **ERROR**, quoting the first part of the message. Fix the cause in Settings → System → Logs.

Ideas for more checks: data that stops updating (a retailer sensor whose `last_updated` is more than two days old), a phone that hasn't reported in a day, HA's own disk getting full (System Monitor integration).

## Appliance watchdog: the fridge stopped cooling, or runs non-stop

A smart plug that measures power (Tapo P110, Shelly Plug, Zigbee plugs with metering, …) tells you a lot about a fridge or freezer. The compressor normally cycles: roughly 50–150 W while running, a few watts resting, switching every 30–60 minutes.

- **Not running for hours** → no power, a tripped circuit, a failed compressor.
- **Running for hours without a break** → the door is ajar, the seals have gone, or it's struggling.

Use the blueprint: Settings → Automations & scenes → Blueprints → *Appliance watchdog* → Create automation, and pick the plug's **power** sensor. Tunable inputs:

| Input | Default | Tune it by |
|---|---|---|
| Running above (W) | 25 | the plug's power history: halfway between "resting" and "running" |
| Alert if not running for | 3 h | the longest normal rest you see, plus margin (a defrost cycle can be long) |
| Alert if running non-stop for | 4 h | the longest normal run on a hot day, plus margin |
| Also show on the TVs | off | |

Watch a few days of history (click the sensor → the graph) before trusting the defaults. Make one automation per appliance.

Plug safety:
- **Hide the plug's switch** entity (Settings → Entities → the switch → Visible off) so nobody, and no automation, turns the fridge off by accident.
- In the plug's own app, set **power-on state after an outage = on**.
- Fridges and freezers are fine on a plug rated for them; don't put heaters, kettles or other high-draw appliances on a plug that isn't rated for the load. Anything wired into the mains (switchboard monitors, relays behind wall switches, hot water, pool pumps) is a job for a **licensed electrician**.

"The washing machine finished" is a different pattern (power drops after running), so it isn't this blueprint. Build it as a simple automation: power below 3 W for 2 minutes after having been above 10 W → `script.phone_notify` / `script.announce`.

## Spoken announcements (Sonos or other speakers)

`script.announce` speaks a message on your speakers:

```yaml
action: script.announce
data:
  message: Bins out tonight, recycling week
  priority: normal          # or emergency
```

- **Normal** messages play at `volume_day`, at `volume_evening` after `evening_start`, and **not at all during quiet hours** (`quiet_start`–`quiet_end`, default 21:00–07:00).
- **Emergency** messages play on every speaker at `volume_emergency`, at any time.
- Speakers: the `speakers` list in `tv_kit_config.yaml`, or every available Sonos speaker if it's empty, or a list passed to the script.
- Voice: `tts_entity` (e.g. the Google Translate TTS integration, HA Cloud, or a local Piper voice).

**Sonos** is discovered automatically (it must be on the same network/subnet as HA). The announcement ducks the music and resumes it. Other speakers (Google/Nest, Echo via community integrations, any `media_player` with TTS) mostly work too; the `announce`/`volume` options are Sonos features and are ignored or may need removing for some players.

### Double NAT gotcha

If HA's UPnP integration shows a private "external" IP, your mesh router sits behind your internet provider's router. Devices connected to the provider's router are on a different subnet and HA can't discover them (Sonos, TVs). Fix by moving every device to the main router's network, or setting the provider's router to bridge mode.
