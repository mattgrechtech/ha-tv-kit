# 6. Energy

Goal: see what you use, what solar you export, what it costs, and when. Everything here is optional and the kit works without it.

## Where the data can come from

| Source | Detail | Delay | Who installs |
|---|---|---|---|
| **Smart plugs with metering** | Per appliance (fridge, pump, dryer) | Live | You |
| **Your retailer or smart meter** via an integration | Whole house, usually half-hourly, split by tariff band | Often 1–2 days | You (if an integration exists) |
| **Meter data CSV** from your distributor/retailer portal | Whole house | Whenever you import | You |
| **Inverter / battery integration** | Solar generation, battery | Live | You (if the inverter has a local API or cloud integration) |
| **Switchboard monitor** with CT clamps (e.g. Shelly Pro 3EM class) | Whole house live, and solar generation | Live | **Licensed electrician** |

### Retailer integrations are examples, not requirements

Check Settings → Devices & services → Add integration, and the community store, for your retailer, meter or inverter. Some examples people use: Octopus Energy (UK), Amber Electric (Australia, official API with live prices), Tibber, Opower-based US utilities, and community integrations for retailers without a public API (for example **Haggle** for AGL in Australia). Community integrations that log into your account are unofficial: they can break when the retailer changes its app, and they hold your account credentials, so read their code/issues and keep them updated.

**Installing a community integration without HACS:** in the Terminal app, download the project's release from its GitHub page, copy its `custom_components/<name>` folder into `/config/custom_components/`, and restart. With HACS (or the community store built into recent HA versions) use the store instead.

## The Energy dashboard

Settings → Dashboards → **Energy**:

- **Grid consumption:** add the integration's **long-term statistics** (Developer tools → Statistics shows them, e.g. `retailer:consumption_peak_ACCOUNT`), not a once-a-day sensor (that draws a whole day as one bar).
- If your data is **split by tariff band** (peak / off-peak / shoulder), add **each band** as its own consumption source and **not the total as well**, or you'll count everything twice.
- **Return to grid:** solar export, on **one** grid connection only. Don't add export as "solar production": a meter only sees what you didn't use. Real generation needs an inverter integration or a switchboard monitor.
- **Costs:** use the integration's cost statistics, or a fixed price per kWh, or an entity with the current price.
- Add plugs under **Individual devices**.

Editing energy settings by hand (`/config/.storage/energy`) is only safe with HA Core stopped (`ha core stop` … `ha core start`). Use the UI where you can.

## Tariff rates as configuration

Rates live in two places, both plain config:

- **House twin:** `CONFIG.tariff` at the top of `house-twin.js`: bands by hour with a rate and colour, plus `otherwise` for the remaining hours. A flat tariff is `bands: []` with `otherwise: { name: 'Flat rate', rate: 0.30 }`. Rates are per kWh **including tax**, from your latest bill. Bands may wrap midnight (`from: 21, to: 7`).
- **Card dashboard:** the peak-hour chip in `home-dashboard.example.yaml` (edit the hours).

Re-check them whenever your retailer changes prices.

## Making sense of it

- Retailer data lags: the House twin's Energy view opens on the **latest day with data**; days not in yet say so. If your meter is already in HA's Energy dashboard, the panel finds it automatically; if you prefer a different series (say, a retailer's peak/off-peak split), list it under `energy.import` / `export` / `cost` in the panel CONFIG.
- Live power sensors added to the Energy dashboard (grid, solar, battery or device power) light up the Energy view's **Now** button.
- The House twin's **cost heatmap** (Energy view) prices every hour of the last 14 days at your rates. Bright cells in the peak band are where shifting usage (dishwasher, dryer, pool pump, hot water) saves the most.
- Plugs answer "what does that one thing cost?": the House twin prices each appliance's monthly kWh at your 24-hour average rate.
- To dig deeper, copy HA's database (`home-assistant_v2.db`, from a backup) and read it **read-only** with Python's `sqlite3`: `statistics_meta` gives the IDs, `statistics` holds hourly rows; the difference in the `sum` column per hour is the energy used. Compare against older bills: a sudden jump in one tariff band (for example after a hot-water system was replaced) shows up clearly.
