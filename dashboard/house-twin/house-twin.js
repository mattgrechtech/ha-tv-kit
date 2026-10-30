// House twin: a Home Assistant sidebar panel showing an illustrated house with live state.
// Part of ha-tv-kit (MIT). Registered via panel_custom in configuration.yaml; Home Assistant passes
// the `hass` object in, so the panel needs no tokens.
// Files live in /config/www/house-twin/ (house-twin.js, day.jpg, dusk.jpg, night.jpg, bin-*.png)
// and are served at /local/house-twin/. See docs/04-tv-dashboard.md.
//
// ===== CONFIG: EDIT THIS BLOCK FOR YOUR HOME ===============================================================
// Every entity ID below is a placeholder. Find yours in Developer tools → States. Anything your home doesn't
// have can be deleted from its list (or left: missing entities show as "—" or are skipped).
// Positions are percentages of your render: [left %, top %]. Open the render in an image editor, hover the
// spot, and divide x by the width and y by the height (×100). docs/04-tv-dashboard.md has a quick method.
const CONFIG = {
  title: 'Our House',
  base: '/local/house-twin/',
  locale: undefined,               // e.g. 'en-AU', 'en-GB', 'en-US'; undefined = the browser's language
  currency: '$',
  render: { width: 1376, height: 768 },   // pixel size of your renders (all three must match)

  // TVs: tap the hotspot to toggle the TV. `glow` lights the room when the TV is on: [left, top, size %].
  tvs: [
    { name: 'Living room TV', entity: 'media_player.living_room_tv', at: [46, 35], glow: [47, 35, 10] },
    { name: 'Bedroom TV', entity: 'media_player.bedroom_tv', at: [69.5, 70], glow: [66, 73, 16] },
  ],

  // Cameras: pulse for motionSeconds after motion; tap = snapshot card. `motion` may be an event entity
  // (Ring and many others: event.<name>_motion) or a motion binary_sensor. `recording` is an optional
  // fallback still (battery cameras often have no live still ready).
  cameras: [
    { name: 'Front door', camera: 'camera.front_door_live_view', recording: 'camera.front_door_last_recording', motion: 'event.front_door_motion', at: [47.5, 68] },
    { name: 'Driveway', camera: 'camera.driveway_live_view', recording: 'camera.driveway_last_recording', motion: 'event.driveway_motion', at: [5.5, 47] },
  ],
  motionSeconds: 90,

  // Garage door: `door` is the rectangle of the door on the render [left, top, width, height] in %; it
  // darkens when open. Set garage: null if you don't have one.
  garage: { entity: 'binary_sensor.garage_door', at: [13.4, 46], door: [7.1, 51.6, 12.6, 7.4] },

  // Appliances on energy-monitoring smart plugs. Measure only: the panel never switches them. In the Energy
  // view their hotspots show the selected hour's use.
  appliances: [
    { name: 'Fridge', power: 'sensor.fridge_plug_power', today: 'sensor.fridge_plug_energy_today', month: 'sensor.fridge_plug_energy_this_month',
      at: [61, 53], runningAbove: 10 },   // optional `energy:` statistic for the Energy view's hourly figures (default: `today`)
  ],

  // Warm room lights that come on as it gets dark: [left, top, size %].
  roomGlows: [[52, 38, 22], [61, 49, 13]],
  // Water ripples (a pool or pond): [left, top]. Empty list = none.
  ripples: [],

  // Bins (Waste Collection Schedule). `types` are matched against the collection names; colours vary by
  // council, so match the keywords and images to your bins. The general-waste bin is always shown.
  bins: {
    sensor: 'sensor.waste_collection_schedule_next_bin_collection',   // value = days until next collection
    calendar: 'calendar.waste_collection_schedule_your_council',
    general: 'bin-red.png',
    types: [
      { match: /recycl/, label: 'Recycling', img: 'bin-yellow.png' },
      { match: /green|garden|organic/, label: 'Green waste', img: 'bin-green.png' },
    ],
  },

  // Electricity tariff, $/kWh incl. tax, by hour of day. Bands are [from, to) in 24 h hours; `peak: true`
  // shades those hours on the charts. Hours in no band use `otherwise`. A flat rate: bands: [].
  tariff: {
    bands: [
      { name: 'Peak', from: 16, to: 21, rate: 0.44, color: 'var(--alert)', peak: true },
      { name: 'Off-peak · solar hours', from: 9, to: 16, rate: 0.21, color: 'var(--ok)' },
    ],
    otherwise: { name: 'Shoulder', rate: 0.34, color: '#6f9fd8' },
  },

  // Energy view (optional). It appears only if your home has energy data: enabled 'auto' (the default) shows
  // it when data is found; true / false force it on or off. With nothing listed below, the panel reads Home
  // Assistant's own Energy dashboard settings (Settings → Dashboards → Energy): grid import and export, solar,
  // battery, individual devices, and their live power sensors if you added any. To use other statistics (for
  // example a retailer integration whose data arrives 1–2 days late), list them here: a filled list replaces
  // what the Energy dashboard says. Statistic IDs are in Developer tools → Statistics.
  energy: {
    enabled: 'auto',
    source: '',                    // shown next to the figures, e.g. 'Smart meter'
    import: [],                    // grid consumption, e.g. ['retailer:consumption_peak_ACCOUNT', 'retailer:consumption_offpeak_ACCOUNT']
    export: [],                    // energy sent to the grid
    solar: [],                     // solar production, if you measure it
    cost: [],                      // cost series for `import`; empty = priced from the tariff above
    bill: null,                    // optional sensor with the cost so far this bill
    // Live power sensors (W or kW): grid positive = importing, battery positive = discharging. Empty lists =
    // the Energy dashboard's power sensors, if any. The Now button only appears when a live sensor exists
    // (a switchboard monitor such as Shelly, IoTaWatt or Emporia, or the appliance plugs above).
    live: { grid: [], solar: [], battery: [] },
    note: '',
    tvCycleSeconds: 0,             // TV mode: > 0 alternates House and Energy every N seconds; 0 = only via the Energy button
  },

  // Emergency feed banner: geo_location entities whose `source` attribute is in this list.
  // Example: the Queensland (Australia) bushfire feed. Use your own region's feed (docs/03-tv-notifications.md).
  emergency: { sources: ['qld_bushfire'], label: 'Bushfire alert' },

  weather: null,                   // e.g. 'weather.home'; null = the first weather entity found
  // Energy replay lighting follows an approximate sun path: sunrise/sunset hours and the midday elevation.
  sunPath: { rise: 5.6, set: 18.4, maxElevation: 62 },
  // Energy-flow diagram nodes on the render: [left, top] in %.
  flows: { grid: [6.9, 92.7], home: [40.7, 57.3], solar: [88, 19.5] },
  tvHideSidebar: true,             // TV mode hides HA's own sidebar too (remembered in that browser only)
};
// ===== END OF CONFIG =======================================================================================

const TV_ON = ['on', 'playing', 'paused', 'idle', 'buffering'];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inBand = (b, h) => (b.from <= b.to ? h >= b.from && h < b.to : h >= b.from || h < b.to);
const BAND = h => CONFIG.tariff.bands.find(b => inBand(b, h)) || CONFIG.tariff.otherwise;
const RATE = h => BAND(h).rate;
const IS_PEAK = h => !!BAND(h).peak;
// An appliance runs around the clock, so price its energy at the 24-hour average rate.
const RATE_AVG = Array.from({ length: 24 }, (_, h) => RATE(h)).reduce((a, b) => a + b, 0) / 24;
const money = v => `${CONFIG.currency}${v.toFixed(2)}`;
const at = p => `left:${p[0]}%;top:${p[1]}%`;
const RW = CONFIG.render.width, RH = CONFIG.render.height;
const px = p => [p[0] / 100 * RW, p[1] / 100 * RH];
const sum = a => a.reduce((p, c) => p + c, 0);
const DAY = 86400000;
const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return +d; };
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return dayStart(d); };
const hh = h => `${String(h).padStart(2, '0')}:00`;
const kw = w => (Math.abs(w) >= 1000 ? `${(w / 1000).toFixed(1)} kW` : `${Math.round(w)} W`);

