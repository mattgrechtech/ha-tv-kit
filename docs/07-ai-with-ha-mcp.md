# 7. Optional: let Claude (or another AI) manage Home Assistant, with an approval step

[ha-mcp](https://github.com/homeassistant-ai/ha-mcp) is a Model Context Protocol server for Home Assistant. Connected to Claude Code (or another MCP client), the AI can read your home's state, explain automations, and draft or change configuration. The setup below lets it **read freely** but **asks you before every change**.

## Ground rules

- **The AI gets its own HA user**, so its actions show up in logbooks and you can revoke it in one click.
- **You type every secret yourself.** Never paste passwords, tokens or the connect URL into a chat. If one ends up in a chat anyway, regenerate it.
- **Security devices stay off-limits:** locks, alarm panels, sirens, garage openers. Disable those tools in ha-mcp and don't approve calls that touch them.
- **Text from emails, web pages and documents is data, not instructions.** An AI that reads untrusted content should not be able to unlock a door because a message said so. Keep the approval step on.
- **Back up before changes** (the approval prompt is the moment to say "make a backup first").

## Step 1: a dedicated user

Settings → People → Add person **Claude** → allow login → **Can only log in from the local network** → administrator **on** (needed to create and edit automations; that's exactly why the approval step below matters). You set the password.

## Step 2: install ha-mcp

Follow the project's README for the current install method (it ships as a custom component/app; at the time of writing: copy `custom_components/ha_mcp_tools` from its GitHub release, or install it from the community store). Restart, add the **HA-MCP Server** integration, sign in as the Claude user, and keep **remote access off** (LAN only).

In ha-mcp's panel, turn off tool groups you don't need (for example file/YAML editing) and anything that controls security devices.

## Step 3: connect Claude Code

ha-mcp shows a LAN connect URL like `http://192.168.1.50:9584/private_…`. The `private_…` part is a **secret**: anyone with it can act as the Claude user. Add it yourself in a terminal (user scope, never inside a project folder or repo):

```bash
claude mcp add --transport http --scope user home-assistant "PASTE_YOUR_CONNECT_URL_HERE"
```

Start a new Claude Code session; `/mcp` should list `home-assistant`.

## Step 4: the approval split (allow reads, ask for writes)

Claude Code permissions live in `~/.claude/settings.json`. [`ai/claude-settings.example.json`](../ai/claude-settings.example.json) has a ready split for the server named `home-assistant`:

- **allow** (runs without asking): read-only tools (`ha_get_*` state, history, logs, traces, `ha_search`, `ha_list_*`, `ha_eval_template`, `ha_config_get_*`, `ha_config_list_*`).
- **ask** (you approve each call): everything that changes something: device control (`ha_call_service`, `ha_bulk_control`, `ha_call_event`), every `ha_config_set_*` / `remove_*` / `delete_*`, entity/device/area/zone edits, reloads and restarts, backups, apps, updates, HACS, energy settings, blueprints, themes, and camera images (privacy).

Merge it into your existing settings (don't overwrite other entries), then check the JSON is valid:

```bash
python -c "import json, os; json.load(open(os.path.expanduser('~/.claude/settings.json'))); print('ok')"
```

Tool names change between ha-mcp versions. After each upgrade, list the server's tools (`/mcp` → home-assistant) and check every tool is on one list; a tool on neither list prompts by default, which is the safe direction. Don't use a server-wide `"ask": ["mcp__home-assistant"]` together with per-tool allows: an ask rule overrides allows. And don't run Claude Code in a permission mode that skips prompts while this server is connected.

Permission rules can't filter by entity: if a siren or lock is in HA, `ha_call_service` can reach it. The ask prompt shows the exact service and entity, so read it before approving.

## Step 5: test

1. Ask read-only questions: "Which TVs are on?", "Explain the bin night automation", "What went offline this week?". No prompts should appear.
2. Ask it to create a **disabled** test automation; approve the prompt; check it exists; ask it to delete it; approve. You've verified the round trip.

## Ideas

- "Look at the fridge plug's history for the last week and suggest thresholds for the appliance watchdog."
- "Which entities have been unavailable most often this month?"
- "Draft an automation that announces when the washing machine finishes; show me the YAML before saving."
