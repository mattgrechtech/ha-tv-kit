# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Cross-references to the companion app [TV Kiosk](https://github.com/mattgrechtech/ha-tv-kiosk): README section, a third kiosk option in docs/04, the TvOverlay-compatible pop-up route in docs/03.

### Changed
- Blueprint `source_url` now points at the published repository.

## [0.1.0] - 2026-10-29

### Added
- Home Assistant packages: one config file (`tv_kit_config.yaml`), TvOverlay `rest_command`, `script.tv_popup`, `script.phone_notify`, `script.announce` (quiet hours, emergency priority).
- Automations: bin night reminder, garage left open, emergency-feed alert (Queensland bushfire example), offline-entity alerts by label, automation/integration error alerts.
- Blueprints: camera motion or doorbell → TV pop-up with snapshot; appliance power watchdog (fridge stopped cooling / running non-stop).
- House twin panel with a single CONFIG block: house, energy and TV modes; render placeholder; AI render prompt guide.
- Card dashboard example and card installer.
- TV scripts for PowerShell and bash: backup, reversible debloat with a protected-package list, restore, tweaks (animations, private DNS, TvOverlay, Aerial Views, background playback, sleep timer), test pop-up. Example debloat lists.
- Hyper-V VM script for Home Assistant OS.
- ha-mcp allow/ask permission example for Claude Code.
- `tools/validate.py`: YAML/JSON/JS checks and a privacy scan.
- Docs 01–07, README, CONTRIBUTING, SECURITY, MIT licence.