const CSS = `
:host { display: block; height: 100%; --ground:#1a1f24; --glass:rgba(20,26,31,.82); --line:rgba(255,255,255,.09); --text:#eef2f0; --muted:#93a39d;
  --warm:#ffc98a; --tv:#7fd6ff; --alert:#ff5a3c; --ok:#7cc29a; --data:"IBM Plex Mono",ui-monospace,Consolas,monospace;
  background: var(--ground); color: var(--text); font-family: "Manrope","Segoe UI",system-ui,sans-serif; }
.wrap { height: 100%; overflow: auto; padding: 16px; box-sizing: border-box; }
.app { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 16px; max-width: 1800px; margin: 0 auto; align-items: start; }
@media (max-width: 1000px) { .app { grid-template-columns: 1fr; } }
.menu { position: absolute; top: 12px; left: 12px; z-index: 5; background: rgba(14,18,22,.7); color: var(--text); border: 1px solid var(--line); border-radius: 10px; width: 38px; height: 38px; cursor: pointer; font-size: 18px; }
.stage { position: relative; width: 100%; aspect-ratio: ${RW}/${RH}; border-radius: 16px; overflow: hidden; background: radial-gradient(ellipse at 50% 40%, #2a3138, var(--ground) 70%); }
.layer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity 1.5s ease; }
.norender { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; color: var(--muted); font-size: 14px; padding: 24px; }
.norender[hidden] { display: none; }
.norender code { font-family: var(--data); color: var(--text); }
.ov { position: absolute; transform: translate(-50%,-50%); pointer-events: none; }
.glow { width: 16%; aspect-ratio: 1.6; border-radius: 50%; mix-blend-mode: screen; opacity: 0; transition: opacity 1s ease;
  background: radial-gradient(closest-side, var(--c, var(--warm)) 0%, transparent 100%); filter: blur(6px); }
.hot { pointer-events: auto; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: rgba(14,18,22,.72);
  border: 1px solid rgba(255,255,255,.25); color: var(--text); cursor: pointer; transition: transform .2s; padding: 0; }
.hot:hover, .hot:focus-visible { transform: translate(-50%,-50%) scale(1.12); outline: none; box-shadow: 0 0 0 3px var(--warm); }
.hot svg { width: 18px; height: 18px; fill: currentColor; }
.hot.active { color: var(--tv); border-color: var(--tv); }
.hot.warn { color: var(--alert); border-color: var(--alert); }
.lbl { position: absolute; left: 50%; top: 115%; transform: translateX(-50%); white-space: nowrap; font: 500 11px var(--data); background: rgba(14,18,22,.85);
  padding: 2px 7px; border-radius: 6px; color: var(--muted); opacity: 0; transition: opacity .2s; }
.hot:hover .lbl, .hot:focus-visible .lbl, .hot.showlbl .lbl { opacity: 1; }
.hot.showlbl .lbl { color: var(--text); }
.cam::before, .cam::after { content: ""; position: absolute; inset: -2px; border-radius: 50%; border: 2px solid var(--alert); opacity: 0; }
.cam.motion::before { animation: ring 1.6s ease-out infinite; } .cam.motion::after { animation: ring 1.6s ease-out .8s infinite; }
@keyframes ring { from { transform: scale(1); opacity: .9; } to { transform: scale(2.6); opacity: 0; } }
.garage { transform: none; border-radius: 3px; overflow: hidden; }
.garage i { position: absolute; inset: 0; background: linear-gradient(#090b0d,#20262b 70%,#2c3338); transform-origin: top; transform: scaleY(0); transition: transform 1.4s cubic-bezier(.5,.1,.2,1); }
.garage.open i { transform: scaleY(1); }
.ripple { width: 9%; aspect-ratio: 1; border-radius: 50%; border: 2px solid rgba(160,235,255,.5); animation: pool 4s ease-out infinite; opacity: 0; }
.ripple.d2 { animation-delay: 2s; }
@keyframes pool { 0% { transform: translate(-50%,-50%) scale(.3); opacity: .7; } 100% { transform: translate(-50%,-50%) scale(1.4); opacity: 0; } }
.banner { position: absolute; left: 50%; top: 14px; transform: translate(-50%,-180%); background: var(--alert); color: #fff; font-weight: 600; font-size: 14px;
  padding: 10px 16px; border-radius: 10px; box-shadow: 0 8px 30px rgba(255,90,60,.4); transition: transform .5s cubic-bezier(.3,1.4,.5,1); max-width: 80%; }
.banner.show { transform: translate(-50%,0); }
.vig { position: absolute; inset: 0; pointer-events: none; transition: box-shadow 1s; }
.vig.show { box-shadow: inset 0 0 140px 30px rgba(255,70,40,.45); }
.clock { position: absolute; left: 2.2%; top: 5%; text-shadow: 0 2px 16px rgba(0,0,0,.6); }
.clock .t { font-weight: 700; font-size: clamp(28px,4.2vw,64px); line-height: .95; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.clock .d { font: 500 13px var(--data); color: var(--muted); margin-top: 4px; }
.tariff { display: inline-flex; gap: 8px; align-items: center; margin-top: 10px; font-weight: 600; font-size: 13px; background: rgba(14,18,22,.7); padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line); }
.tariff b { width: 9px; height: 9px; border-radius: 50%; background: var(--c); }
.panel { background: var(--glass); border: 1px solid var(--line); border-radius: 16px; padding: 18px; display: grid; gap: 16px; }
.panel h2 { font-weight: 700; font-size: 20px; margin: 0; }
.sec { display: grid; gap: 8px; }
.sec[hidden] { display: none; }
.eyebrow { font: 500 11px var(--data); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); display: flex; justify-content: space-between; gap: 8px; }
.kpis { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; }
.kpi { background: rgba(255,255,255,.04); border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; }
.kpi .v { font: 500 17px var(--data); font-variant-numeric: tabular-nums; }
.kpi .k { font-size: 11px; color: var(--muted); }
.row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 14px; }
.row small, .muted { color: var(--muted); font-size: 12px; }
.pill { font: 500 12px var(--data); padding: 3px 9px; border-radius: 99px; background: #22303a; color: var(--muted); border: 0; cursor: pointer; }
.pill.on { background: #173a4a; color: var(--tv); } .pill.warn { background: #4a1f17; color: var(--alert); }
.binrow { display: flex; gap: 10px; align-items: center; }
.binrow img { width: 30px; transition: filter .3s, opacity .3s; } .binrow img.dim { filter: grayscale(1); opacity: .3; }
.col { display: grid; gap: 16px; min-width: 0; }
.tabs { display: flex; gap: 4px; background: rgba(255,255,255,.05); padding: 4px; border-radius: 10px; }
.tabs button { flex: 1; border: 0; background: transparent; color: var(--muted); font: 600 13px inherit; padding: 7px; border-radius: 7px; cursor: pointer; }
.tabs button[aria-pressed="true"] { background: rgba(255,255,255,.12); color: var(--text); }
/* Energy appears only when the panel found energy data (or it is forced on). */
.needs-energy { display: none !important; }
:host([energy-on]) .tabs.needs-energy { display: flex !important; }
:host([energy-on]) .sec.needs-energy { display: grid !important; }
.flows { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0; transition: opacity .6s; }
.flows.show { opacity: 1; }
.flows .wire { fill: none; stroke: rgba(255,255,255,.12); stroke-linecap: round; }
.flows .run { fill: none; stroke-linecap: round; stroke-dasharray: 2 22; animation: run var(--dur, 1.5s) linear infinite; transition: stroke-width .5s, opacity .5s; }
.flows .run.rev { animation-direction: reverse; }
@keyframes run { to { stroke-dashoffset: -96; } }
.flows .node { fill: rgba(14,18,22,.82); stroke-width: 3; }
.flows text { font: 600 22px "Manrope", system-ui, sans-serif; fill: var(--text); }
.flows .sub { font: 500 18px var(--data); fill: var(--muted); }
.ecard { background: var(--glass); border: 1px solid var(--line); border-radius: 16px; padding: 16px; display: grid; gap: 12px; }
.ecard[hidden] { display: none; }
.etop { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
.etop h3 { margin: 0; font-size: 17px; }
.ectl { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ectl .edate { min-width: 9em; text-align: center; font: 600 14px var(--data); }
.ebtn { border: 1px solid var(--line); background: rgba(255,255,255,.06); color: var(--text); border-radius: 8px; padding: 8px 14px; font: 600 14px inherit; cursor: pointer; }
.ebtn[disabled] { opacity: .35; cursor: default; }
.ebtn.on { background: #173a4a; color: var(--tv); border-color: var(--tv); }
.hourrow { display: flex; gap: 12px; align-items: center; }
.hourrow input { flex: 1; accent-color: var(--warm); }
.hourrow output { font: 600 14px var(--data); min-width: 3.2em; text-align: right; }
.ecard .empty { color: var(--muted); font-size: 14px; padding: 18px 0; text-align: center; }
.chart svg { width: 100%; height: auto; display: block; }
.chart text { font: 500 11px var(--data); fill: var(--muted); }
.legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: var(--muted); }
.legend b { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.devs { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px 16px; font-size: 13px; }
.devs:empty { display: none; }
.devs .row span:last-child { font-family: var(--data); color: var(--muted); }
.heat svg { width: 100%; height: auto; display: block; }
.heat text { font: 500 10px var(--data); fill: var(--muted); }
.heat rect.c:hover { stroke: #fff; stroke-width: 1.5; }
.camcard { position: absolute; right: 2%; top: 4%; width: min(46%, 520px); background: rgba(14,18,22,.92); border: 1px solid var(--line);
  border-radius: 14px; padding: 10px; display: grid; gap: 8px; z-index: 6; box-shadow: 0 20px 60px rgba(0,0,0,.5);
  transform: translateY(-10px) scale(.97); opacity: 0; pointer-events: none; transition: transform .25s, opacity .25s; }
.camcard.show { transform: none; opacity: 1; pointer-events: auto; }
.camview { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 8px; background: #0b0e11; overflow: hidden; }
.camview img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .4s; }
.camview img.ready { opacity: 1; }
.camstate { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 10px; color: var(--muted); font-size: 13px; text-align: center; padding: 16px; }
.camstate[hidden] { display: none; }
.spin { width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgba(255,255,255,.12); border-top-color: var(--warm); animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.menu[hidden] { display: none; }
.camcard .row button { border: 1px solid var(--line); background: rgba(255,255,255,.06); color: var(--text); border-radius: 8px; padding: 6px 10px; cursor: pointer; font: 600 12px inherit; }
.viewbtn { position: absolute; right: 2%; bottom: 4%; z-index: 4; display: none; }
/* Large, visible focus for TV remotes (D-pad). */
button:focus-visible, input:focus-visible { outline: 4px solid var(--warm); outline-offset: 3px; }
:host([tv]) button:focus, :host([tv]) input:focus { outline: 4px solid var(--warm); outline-offset: 3px; }
:host([tv]) .hot:focus { outline: none; box-shadow: 0 0 0 4px var(--warm); }
/* TV mode: full screen, no side panel, ticker along the bottom. In the Energy view the house shrinks into the
   top ~60% and the energy card docks underneath, so nothing covers the house. */
:host([tv]) .wrap { padding: 0; overflow: hidden; }
:host([tv]) .app { grid-template-columns: 1fr; max-width: none; height: 100%; }
:host([tv]) .panel, :host([tv]) .menu { display: none; }
:host([tv]) .col { height: 100vh; display: flex; flex-direction: column; justify-content: center; gap: 0; }
:host([tv]) .stage { border-radius: 0; flex: none; width: min(100%, calc(100vh * ${RW} / ${RH})); margin: 0 auto; }
:host([tv][energy-on]) .viewbtn { display: block; }
:host([tv][view="energy"]) .viewbtn, :host([tv][view="energy"]) .ticker { display: none; }
:host([tv][view="energy"]) .stage { width: min(100%, calc(60vh * ${RW} / ${RH})); border-radius: 0 0 14px 14px; }
:host([tv][view="energy"]) .col { justify-content: flex-start; }
:host([tv]) .ecard { flex: 1; min-height: 0; overflow: hidden; margin: 1vh 2% 1.5vh; padding: 1.2vh 1.4vw; gap: 1vh; background: rgba(14,18,22,.85);
  align-content: start; font-size: clamp(13px, 1.1vw, 20px); }
:host([tv]) .ecard .heat, :host([tv]) .ecard #chart14 { display: none; }
:host([tv]) .ecard .chart svg { max-height: 19vh; }
:host([tv]) .ebtn { font-size: clamp(14px, 1.1vw, 20px); padding: .6vh 1vw; }
.ticker { display: none; }
:host([tv]) .ticker { display: flex; position: absolute; left: 0; right: 0; bottom: 0; gap: 28px; justify-content: center; align-items: center;
  padding: 12px 20px; background: linear-gradient(transparent, rgba(10,13,16,.85)); font: 500 clamp(13px, 1.3vw, 20px) var(--data); color: var(--text); }
:host([tv]) .ticker span b { color: var(--muted); font-weight: 500; margin-right: 8px; }
.tvbtn { border: 1px solid var(--line); background: rgba(255,255,255,.06); color: var(--text); border-radius: 8px; padding: 8px; font: 600 13px inherit; cursor: pointer; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;

const ICON = {
  tv: '<path d="M21 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5v2h8v-2h5a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H3V5h18z"/>',
  cam: '<path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11z"/>',
  garage: '<path d="M22 9 12 2 2 9v13h4v-9h12v9h4zM8 15h8v2H8zm0 3h8v2H8z"/>',
  plug: '<path d="M7 2h10a2 2 0 0 1 2 2v5H5V4a2 2 0 0 1 2-2m12 17a2 2 0 0 1-2 2v1h-2v-1H9v1H7v-1a2 2 0 0 1-2-2v-9h14v9M8 5v2h2V5H8m0 7v3h2v-3H8z"/>',
};
const hot = (id, p, icon, label, cls = '') =>
  `<button class="ov hot ${cls}" id="${id}" style="${at(p)}" aria-label="${esc(label)}"><svg viewBox="0 0 24 24">${ICON[icon]}</svg><span class="lbl" id="${id}L">${esc(label)}</span></button>`;

function buildHtml() {
  const C = CONFIG, B = C.base, E = C.energy || {};
  const [g, h, s] = [px(C.flows.grid), px(C.flows.home), px(C.flows.solar)];
  const curve = (a, b) => `M${a[0]} ${a[1]} C ${a[0] + (b[0] - a[0]) * .4} ${a[1]}, ${b[0] - (b[0] - a[0]) * .3} ${b[1] + (a[1] - b[1]) * .4}, ${b[0]} ${b[1]}`;
  const peakBand = C.tariff.bands.find(b => b.peak);
  const peakTxt = peakBand ? `${peakBand.name} ${peakBand.from}–${peakBand.to}h` : '';
  return `
