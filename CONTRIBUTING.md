# Contributing to ha-tv-kit

Thanks for helping. The kit is meant to work for any home, so contributions that make it more general are the most valuable: debloat lists for other TV models, other emergency feeds, other kiosk apps, translations of the docs, fixes for newer Home Assistant versions.

## Ground rules

1. **No personal details, ever.** No real IPs (use `192.168.1.50` for Home Assistant and `192.168.1.60`–`.69` for TVs), MAC addresses, e-mail addresses, names, addresses or suburbs, account or meter numbers, tokens, or device-specific entity IDs. Use placeholders like `media_player.living_room_tv` and `sensor.fridge_plug_power`.
2. **Run the checks** before opening a pull request:
   ```bash
   pip install pyyaml
   python tools/validate.py
   ```
   It parses every YAML and JSON file, runs `node --check` on the House twin panel, and scans for private IPs, MACs, e-mails and token-like strings.
3. **Keep it reversible.** Anything that changes a TV must be undone by `restore.ps1` / `restore.sh`. New settings go in the snapshot list in both `tv/powershell/common.ps1` and `tv/bash/common.sh`.
4. **Keep both script flavours in step.** A change to a PowerShell TV script needs the same change in the bash version.
5. **Config in one place.** New HA values go in `tv_kit_config.yaml` (as an attribute, read with `state_attr('sensor.tv_kit_config', ...)`), or as blueprint inputs. New panel options go in the `CONFIG` block at the top of `house-twin.js`.
6. **Docs for non-experts.** Say where to click, what to type and how to check it worked. Note any security trade-off.
7. **Official sources only** for anything people download: the Play Store, a project's own GitHub releases.

## Debloat lists

Add a file to `tv/packages/examples/` named after the brand and model family (e.g. `hisense-google-tv.txt`). Include the Android version and region you tested, split lines into Tier 1 (clearly safe) and Tier 2 (only if unused, commented out), and give every line a short comment saying what the package is. If you find a package that must never be disabled, add it to `tv/packages/never-disable.txt`.

## Pull requests

- One topic per pull request, with a short description of what you tested and on which HA version / TV model.
- Add a line to `CHANGELOG.md` under "Unreleased".
- By contributing you agree your contribution is released under the MIT licence.

## Reporting problems

Open an issue with your HA version, TV model and Android version, what you expected and what happened. Include logs or traces **with personal details removed**. For security issues, see [SECURITY.md](SECURITY.md) instead.