<div class="wrap"><div class="app"><div class="col">
  <section class="stage">
    <button class="menu" id="menu" aria-label="Show sidebar">☰</button>
    <div class="norender" id="norender" hidden><div>No house render yet. Put <code>day.jpg</code>, <code>dusk.jpg</code> and <code>night.jpg</code>
      in <code>/config/www/house-twin/</code><br>(see dashboard/house-twin/RENDERS.md), then bump <code>?v=</code> and reload.</div></div>
    <img class="layer" id="day" src="${B}day.jpg" alt="Illustrated cutaway of the house">
    <img class="layer" id="dusk" src="${B}dusk.jpg" alt="" style="opacity:0">
    <img class="layer" id="night" src="${B}night.jpg" alt="" style="opacity:0">
    ${C.roomGlows.map((p, i) => `<div class="ov glow" id="gRoom${i}" style="${at(p)};width:${p[2] || 16}%"></div>`).join('')}
    ${C.tvs.map((t, i) => t.glow ? `<div class="ov glow" id="gTv${i}" style="${at(t.glow)};width:${t.glow[2] || 12}%;--c:var(--tv)"></div>` : '').join('')}
    ${C.ripples.map(p => `<div class="ov ripple" style="${at(p)}"></div><div class="ov ripple d2" style="${at(p)}"></div>`).join('')}
    ${C.garage ? `<div class="ov garage" id="garage" style="${at(C.garage.door)};width:${C.garage.door[2]}%;height:${C.garage.door[3]}%"><i></i></div>` : ''}
    ${C.tvs.map((t, i) => hot(`tv${i}`, t.at, 'tv', t.name)).join('')}
    ${C.cameras.map((c, i) => hot(`cam${i}`, c.at, 'cam', c.name, 'cam')).join('')}
    ${C.garage ? hot('hGarage', C.garage.at, 'garage', 'Garage door') : ''}
    ${C.appliances.map((a, i) => hot(`ap${i}`, a.at, 'plug', a.name)).join('')}
    <div class="clock"><div class="t" id="time">--:--</div><div class="d" id="date"></div><div class="tariff" id="tariff"><b></b><span></span></div></div>
    <svg class="flows" id="flows" viewBox="0 0 ${RW} ${RH}" aria-hidden="true">
      <path class="wire" d="${curve(g, h)}"/><path class="wire" d="${curve(h, s)}"/>
      <path class="run" id="fGrid" d="${curve(g, h)}" stroke="#b49cf0"/>
      <path class="run" id="fSun" d="${curve(h, s)}" stroke="#f2b84b"/>
      <g><circle class="node" cx="${g[0]}" cy="${g[1]}" r="40" stroke="#b49cf0"/><text x="${g[0]}" y="${g[1] + 7}" text-anchor="middle">Grid</text></g>
      <g><circle class="node" cx="${h[0]}" cy="${h[1]}" r="44" stroke="#7cc29a"/><text x="${h[0]}" y="${h[1] + 7}" text-anchor="middle">Home</text></g>
      <g id="sunNode"><circle class="node" cx="${s[0]}" cy="${s[1]}" r="44" stroke="#f2b84b"/><text x="${s[0]}" y="${s[1] + 7}" text-anchor="middle">Solar</text></g>
      <text class="sub" id="tGrid" x="${(g[0] + h[0]) / 2}" y="${(g[1] + h[1]) / 2 + 40}"></text>
      <text class="sub" id="tSun" x="${(h[0] + s[0]) / 2}" y="${(h[1] + s[1]) / 2 + 40}"></text>
    </svg>
    <div class="banner" id="banner" role="status"></div>
    <div class="vig" id="vig"></div>
    <div class="camcard" id="camcard" role="dialog" aria-label="Camera">
      <div class="row"><strong id="camTitle">Camera</strong><small id="camMeta"></small></div>
      <div class="camview">
        <img id="camImg" alt="Camera snapshot">
        <div class="camstate" id="camState"><div class="spin" id="camSpin"></div><span id="camMsg">Loading snapshot…</span></div>
      </div>
      <div class="row"><small>Snapshot refreshes every 10 seconds</small>
        <span style="display:flex;gap:6px"><button id="camLive">Live view</button><button id="camClose">Close</button></span></div>
    </div>
    <button class="ebtn viewbtn" id="eOpen">⚡ Energy</button>
    <div class="ticker" id="ticker"></div>
  </section>
  <section class="ecard" id="ecard" hidden aria-label="Energy">
    <div class="etop">
      <h3 id="eTitle">Energy</h3>
      <div class="legend">${peakTxt ? `<span><b style="background:#e8734a"></b>Grid in · ${esc(peakTxt)}</span>` : ''}<span><b style="background:#b49cf0"></b>Grid in${peakTxt ? ' · other hours' : ''}</span><span><b style="background:#f2b84b"></b>Solar out</span><span id="lgSolar" hidden><b style="background:#ffe08a"></b>Solar made</span></div>
    </div>
    <div class="ectl">
      <button class="ebtn" id="eBack">◀ House</button>
      <button class="ebtn" id="ePrev">◀ Previous day</button><span class="edate" id="eDate">—</span><button class="ebtn" id="eNext">Next day ▶</button>
      <button class="ebtn" id="play">▶ Play</button>
      <button class="ebtn" id="eToday">Today</button>
      <button class="ebtn" id="eNow" hidden>● Now</button>
    </div>
    <div class="hourrow"><input type="range" id="hour" min="0" max="23" step="1" value="12" aria-label="Hour of the day (left and right step one hour)"><output id="hourOut">12:00</output></div>
    <div class="chart" id="chart"></div>
    <div class="devs" id="devs"></div>
    <div class="chart" id="chart14"></div>
    <div class="heat" id="heat"></div>
    <p class="muted" style="margin:0" id="eNote">${esc(E.note || '')}</p>
  </section>
  </div>
  <aside class="panel">
    <div class="tabs needs-energy" role="group" aria-label="View"><button id="vHouse" aria-pressed="true">House</button><button id="vEnergy" aria-pressed="false">Energy</button></div>
    <h2>${esc(C.title)}</h2>
    <div class="sec needs-energy">
      <div class="eyebrow"><span id="dayLbl">Energy · latest day</span><span>${esc(E.source || '')}</span></div>
      <div class="kpis">
        <div class="kpi"><div class="v" id="kCost">—</div><div class="k">Cost</div></div>
        <div class="kpi"><div class="v" id="kUsed">—</div><div class="k">Used</div></div>
        <div class="kpi"><div class="v" id="kSolar" style="color:var(--ok)">—</div><div class="k">Solar out</div></div>
      </div>
      ${E.bill ? '<div class="row"><small>This bill so far</small><span id="bill" style="font-family:var(--data)">—</span></div>' : ''}
    </div>
    <div class="sec" ${C.bins ? '' : 'hidden'}>
      <div class="eyebrow"><span>Bins</span><span id="binWhen">—</span></div>
      <div class="binrow">${C.bins ? `<img src="${B}${C.bins.general}" alt="General waste">${C.bins.types.map((t, i) => `<img id="bin${i}" src="${B}${t.img}" alt="${esc(t.label)}">`).join('')}` : ''}<span id="binWeek"></span></div>
    </div>
    <div class="sec" ${C.tvs.length ? '' : 'hidden'}>
      <div class="eyebrow"><span>Screens</span><span>tap to toggle</span></div>
      ${C.tvs.map((t, i) => `<div class="row"><span>${esc(t.name)}</span><button class="pill" id="tvP${i}">—</button></div>`).join('')}
    </div>
    <div class="sec" ${C.garage || C.cameras.length ? '' : 'hidden'}>
      <div class="eyebrow"><span>Outside</span></div>
      ${C.garage ? '<div class="row"><span>Garage door</span><span class="pill" id="pGarage">—</span></div>' : ''}
      ${C.cameras.length ? '<div class="row"><span>Cameras</span><span class="muted" id="motionTxt">Quiet</span></div>' : ''}
    </div>
    ${C.appliances.map((a, i) => `<div class="sec">
      <div class="eyebrow"><span>${esc(a.name)}</span><span>smart plug</span></div>
      <div class="kpis">
        <div class="kpi"><div class="v" id="ap${i}Now">—</div><div class="k">Now</div></div>
        <div class="kpi"><div class="v" id="ap${i}Day">—</div><div class="k">Today</div></div>
        <div class="kpi"><div class="v" id="ap${i}Mon">—</div><div class="k">This month</div></div>
      </div></div>`).join('')}
    <button class="tvbtn" id="tvBtn">Open TV mode (full screen)</button>
  </aside>
</div></div>`;
}

// Where the energy figures come from: CONFIG.energy lists win; otherwise HA's Energy dashboard settings.
// Handles both shapes of grid source (flat stat_energy_from/to, and the older flow_from/flow_to lists).
function energySources(prefs) {
  const E = CONFIG.energy || {}, P = { imp: [], exp: [], solar: [], batIn: [], batOut: [], cost: [], devices: [], live: { grid: [], solar: [], battery: [] } };
  const rate = (list, s) => {
    if (s.stat_rate) list.push({ id: s.stat_rate, sign: 1 });
    const pc = s.power_config || {};
    if (pc.stat_rate) list.push({ id: pc.stat_rate, sign: 1 });
    if (pc.stat_rate_inverted) list.push({ id: pc.stat_rate_inverted, sign: -1 });
    if (pc.stat_rate_from) list.push({ id: pc.stat_rate_from, sign: 1 });
    if (pc.stat_rate_to) list.push({ id: pc.stat_rate_to, sign: -1 });
  };
  for (const s of (prefs && prefs.energy_sources) || []) {
    if (s.type === 'grid') {
      const from = s.flow_from || (s.stat_energy_from ? [s] : []), to = s.flow_to || (s.stat_energy_to ? [s] : []);
      for (const f of from) { P.imp.push(f.stat_energy_from); if (f.stat_cost) P.cost.push(f.stat_cost); }
      for (const t of to) P.exp.push(t.stat_energy_to);
      rate(P.live.grid, s);
    } else if (s.type === 'solar') { P.solar.push(s.stat_energy_from); rate(P.live.solar, s); }
    else if (s.type === 'battery') { P.batOut.push(s.stat_energy_from); P.batIn.push(s.stat_energy_to); rate(P.live.battery, s); }
  }
  for (const d of (prefs && prefs.device_consumption) || []) P.devices.push({ id: d.stat_consumption, name: d.name, power: d.stat_rate });
  const own = l => (l || []).filter(Boolean);
  const live = k => (E.live && own(E.live[k]).length ? own(E.live[k]).map(id => ({ id, sign: 1 })) : P.live[k]);
  const imp = own(E.import).length ? own(E.import) : P.imp;
  const devices = [...P.devices];
  for (const a of CONFIG.appliances) {
    const id = a.energy || a.today;
    const d = devices.find(x => x.id === id);
    if (d) Object.assign(d, { name: a.name, power: d.power || a.power }); else if (id) devices.push({ id, name: a.name, power: a.power });
  }
  return {
    imp, exp: own(E.export).length ? own(E.export) : P.exp, solar: own(E.solar).length ? own(E.solar) : P.solar,
    batIn: P.batIn, batOut: P.batOut,
    cost: own(E.import).length ? own(E.cost) : (P.cost.length === P.imp.length ? P.cost : []),
    devices, live: { grid: live('grid'), solar: live('solar'), battery: live('battery') },
  };
}

class HouseTwin extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._stats = null; this._statsAt = 0; this._days = new Map(); }
  set narrow(v) { this._narrow = v; if (this.$) this.$('menu').hidden = !v; }
  set panel(v) {}
  set hass(h) {
    this._hass = h;
    if (!this._built) this._build();
    this._render();
    if (Date.now() - this._statsAt > 30 * 60 * 1000) this._loadStats();
  }

  _build() {
    const C = CONFIG;
    this.shadowRoot.innerHTML = `<style>${CSS}</style>${buildHtml()}`;
    const $ = id => this.shadowRoot.getElementById(id);
    this.$ = $;
    $('day').addEventListener('error', () => { $('norender').hidden = false; $('day').hidden = true; });
    for (const id of ['dusk', 'night']) $(id).addEventListener('error', () => { $(id).hidden = true; });
    $('menu').addEventListener('click', () => this.dispatchEvent(new Event('hass-toggle-menu', { bubbles: true, composed: true })));
    $('menu').hidden = !this._narrow;
    const toggleTv = e => this._hass.callService('media_player', 'toggle', { entity_id: e });
    C.tvs.forEach((t, i) => { $(`tv${i}`).addEventListener('click', () => toggleTv(t.entity)); $(`tvP${i}`).addEventListener('click', () => toggleTv(t.entity)); });
    C.cameras.forEach((c, i) => $(`cam${i}`).addEventListener('click', () => this._openCam(i)));
    C.appliances.forEach((a, i) => $(`ap${i}`).addEventListener('click', () => this._moreInfo(a.power)));
    if (C.garage) $('hGarage').addEventListener('click', () => this._moreInfo(C.garage.entity));
    $('camClose').addEventListener('click', () => this._closeCam());
    $('camLive').addEventListener('click', () => { const id = C.cameras[this._cam].camera; this._closeCam(); this._moreInfo(id); });
    $('tvBtn').addEventListener('click', () => this._enterTv(true));
    this.addEventListener('keydown', e => {
      if (e.key !== 'Escape' && e.key !== 'GoBack' && e.key !== 'BrowserBack') return;
      if (this._mode === 'energy') { e.preventDefault(); e.stopPropagation(); this._setMode('house'); }
      else if (e.key === 'Escape' && this._tvFs) this._exitTv();
    });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && this.hasAttribute('tv') && this._tvFs) this._exitTv(); });
    this._mode = 'house';
    const setMode = m => {
      if (m === 'energy' && !this._energyOn) m = 'house';
      const was = this._mode;
      this._mode = m; this.setAttribute('view', m);
      $('vHouse').setAttribute('aria-pressed', m === 'house'); $('vEnergy').setAttribute('aria-pressed', m === 'energy');
      $('ecard').hidden = m !== 'energy'; $('flows').classList.toggle('show', m === 'energy');
      if (m !== 'energy') { this._stopPlay(); this._live = false; }
      this._render();
      // Keep the remote's focus on something visible after the view changes.
      if (was !== m && this.hasAttribute('tv')) (m === 'energy' ? $('play') : $('eOpen')).focus();
    };
    this._setMode = setMode;
    $('vHouse').addEventListener('click', () => setMode('house'));
    $('vEnergy').addEventListener('click', () => setMode('energy'));
    $('eOpen').addEventListener('click', () => setMode('energy'));
    $('eBack').addEventListener('click', () => setMode('house'));
    $('ePrev').addEventListener('click', () => this._goDay(-1));
    $('eNext').addEventListener('click', () => this._goDay(1));
    $('eToday').addEventListener('click', () => this._goToday());
    $('eNow').addEventListener('click', () => { this._stopPlay(); this._live = !this._live; if (this._live) this._showDay(dayStart(Date.now())); this._render(); });
    const hour = $('hour');
    hour.addEventListener('input', () => { this._stopPlay(); this._live = false; this._render(); });
    // Left/Right step one hour, and stay on the slider (a TV app's remote navigation would otherwise move on).
    hour.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); e.stopPropagation();
      this._stopPlay(); this._live = false;
      hour.value = clamp(+hour.value + (e.key === 'ArrowRight' ? 1 : -1), 0, 23); this._render();
    });
    $('play').addEventListener('click', () => this._playing ? this._stopPlay() : this._startPlay());
    this._built = true;
    if (/[?&]tv(=1|&|$)/.test(location.search)) {
      if (C.tvHideSidebar) {
        // Hide HA's own sidebar on this browser only (phones and PCs keep theirs). The panel can be built
        // before it is attached, when the event would go nowhere, so wait until it is connected.
        const hideSidebar = () => this.isConnected
          ? this.dispatchEvent(new CustomEvent('hass-dock-sidebar', { detail: { dock: 'always_hidden' }, bubbles: true, composed: true }))
          : setTimeout(hideSidebar, 250);
        hideSidebar();
      }
      this._enterTv(false);
    }
    this._tick = setInterval(() => this._render(), 20000);
  }

  disconnectedCallback() { clearInterval(this._tick); clearInterval(this._tvTimer); clearInterval(this._camTimer); this._stopPlay(); }

  // ---- camera preview card ----
  _openCam(i) {
    const $ = this.$, c = CONFIG.cameras[i], s = this._st(c.camera); this._cam = i;
    $('camTitle').textContent = c.name;
    const t = this._motionTime(c.motion);
    $('camMeta').textContent = isNaN(t) ? '' : `Last motion ${new Date(t).toLocaleTimeString(CONFIG.locale, { hour: 'numeric', minute: '2-digit' })}`;
    const img = $('camImg'), state = (spin, msg) => { $('camState').hidden = !spin && !msg; $('camSpin').hidden = !spin; $('camMsg').textContent = msg || ''; };
    img.classList.remove('ready'); state(true, 'Loading snapshot…');
    // Try the live-view still first, then the last recording's still.
    const sources = [c.camera, c.recording].filter(Boolean);
    const load = (n = 0) => {
      const cs = this._st(sources[n]);
      if (!cs || !cs.attributes.entity_picture) { if (n + 1 < sources.length) return load(n + 1); return state(false, 'No snapshot available. Try Live view.'); }
      const probe = new Image();
      probe.onload = () => { if (this._cam !== i) return; img.src = probe.src; img.classList.add('ready'); state(false, '');
        $('camMeta').textContent = (n ? 'Last recording · ' : '') + $('camMeta').textContent.replace(/^Last recording · /, ''); };
      probe.onerror = () => { if (this._cam !== i) return; if (n + 1 < sources.length) load(n + 1);
        else if (!img.classList.contains('ready')) state(false, 'Snapshot unavailable right now. Try Live view; retrying every 10 seconds.'); };
      const pic = cs.attributes.entity_picture;
      probe.src = `${pic}${pic.includes('?') ? '&' : '?'}t=${Date.now()}`;
    };
    if (!s) state(false, 'Camera not found'); else load();
    clearInterval(this._camTimer); this._camTimer = setInterval(() => load(), 10000);
    $('camcard').classList.add('show');
  }
  _closeCam() { clearInterval(this._camTimer); this._cam = null; const $ = this.$; $('camcard').classList.remove('show'); $('camImg').classList.remove('ready'); $('camImg').removeAttribute('src'); }

  // Event entities hold the time of the last event; motion binary sensors count while on and just after.
  _motionTime(id) {
    const s = this._st(id);
    if (!s) return NaN;
    if (id.startsWith('event.')) return Date.parse(s.state);
    return s.state === 'on' ? Date.now() : Date.parse(s.last_changed);
  }

  // ---- TV mode: full screen, no side panel. Energy opens with its button (or cycles, if configured). ----
  _enterTv(fullscreen) {
    this.setAttribute('tv', ''); this._tvFs = fullscreen;
    if (fullscreen && this.requestFullscreen) this.requestFullscreen().catch(() => {});
    clearInterval(this._tvTimer);
    const cycle = +((CONFIG.energy || {}).tvCycleSeconds) || 0;
    if (cycle > 0) {
      this._tvTimer = setInterval(() => {
        if (!this._energyOn) return;
        const energy = this._mode !== 'energy';
        this._setMode(energy ? 'energy' : 'house');
        if (energy) { this.$('hour').value = 0; this._startPlay(); }
      }, cycle * 1000);
    }
    this._setMode('house');
  }
  _exitTv() {
    if (!this.hasAttribute('tv')) return;
    clearInterval(this._tvTimer); this.removeAttribute('tv'); this._setMode('house');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  _moreInfo(entityId) { this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true })); }
  _st(id) { return this._hass && id && this._hass.states[id]; }
  _num(id) { const s = this._st(id); return s && s.state !== '' && !isNaN(+s.state) ? +s.state : NaN; }
  // A power sensor in watts (kW converted); NaN if missing or unavailable.
  _watts(id) { const v = this._num(id); if (isNaN(v)) return NaN; const u = (this._st(id).attributes.unit_of_measurement || 'W').toLowerCase(); return u === 'kw' ? v * 1000 : u === 'mw' ? v * 1e6 : v; }
  _liveSum(list) { const vals = list.map(x => this._watts(x.id) * x.sign).filter(v => !isNaN(v)); return vals.length ? sum(vals) : NaN; }
  // Live power: a whole-home sensor (grid, solar or battery) or, once the view is on, appliance plugs too.
  _hasMeterLive() { const L = this._src && this._src.live; return !!L && [...L.grid, ...L.solar, ...L.battery].some(x => !isNaN(this._watts(x.id))); }
  _hasLive() { return this._hasMeterLive() || (!!this._src && this._src.devices.some(d => d.power && !isNaN(this._watts(d.power)))); }

  _render() {
    if (!this._hass || !this.$) return;
    const C = CONFIG, $ = this.$, now = new Date(), h = now.getHours() + now.getMinutes() / 60;
    // Lighting: blend by real sun elevation (dusk band around the horizon); in Energy replay follow the replay hour.
    const energy = this._mode === 'energy', replay = energy && !this._live, eh = +$('hour').value + .5, sp = C.sunPath;
    const sun = this._st('sun.sun');
    const el = replay ? (eh > sp.rise && eh < sp.set ? sp.maxElevation * Math.sin(Math.PI * (eh - sp.rise) / (sp.set - sp.rise)) : -12)
      : sun ? +sun.attributes.elevation : (h > 7 && h < 17 ? 30 : -10);
    const night = clamp((2 - el) / 8, 0, 1);              // fully night below about -6°
    const dusk = el > 2 ? clamp((14 - el) / 12, 0, 1) * (1 - night) : (1 - night);
    $('dusk').style.opacity = dusk; $('night').style.opacity = night;
    const dark = Math.max(night, dusk * .6);

    const on = e => { const s = this._st(e); return !!s && TV_ON.includes(s.state); };
    const tvOn = C.tvs.map(t => on(t.entity));
    C.tvs.forEach((t, i) => {
      if (t.glow) $(`gTv${i}`).style.opacity = tvOn[i] ? .35 + dark * .4 : 0;
      $(`tv${i}`).classList.toggle('active', tvOn[i]);
      const p = $(`tvP${i}`); p.textContent = tvOn[i] ? 'On' : 'Off'; p.classList.toggle('on', tvOn[i]);
    });
    C.roomGlows.forEach((_, i) => { $(`gRoom${i}`).style.opacity = dark > .3 ? dark * .4 : 0; });

    if (C.garage) {
      const g = this._st(C.garage.entity), gOpen = !!g && g.state === 'on';
      $('garage').classList.toggle('open', gOpen);
      $('hGarage').classList.toggle('warn', gOpen);
      $('pGarage').textContent = !g ? 'No sensor yet' : g.state === 'unavailable' ? 'Unavailable' : gOpen ? 'Open' : 'Closed';
      $('pGarage').classList.toggle('warn', gOpen);
    }

    const moving = [];
    C.cameras.forEach((c, i) => {
      const t = this._motionTime(c.motion), m = !isNaN(t) && (now - t) / 1000 < C.motionSeconds;
      $(`cam${i}`).classList.toggle('motion', m);
      if (m) moving.push(c.name);
    });
    if (C.cameras.length) $('motionTxt').textContent = moving.length ? 'Motion: ' + moving.join(', ') : 'Quiet';

    const num = id => this._num(id);
    C.appliances.forEach((a, i) => {
      const w = num(a.power), day = num(a.today), mon = num(a.month);
      $(`ap${i}Now`).textContent = isNaN(w) ? 'Offline' : `${Math.round(w)} W`;
      $(`ap${i}Day`).textContent = isNaN(day) ? '—' : `${day.toFixed(2)} kWh`;
      $(`ap${i}Mon`).textContent = isNaN(mon) ? '—' : money(mon * RATE_AVG);
      $(`ap${i}L`).textContent = isNaN(w) ? `${a.name} · offline` : `${a.name} · ${Math.round(w)} W`;
      $(`ap${i}`).classList.toggle('active', w > (a.runningAbove || 10));
      $(`ap${i}`).classList.toggle('warn', isNaN(w));
      $(`ap${i}`).classList.toggle('showlbl', energy);
    });

    let days = NaN, binLbl = '';
    if (C.bins) {
      const bins = this._st(C.bins.sensor);
      days = bins ? parseInt(bins.state, 10) : NaN;
      let types = '';
      if (bins) for (const [k, v] of Object.entries(bins.attributes)) if (/^\d/.test(k)) { types = String(v).toLowerCase(); break; }
      const cal = this._st(C.bins.calendar);
      if (!types && cal && cal.attributes.message) types = String(cal.attributes.message).toLowerCase();
      const hits = C.bins.types.map(t => t.match.test(types));
      C.bins.types.forEach((t, i) => $(`bin${i}`).classList.toggle('dim', !hits[i]));
      binLbl = C.bins.types.filter((_, i) => hits[i]).map(t => t.label).join(' + ');
      $('binWeek').textContent = isNaN(days) ? '' : binLbl ? `${binLbl} week` : 'General waste';
      $('binWhen').textContent = isNaN(days) ? '—' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow · out tonight' : `In ${days} days`;
    }

    const srcs = (C.emergency && C.emergency.sources) || [];
    const alerts = srcs.length ? Object.values(this._hass.states).filter(s => s.entity_id.startsWith('geo_location.') && srcs.includes(s.attributes.source)) : [];
    if (alerts.length) {
      const f = alerts.reduce((a, b) => (+a.state < +b.state ? a : b));
      $('banner').textContent = `${C.emergency.label} · ${Math.round(+f.state)} km · ${f.attributes.title || f.attributes.friendly_name}${alerts.length > 1 ? ` (+${alerts.length - 1} more)` : ''}`;
    }
    $('banner').classList.toggle('show', alerts.length > 0); $('vig').classList.toggle('show', alerts.length > 0);

    $('time').textContent = now.toLocaleTimeString(C.locale, { hour: 'numeric', minute: '2-digit' });
    const w = C.weather ? this._st(C.weather) : Object.values(this._hass.states).find(s => s.entity_id.startsWith('weather.'));
    $('date').textContent = now.toLocaleDateString(C.locale, { weekday: 'long', day: 'numeric', month: 'long' }) +
      (w && w.attributes.temperature != null ? ` · ${Math.round(w.attributes.temperature)}°` : '');
    const band = BAND(now.getHours());
    const until = band.to != null ? ` until ${new Date(2000, 0, 1, band.to % 24).toLocaleTimeString(C.locale, { hour: 'numeric' })}` : '';
    const lbl = band.name + until;
    $('tariff').lastElementChild.textContent = lbl; $('tariff').firstElementChild.style.setProperty('--c', band.color || 'var(--muted)');

    if (C.energy && C.energy.bill) { const bill = num(C.energy.bill); $('bill').textContent = isNaN(bill) ? '—' : money(bill); }
    if (this._stats) {
      const s = this._stats;
      $('kCost').textContent = money(s.cost); $('kUsed').textContent = `${Math.round(s.used)} kWh`; $('kSolar').textContent = `${Math.round(s.solar)} kWh`;
      $('dayLbl').textContent = `Energy · ${s.label}`;
    }
    if (energy) this._renderEnergy();

    if (this.hasAttribute('tv')) {
      const tvs = C.tvs.filter((_, i) => tvOn[i]).map(t => t.name);
      const s = this._stats;
      $('ticker').innerHTML = [
        `<span><b>Tariff</b>${esc(lbl)}</span>`,
        !isNaN(days) ? `<span><b>Bins</b>${days === 1 ? 'out tonight' : days === 0 ? 'today' : `in ${days} days`}${binLbl ? ` · ${esc(binLbl.toLowerCase())}` : ''}</span>` : '',
        s ? `<span><b>${esc(s.label)}</b>${money(s.cost)} · ${Math.round(s.used)} kWh in · ${Math.round(s.solar)} out</span>` : '',
        C.tvs.length ? `<span><b>TVs</b>${tvs.length ? esc(tvs.join(', ')) : 'off'}</span>` : '',
        moving.length ? `<span style="color:var(--alert)"><b>Motion</b>${esc(moving.join(', '))}</span>` : '',
      ].join('');
    }
  }

  // ---- Energy view: one day at a time, hour by hour; or Now, from live power sensors ----
  _startPlay() {
    const $ = this.$; this._playing = true; this._live = false; $('play').textContent = '❚❚ Pause';
    if (+$('hour').value >= 23) $('hour').value = 0;
    clearInterval(this._play);
    this._play = setInterval(() => {
      const v = +$('hour').value; if (v >= 23) { this._stopPlay(); return; }
      $('hour').value = v + 1; this._render();
    }, 900);
    this._render();
  }
  _stopPlay() { clearInterval(this._play); this._playing = false; if (this.$) this.$('play').textContent = '▶ Play'; }

  _goDay(n) {
    this._stopPlay(); this._live = false;
    const t = addDays(this._day || dayStart(Date.now()), n);
    if (t > dayStart(Date.now()) || t < this._firstDay) return;
    this._showDay(t);
  }
  // Today if it has data yet; otherwise the latest day that does (retailer data often lags a day or two).
  _goToday() {
    this._stopPlay(); this._live = false;
    const today = dayStart(Date.now()), d = this._days.get(today);
    const t = d && d.has ? today : (this._lastDay || today);
    this.$('hour').value = t === today ? new Date().getHours() : 12;
    this._showDay(t);
  }
  _showDay(t) { this._day = t; this._render(); if (!this._days.has(t) || (t === dayStart(Date.now()) && Date.now() - this._days.get(t).at > 5 * 60000)) this._loadDay(t); }

  _renderEnergy() {
    const $ = this.$, S = this._src, today = dayStart(Date.now());
    if (!S) { $('eTitle').textContent = 'Energy · loading…'; return; }
    const live = this._live && this._hasLive();
    if (!live) this._live = false;
    $('eNow').hidden = !this._hasLive(); $('eNow').classList.toggle('on', live);
    if (live) { this._day = today; $('hour').value = new Date().getHours(); }
    const t = this._day || this._lastDay || today, d = this._days.get(t), hr = +$('hour').value;
    $('eDate').textContent = t === today ? 'Today' : new Date(t).toLocaleDateString(CONFIG.locale, { weekday: 'short', day: 'numeric', month: 'short' });
    $('ePrev').disabled = addDays(t, -1) < this._firstDay; $('eNext').disabled = t >= today;
    $('hourOut').textContent = hh(hr);
    $('lgSolar').hidden = !S.solar.length;

    // Flows over the house: live watts in Now mode, that hour's kWh otherwise.
    const flow = (id, txt, v, unitTxt, rev, color) => {
      const p = $(id), k = live ? v / 1000 : v, act = k > .02;
      p.style.strokeWidth = act ? 4 + Math.min(k, 4) * 5 : 0; p.style.opacity = act ? 1 : 0;
      p.style.setProperty('--dur', `${Math.max(.5, 2.4 - k * .45)}s`); p.classList.toggle('rev', !!rev); p.setAttribute('stroke', color);
      $(txt).textContent = act ? unitTxt : '';
    };
    let gridIn = 0, gridOut = 0, made = NaN;
    if (live) {
      const g = this._liveSum(S.live.grid), sol = this._liveSum(S.live.solar);
      gridIn = g > 0 ? g : 0; gridOut = g < 0 ? -g : 0; made = sol;
      $('eTitle').textContent = ['Energy · now', isNaN(g) ? '' : g >= 0 ? `${kw(g)} from the grid` : `${kw(-g)} to the grid`, isNaN(sol) ? '' : `solar ${kw(sol)}`].filter(Boolean).join(' · ');
    } else if (d && d.has) {
      gridIn = d.imp[hr]; gridOut = d.exp[hr]; made = S.solar.length ? d.solar[hr] : NaN;
      $('eTitle').textContent = `Energy · ${hh(hr)}–${hh((hr + 1) % 24)}`;
    } else $('eTitle').textContent = 'Energy';
    const f = v => (live ? kw(v) : `${v.toFixed(1)} kWh`);
    if (isNaN(made)) {           // no solar production figure: grid in on one wire, solar exported on the other
      flow('fGrid', 'tGrid', gridIn, f(gridIn), false, '#b49cf0');
      flow('fSun', 'tSun', gridOut, f(gridOut), false, '#f2b84b');
    } else {                     // net grid on one wire (reversed when exporting), solar into the home on the other
      const exp = gridOut > gridIn;
      flow('fGrid', 'tGrid', exp ? gridOut : gridIn, f(exp ? gridOut : gridIn), exp, exp ? '#f2b84b' : '#b49cf0');
      flow('fSun', 'tSun', made, f(made), true, '#ffe08a');
    }
    $('sunNode').style.opacity = live ? (made > 20 ? 1 : .35) : hr >= 6 && hr <= 18 ? 1 : .35;

    // Device hotspots and list: that hour's use (or live watts).
    const devRows = [];
    S.devices.forEach(dev => {
      const series = d && d.dev[dev.id], name = dev.name || (this._st(dev.id) && this._st(dev.id).attributes.friendly_name) || dev.id;
      const ai = CONFIG.appliances.findIndex(a => (a.energy || a.today) === dev.id);
      let lbl = name, val;
      if (live) { const wv = dev.power ? this._watts(dev.power) : NaN; val = isNaN(wv) ? '—' : kw(wv); lbl = `${name} · ${val}`; }
      else if (series) {
        const kwh = series[hr], dayKwh = sum(series), dayCost = sum(series.map((v, i) => v * RATE(i)));
        lbl = `${name} · ${kwh.toFixed(2)} kWh at ${hh(hr)}`;
        val = `${dayKwh.toFixed(2)} kWh · ${money(dayCost)}`;
      }
      if (ai >= 0 && val !== undefined) $(`ap${ai}L`).textContent = lbl;
      if (val !== undefined) devRows.push(`<div class="row"><span>${esc(name)}</span><span>${esc(val)}</span></div>`);
    });
    $('devs').innerHTML = devRows.join('');

    if (!d || !d.has) {
      $('chart').innerHTML = `<div class="empty">${!S.imp.length ? 'No meter history found. Add your grid meter in Settings → Dashboards → Energy, or list its statistics in the panel CONFIG.'
        : !d ? 'Loading…' : t >= addDays(today, -2)
        ? 'No meter data for this day yet. Some sources (retailer integrations) arrive a day or two late.' : 'No energy data for this day.'}</div>`;
    } else this._renderChart(d, hr, live);

    if (this.hasAttribute('tv')) return;   // the 14-day strip and heatmap are for the full-size page
    this._renderHistory();
  }

  // Hourly chart: grid import above the axis (peak hours highlighted), export below, solar production as a line.
  _renderChart(d, hr, live) {
    const W = 720, H = 200, mid = 120, pad = 28, bw = (W - pad) / 24;
    const max = Math.max(1, ...d.imp, ...(this._src.solar.length ? d.solar : [])), maxE = Math.max(1, ...d.exp);
    const sUp = (mid - 14) / max, sDn = (H - mid - 18) / maxE;
    let bars = '', shade = '', line = '';
    for (let i = 0; i < 24; i++) {
      const x = pad + i * bw + 2, w = bw - 4, op = i === hr ? 1 : .55;
      if (IS_PEAK(i)) shade += `<rect x="${pad + i * bw}" y="4" width="${bw}" height="${mid - 4}" fill="rgba(232,115,74,.08)"/>`;
      bars += `<rect x="${x}" y="${mid - d.imp[i] * sUp}" width="${w}" height="${d.imp[i] * sUp}" rx="2" fill="${IS_PEAK(i) ? '#e8734a' : '#b49cf0'}" opacity="${op}"/>`;
      bars += `<rect x="${x}" y="${mid}" width="${w}" height="${d.exp[i] * sDn}" rx="2" fill="#f2b84b" opacity="${op}"/>`;
      if (i % 3 === 0) bars += `<text x="${x + w / 2}" y="${H - 2}" text-anchor="middle">${i}</text>`;
    }
    if (this._src.solar.length) line = `<polyline fill="none" stroke="#ffe08a" stroke-width="2.5" points="${d.solar.map((v, i) => `${pad + i * bw + bw / 2},${mid - v * sUp}`).join(' ')}"/>`;
    const hx = pad + hr * bw;
    const tot = sum(d.imp), totE = sum(d.exp);
    this.$('chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hourly grid import and export">
      ${shade}<rect x="${hx}" y="4" width="${bw}" height="${H - 20}" fill="rgba(255,255,255,${live ? .12 : .06})"/>
      <line x1="${pad}" x2="${W}" y1="${mid}" y2="${mid}" stroke="rgba(255,255,255,.2)"/>
      <text x="0" y="14">${max.toFixed(1)}</text><text x="0" y="${mid - 4}">in</text><text x="0" y="${mid + 14}">out</text>
      ${bars}${line}</svg>
      <div class="row"><small>Day total</small><span style="font-family:var(--data)">${tot.toFixed(1)} kWh in · ${totE.toFixed(1)} kWh out${this._src.solar.length ? ` · ${sum(d.solar).toFixed(1)} kWh solar` : ''} · ${money(d.cost)}</span></div>`;
  }

  // 14-day strip and cost heatmap (full-size page only).
  _renderHistory() {
    const $ = this.$, W = 720, days = this._daily || [], dmax = Math.max(1, ...days.map(x => Math.max(x.used, x.solar)));
    const cw = W / Math.max(days.length, 1);
    let strip = '';
    days.forEach((x, i) => {
      const bx = i * cw + 4, w2 = (cw - 10) / 2;
      strip += `<rect x="${bx}" y="${70 - x.used / dmax * 60}" width="${w2}" height="${x.used / dmax * 60}" rx="2" fill="#b49cf0"/>`;
      strip += `<rect x="${bx + w2 + 2}" y="${70 - x.solar / dmax * 60}" width="${w2}" height="${x.solar / dmax * 60}" rx="2" fill="#f2b84b"/>`;
      strip += `<text x="${bx + w2}" y="86" text-anchor="middle">${x.label}</text>`;
    });
    $('chart14').innerHTML = days.length ? `<div class="row" style="margin-bottom:6px"><small>Last ${days.length} days · grid in and solar out</small></div>
      <svg viewBox="0 0 ${W} 92" role="img" aria-label="Daily grid import and solar export">${strip}</svg>` : '';

    // cost heatmap: rows = days, columns = hours; colour = money spent that hour at your configured rates
    const hm = this._heat;
    if (!hm || !hm.length) { $('heat').innerHTML = ''; return; }
    const L = 62, R = 50, top = 16, ch = 18, cwH = (W - L - R) / 24, hmax = Math.max(.01, ...hm.flatMap(r => r.cells));
    const col = v => { const k = Math.min(v / hmax, 1); // charcoal → amber → red
      const a = [38, 46, 54], b = [242, 184, 75], c = [232, 67, 42];
      const m = k < .5 ? a.map((x, i) => x + (b[i] - x) * k * 2) : b.map((x, i) => x + (c[i] - x) * (k - .5) * 2);
      return `rgb(${m.map(Math.round).join(',')})`; };
    let cells = '';
    for (let i = 0; i < 24; i++) if (IS_PEAK(i)) cells += `<rect x="${L + i * cwH}" y="${top - 2}" width="${cwH}" height="${hm.length * ch + 2}" fill="rgba(232,115,74,.08)"/>`;
    for (let i = 0; i < 24; i += 3) cells += `<text x="${L + i * cwH + cwH / 2}" y="${top - 5}" text-anchor="middle">${i}</text>`;
    hm.forEach((r, ri) => {
      const y = top + ri * ch;
      cells += `<text x="0" y="${y + 12}">${r.label}</text><text x="${W - R + 6}" y="${y + 12}">${money(r.total)}</text>`;
      r.cells.forEach((v, h2) => { cells += `<rect class="c" x="${L + h2 * cwH + 1}" y="${y + 1}" width="${cwH - 2}" height="${ch - 2}" rx="2" fill="${col(v)}"><title>${r.label} ${h2}:00 · ${money(v)}</title></rect>`; });
    });
    $('heat').innerHTML = `<div class="row" style="margin:6px 0"><small>What each hour cost · last ${hm.length} days (shaded = peak)</small><small>priced at your configured rates</small></div>
      <svg viewBox="0 0 ${W} ${top + hm.length * ch + 4}" role="img" aria-label="Hourly cost heatmap">${cells}</svg>`;
  }

  _ws(start, end, period, statistic_ids) {
    return this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: new Date(start).toISOString(),
      ...(end ? { end_time: new Date(end).toISOString() } : {}), statistic_ids, period, types: ['change'], units: { energy: 'kWh' } });
  }

  // One day, hour by hour, for every series the view uses.
  async _loadDay(t) {
    const S = this._src; if (!S) return;
    const ids = [...new Set([...S.imp, ...S.exp, ...S.solar, ...S.batIn, ...S.batOut, ...S.cost, ...S.devices.map(x => x.id)])];
    if (!ids.length) return;
    try {
      const r = await this._ws(t, addDays(t, 1), 'hour', ids);
      const byHour = list => { const a = Array(24).fill(0); for (const id of list) for (const x of r[id] || []) { const dt = new Date(x.start); if (dayStart(dt) === t) a[dt.getHours()] += x.change || 0; } return a; };
      const imp = byHour(S.imp);
      const d = { at: Date.now(), imp, exp: byHour(S.exp), solar: byHour(S.solar), dev: {},
        has: S.imp.some(id => (r[id] || []).length) };
      d.cost = S.cost.length ? sum(byHour(S.cost)) : sum(imp.map((v, i) => v * RATE(i)));
      for (const dev of S.devices) if ((r[dev.id] || []).length) d.dev[dev.id] = byHour([dev.id]);
      this._days.set(t, d);
      this._render();
    } catch (e) { console.warn('house-twin: hourly statistics unavailable', e); }
  }

  async _loadStats() {
    this._statsAt = Date.now();
    const E = CONFIG.energy;
    if (!E || E.enabled === false) return this._setEnergyOn(false);
    try {
      let prefs = null;
      try { prefs = await this._hass.callWS({ type: 'energy/get_prefs' }); } catch (e) { /* no Energy dashboard configured */ }
      this._src = energySources(prefs);
      const S = this._src;
      this._firstDay = addDays(Date.now(), -60);
      let allDays = [];
      if (S.imp.length) {
        const start = addDays(Date.now(), -60);
        const r = await this._ws(start, null, 'day', [...S.imp, ...S.exp, ...S.solar]);
        const ch = (list, t) => list.reduce((acc, id) => acc + (((r[id] || []).find(x => +new Date(x.start) === t) || {}).change || 0), 0);
        allDays = [...new Set(S.imp.flatMap(id => (r[id] || []).map(x => dayStart(x.start))))].sort((a, b) => a - b)
          .filter(t => ch(S.imp, t) > 0 || ch(S.exp, t) > 0);
        if (allDays.length) this._firstDay = allDays[0];
        this._daily = allDays.slice(-14).map(t => ({ used: ch(S.imp, t), solar: ch(S.exp, t),
          label: new Date(t).toLocaleDateString(CONFIG.locale, { day: 'numeric', month: 'numeric' }) }));
      }
      this._lastDay = allDays[allDays.length - 1];
      // Appliance plugs alone don't switch the view on: they already show on the house and in the side panel.
      this._setEnergyOn(E.enabled === true || allDays.length > 0 || this._hasMeterLive());
      if (!allDays.length) return;

      // the latest day with data, hour by hour (retailer data often lags 1–2 days)
      const last = this._lastDay;
      await this._loadDay(last);
      if (!this._day) this._day = last;
      const ld = this._days.get(last);
      if (ld) this._stats = { used: sum(ld.imp), solar: sum(ld.exp), cost: ld.cost, label: new Date(last).toLocaleDateString(CONFIG.locale, { weekday: 'short', day: 'numeric', month: 'short' }) };

      // heatmap: every hour of the last 14 data days, priced at the configured rate for that hour
      const hs = allDays.slice(-14);
      const rr = await this._ws(hs[0], addDays(hs[hs.length - 1], 1), 'hour', S.imp);
      const grid = new Map(hs.map(t => [t, Array(24).fill(0)]));
      for (const id of S.imp) for (const x of rr[id] || []) {
        const dt = new Date(x.start), row = grid.get(dayStart(dt));
        if (row) row[dt.getHours()] += (x.change || 0) * RATE(dt.getHours());
      }
      this._heat = hs.map(t => { const cells = grid.get(t);
        return { label: new Date(t).toLocaleDateString(CONFIG.locale, { weekday: 'short', day: 'numeric' }), cells, total: sum(cells) }; });
      this._render();
    } catch (e) { console.warn('house-twin: statistics unavailable', e); this._setEnergyOn(E.enabled === true || this._hasMeterLive()); }
  }
  _setEnergyOn(v) {
    this._energyOn = v;
    this.toggleAttribute('energy-on', v);
    if (!v && this._mode === 'energy') this._setMode('house');
    this._render();
  }
}
customElements.define('house-twin-panel', HouseTwin);
