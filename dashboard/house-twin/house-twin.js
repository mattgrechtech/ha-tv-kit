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

  // Appliances on energy-monitoring smart plugs. Measure only: the panel never switches them.
  appliances: [
    { name: 'Fridge', power: 'sensor.fridge_plug_power', today: 'sensor.fridge_plug_energy_today', month: 'sensor.fridge_plug_energy_this_month',
      at: [61, 53], runningAbove: 10 },
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

  // Energy: long-term statistic IDs (Developer tools → Statistics). `import` = grid consumption series
  // (one or several tariff bands, never the total as well), `export` = solar sent to the grid, `cost` =
  // optional cost series (if empty, cost is priced from the tariff above). `bill` = a sensor with the cost
  // so far this bill (optional). Set energy: null to hide the Energy view. Example IDs show the shape a
  // retailer integration might use; yours will differ.
  energy: {
    source: 'Your retailer',
    bill: 'sensor.electricity_cost_this_bill',
    import: ['retailer:consumption_peak_ACCOUNT', 'retailer:consumption_offpeak_ACCOUNT'],
    export: ['retailer:generation_ACCOUNT'],
    cost: [],
    note: 'From the smart meter via the retailer, hourly, usually 1–2 days behind.',
  },

  // Emergency feed banner: geo_location entities whose `source` attribute is in this list.
  // Example: the Queensland (Australia) bushfire feed. Use your own region's feed (docs/03-tv-notifications.md).
  emergency: { sources: ['qld_bushfire'], label: 'Bushfire alert' },

  weather: null,                   // e.g. 'weather.home'; null = the first weather entity found
  // Energy replay lighting follows an approximate sun path: sunrise/sunset hours and the midday elevation.
  sunPath: { rise: 5.6, set: 18.4, maxElevation: 62 },
  // Energy-flow diagram nodes on the render: [left, top] in %.
  flows: { grid: [6.9, 92.7], home: [40.7, 57.3], solar: [88, 19.5] },
  tvModeSeconds: 45,               // TV mode alternates House and Energy every N seconds
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
.hot:hover, .hot:focus-visible { transform: translate(-50%,-50%) scale(1.12); outline: none; box-shadow: 0 0 0 2px var(--warm); }
.hot svg { width: 18px; height: 18px; fill: currentColor; }
.hot.active { color: var(--tv); border-color: var(--tv); }
.hot.warn { color: var(--alert); border-color: var(--alert); }
.lbl { position: absolute; left: 50%; top: 115%; transform: translateX(-50%); white-space: nowrap; font: 500 11px var(--data); background: rgba(14,18,22,.85);
  padding: 2px 7px; border-radius: 6px; color: var(--muted); opacity: 0; transition: opacity .2s; }
.hot:hover .lbl, .hot:focus-visible .lbl { opacity: 1; }
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
.tabs[hidden] { display: none; }
.tabs button { flex: 1; border: 0; background: transparent; color: var(--muted); font: 600 13px inherit; padding: 7px; border-radius: 7px; cursor: pointer; }
.tabs button[aria-pressed="true"] { background: rgba(255,255,255,.12); color: var(--text); }
.flows { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0; transition: opacity .6s; }
.flows.show { opacity: 1; }
.flows .wire { fill: none; stroke: rgba(255,255,255,.12); stroke-linecap: round; }
.flows .run { fill: none; stroke-linecap: round; stroke-dasharray: 2 22; animation: run var(--dur, 1.5s) linear infinite; transition: stroke-width .5s, opacity .5s; }
@keyframes run { to { stroke-dashoffset: -96; } }
.flows .node { fill: rgba(14,18,22,.82); stroke-width: 3; }
.flows text { font: 600 22px "Manrope", system-ui, sans-serif; fill: var(--text); }
.flows .sub { font: 500 18px var(--data); fill: var(--muted); }
.ecard { background: var(--glass); border: 1px solid var(--line); border-radius: 16px; padding: 16px; display: grid; gap: 12px; }
.ecard[hidden] { display: none; }
.etop { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
.etop h3 { margin: 0; font-size: 17px; }
.play { border: 1px solid var(--line); background: rgba(255,255,255,.06); color: var(--text); border-radius: 8px; padding: 6px 12px; font: 600 13px inherit; cursor: pointer; }
.ecard input[type=range] { width: 100%; accent-color: var(--warm); }
.chart svg { width: 100%; height: auto; display: block; }
.chart text { font: 500 11px var(--data); fill: var(--muted); }
.legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: var(--muted); }
.legend b { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
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
/* TV mode: full-bleed stage, no side panel, ticker strip along the bottom */
:host([tv]) .wrap { padding: 0; overflow: hidden; }
:host([tv]) .app { grid-template-columns: 1fr; max-width: none; height: 100%; }
:host([tv]) .panel, :host([tv]) .menu { display: none; }
:host([tv]) .col { height: 100%; align-content: center; }
:host([tv]) .stage { border-radius: 0; max-height: 100vh; }
:host([tv]) .ecard { position: absolute; left: 2%; right: 2%; bottom: 2%; background: rgba(14,18,22,.8); }
:host([tv]) .ecard .heat, :host([tv]) .ecard #chart14, :host([tv]) .ecard input, :host([tv]) .ecard .play { display: none; }
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
  const C = CONFIG, B = C.base, en = !!(C.energy && C.energy.import && C.energy.import.length);
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
      <path class="run" id="fImp" d="${curve(g, h)}" stroke="#b49cf0"/>
      <path class="run" id="fExp" d="${curve(h, s)}" stroke="#f2b84b"/>
      <g><circle class="node" cx="${g[0]}" cy="${g[1]}" r="40" stroke="#b49cf0"/><text x="${g[0]}" y="${g[1] + 7}" text-anchor="middle">Grid</text></g>
      <g><circle class="node" cx="${h[0]}" cy="${h[1]}" r="44" stroke="#7cc29a"/><text x="${h[0]}" y="${h[1] + 7}" text-anchor="middle">Home</text></g>
      <g id="sunNode"><circle class="node" cx="${s[0]}" cy="${s[1]}" r="44" stroke="#f2b84b"/><text x="${s[0]}" y="${s[1] + 7}" text-anchor="middle">Solar</text></g>
      <text class="sub" id="tImp" x="${(g[0] + h[0]) / 2}" y="${(g[1] + h[1]) / 2 + 40}">—</text>
      <text class="sub" id="tExp" x="${(h[0] + s[0]) / 2}" y="${(h[1] + s[1]) / 2 + 40}">—</text>
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
    <div class="ticker" id="ticker"></div>
  </section>
  <section class="ecard" id="ecard" hidden>
    <div class="etop">
      <h3 id="eTitle">Energy · latest day</h3>
      <div class="legend">${peakTxt ? `<span><b style="background:#e8734a"></b>Grid in · ${esc(peakTxt)}</span>` : ''}<span><b style="background:#b49cf0"></b>Grid in${peakTxt ? ' · other hours' : ''}</span><span><b style="background:#f2b84b"></b>Solar out</span></div>
      <button class="play" id="play">▶ Replay day</button>
    </div>
    <input type="range" id="hour" min="0" max="23" step="1" value="12" aria-label="Hour of the day">
    <div class="chart" id="chart"></div>
    <div class="chart" id="chart14"></div>
    <div class="heat" id="heat"></div>
    <p class="muted" style="margin:0">${en ? esc(C.energy.note || '') : ''}</p>
  </section>
  </div>
  <aside class="panel">
    <div class="tabs" role="group" aria-label="View" ${en ? '' : 'hidden'}><button id="vHouse" aria-pressed="true">House</button><button id="vEnergy" aria-pressed="false">Energy</button></div>
    <h2>${esc(C.title)}</h2>
    <div class="sec" ${en ? '' : 'hidden'}>
      <div class="eyebrow"><span id="dayLbl">Energy · latest day</span><span>${en ? esc(C.energy.source || '') : ''}</span></div>
      <div class="kpis">
        <div class="kpi"><div class="v" id="kCost">—</div><div class="k">Cost</div></div>
        <div class="kpi"><div class="v" id="kUsed">—</div><div class="k">Used</div></div>
        <div class="kpi"><div class="v" id="kSolar" style="color:var(--ok)">—</div><div class="k">Solar out</div></div>
      </div>
      <div class="row"><small>This bill so far</small><span id="bill" style="font-family:var(--data)">—</span></div>
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

class HouseTwin extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._stats = null; this._statsAt = 0; }
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
    this.addEventListener('keydown', e => { if (e.key === 'Escape') this._exitTv(); });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && this.hasAttribute('tv') && this._tvFs) this._exitTv(); });
    this._mode = 'house';
    const setMode = m => {
      this._mode = m;
      $('vHouse').setAttribute('aria-pressed', m === 'house'); $('vEnergy').setAttribute('aria-pressed', m === 'energy');
      $('ecard').hidden = m !== 'energy'; $('flows').classList.toggle('show', m === 'energy');
      if (m !== 'energy') this._stopPlay();
      this._render();
    };
    $('vHouse').addEventListener('click', () => setMode('house'));
    $('vEnergy').addEventListener('click', () => setMode('energy'));
    $('hour').addEventListener('input', () => { this._stopPlay(); this._render(); });
    $('play').addEventListener('click', () => this._playing ? this._stopPlay() : this._startPlay());
    this._setMode = setMode;
    this._built = true;
    if (/[?&]tv(=1|&|$)/.test(location.search)) this._enterTv(false);
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

  // ---- TV mode: full screen, no side panel, alternates House and an Energy replay ----
  _enterTv(fullscreen) {
    this.setAttribute('tv', ''); this._tvFs = fullscreen;
    if (fullscreen && this.requestFullscreen) this.requestFullscreen().catch(() => {});
    let n = 0;
    clearInterval(this._tvTimer);
    this._tvTimer = setInterval(() => {
      n++;
      const energy = n % 2 === 1 && !!this._hourly;
      this._setMode(energy ? 'energy' : 'house');
      if (energy) { this.$('hour').value = 0; this._startPlay(); }
    }, CONFIG.tvModeSeconds * 1000);
    this._setMode('house');
  }
  _exitTv() {
    if (!this.hasAttribute('tv')) return;
    clearInterval(this._tvTimer); this.removeAttribute('tv'); this._setMode('house');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  _moreInfo(entityId) { this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true })); }
  _st(id) { return this._hass && id && this._hass.states[id]; }

  _render() {
    if (!this._hass || !this.$) return;
    const C = CONFIG, $ = this.$, now = new Date(), h = now.getHours() + now.getMinutes() / 60;
    // Lighting: blend by real sun elevation (dusk band around the horizon); in Energy mode follow the replay hour.
    const energy = this._mode === 'energy', eh = +$('hour').value + .5, sp = C.sunPath;
    const sun = this._st('sun.sun');
    const el = energy ? (eh > sp.rise && eh < sp.set ? sp.maxElevation * Math.sin(Math.PI * (eh - sp.rise) / (sp.set - sp.rise)) : -12)
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

    const num = id => { const s = this._st(id); return s && s.state !== '' && !isNaN(+s.state) ? +s.state : NaN; };
    C.appliances.forEach((a, i) => {
      const w = num(a.power), day = num(a.today), mon = num(a.month);
      $(`ap${i}Now`).textContent = isNaN(w) ? 'Offline' : `${Math.round(w)} W`;
      $(`ap${i}Day`).textContent = isNaN(day) ? '—' : `${day.toFixed(2)} kWh`;
      $(`ap${i}Mon`).textContent = isNaN(mon) ? '—' : money(mon * RATE_AVG);
      $(`ap${i}L`).textContent = isNaN(w) ? `${a.name} · offline` : `${a.name} · ${Math.round(w)} W`;
      $(`ap${i}`).classList.toggle('active', w > (a.runningAbove || 10));
      $(`ap${i}`).classList.toggle('warn', isNaN(w));
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

    if (C.energy) {
      const bill = num(C.energy.bill);
      $('bill').textContent = isNaN(bill) ? '—' : money(bill);
    }
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

  _startPlay() {
    const $ = this.$; this._playing = true; $('play').textContent = '❚❚ Pause';
    if (+$('hour').value >= 23) $('hour').value = 0;
    clearInterval(this._play);
    this._play = setInterval(() => {
      const v = +$('hour').value; if (v >= 23) { this._stopPlay(); return; }
      $('hour').value = v + 1; this._render();
    }, 900);
  }
  _stopPlay() { clearInterval(this._play); this._playing = false; if (this.$) this.$('play').textContent = '▶ Replay day'; }

  _renderEnergy() {
    const $ = this.$, d = this._hourly, hr = +$('hour').value;
    if (!d) { $('eTitle').textContent = 'Energy · loading meter data…'; return; }
    $('eTitle').textContent = `Energy · ${d.label} · ${String(hr).padStart(2, '0')}:00–${String(hr + 1).padStart(2, '0')}:00`;
    const imp = d.imp[hr], exp = d.exp[hr];
    const flow = (id, kwh, t) => {
      const p = $(id); p.style.strokeWidth = kwh > .02 ? 4 + Math.min(kwh, 4) * 5 : 0; p.style.opacity = kwh > .02 ? 1 : 0;
      p.style.setProperty('--dur', `${Math.max(.5, 2.4 - kwh * .45)}s`); $(t).textContent = kwh > .02 ? `${kwh.toFixed(1)} kWh` : '';
    };
    flow('fImp', imp, 'tImp'); flow('fExp', exp, 'tExp');
    $('sunNode').style.opacity = hr >= 6 && hr <= 18 ? 1 : .35;

    // hourly chart: import above the axis (peak hours highlighted), export below
    const W = 720, H = 200, mid = 120, pad = 28, bw = (W - pad) / 24;
    const max = Math.max(1, ...d.imp), maxE = Math.max(1, ...d.exp);
    const sUp = (mid - 14) / max, sDn = (H - mid - 18) / maxE;
    let bars = '', shade = '';
    for (let i = 0; i < 24; i++) {
      const x = pad + i * bw + 2, w = bw - 4, op = i === hr ? 1 : .55;
      if (IS_PEAK(i)) shade += `<rect x="${pad + i * bw}" y="4" width="${bw}" height="${mid - 4}" fill="rgba(232,115,74,.08)"/>`;
      bars += `<rect x="${x}" y="${mid - d.imp[i] * sUp}" width="${w}" height="${d.imp[i] * sUp}" rx="2" fill="${IS_PEAK(i) ? '#e8734a' : '#b49cf0'}" opacity="${op}"/>`;
      bars += `<rect x="${x}" y="${mid}" width="${w}" height="${d.exp[i] * sDn}" rx="2" fill="#f2b84b" opacity="${op}"/>`;
      if (i % 3 === 0) bars += `<text x="${x + w / 2}" y="${H - 2}" text-anchor="middle">${i}</text>`;
    }
    const hx = pad + hr * bw;
    $('chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hourly grid import and solar export">
      ${shade}<rect x="${hx}" y="4" width="${bw}" height="${H - 20}" fill="rgba(255,255,255,.06)"/>
      <line x1="${pad}" x2="${W}" y1="${mid}" y2="${mid}" stroke="rgba(255,255,255,.2)"/>
      <text x="0" y="14">${max.toFixed(1)}</text><text x="0" y="${mid - 4}">in</text><text x="0" y="${mid + 14}">out</text>
      ${bars}</svg>`;

    // 14-day strip: daily grid in vs solar out
    const days = this._daily || [], dmax = Math.max(1, ...days.map(x => Math.max(x.used, x.solar)));
    const cw = W / Math.max(days.length, 1);
    let strip = '';
    days.forEach((x, i) => {
      const bx = i * cw + 4, w2 = (cw - 10) / 2;
      strip += `<rect x="${bx}" y="${70 - x.used / dmax * 60}" width="${w2}" height="${x.used / dmax * 60}" rx="2" fill="#b49cf0"/>`;
      strip += `<rect x="${bx + w2 + 2}" y="${70 - x.solar / dmax * 60}" width="${w2}" height="${x.solar / dmax * 60}" rx="2" fill="#f2b84b"/>`;
      strip += `<text x="${bx + w2}" y="86" text-anchor="middle">${x.label}</text>`;
    });
    const tot = d.imp.reduce((a, b) => a + b, 0), totE = d.exp.reduce((a, b) => a + b, 0);
    $('chart14').innerHTML = `<div class="row" style="margin-bottom:6px"><small>Day total</small><span style="font-family:var(--data)">${tot.toFixed(1)} kWh in · ${totE.toFixed(1)} kWh out · ${money(d.cost)}</span></div>
      <svg viewBox="0 0 ${W} 92" role="img" aria-label="Daily grid import and solar export, last two weeks">${strip}</svg>`;

    // cost heatmap: rows = days, columns = hours; colour = money spent that hour at your configured rates
    const hm = this._heat;
    if (hm && hm.length) {
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
        r.cells.forEach((v, hh) => { cells += `<rect class="c" x="${L + hh * cwH + 1}" y="${y + 1}" width="${cwH - 2}" height="${ch - 2}" rx="2" fill="${col(v)}"><title>${r.label} ${hh}:00 · ${money(v)}</title></rect>`; });
      });
      $('heat').innerHTML = `<div class="row" style="margin:6px 0"><small>What each hour cost · last ${hm.length} days (shaded = peak)</small><small>priced at your configured rates</small></div>
        <svg viewBox="0 0 ${W} ${top + hm.length * ch + 4}" role="img" aria-label="Hourly cost heatmap">${cells}</svg>`;
    }
  }

  async _loadStats() {
    this._statsAt = Date.now();
    const E = CONFIG.energy;
    if (!E || !E.import || !E.import.length) return;
    const exp = E.export || [], cst = E.cost || [], ids = [...E.import, ...exp, ...cst];
    const ws = (start, end, period, statistic_ids = ids) => this._hass.callWS({ type: 'recorder/statistics_during_period',
      start_time: start.toISOString(), ...(end ? { end_time: end.toISOString() } : {}), statistic_ids, period, types: ['change'] });
    const byHour = (r, list) => { const a = Array(24).fill(0); for (const id of list) for (const x of r[id] || []) a[new Date(x.start).getHours()] += x.change || 0; return a; };
    const sum = a => a.reduce((p, c) => p + c, 0);
    try {
      const start = new Date(); start.setDate(start.getDate() - 16); start.setHours(0, 0, 0, 0);
      const r = await ws(start, null, 'day');
      const ch = (list, t) => list.reduce((acc, id) => acc + (((r[id] || []).find(x => x.start === t) || {}).change || 0), 0);
      const allDays = [...new Set(E.import.flatMap(id => (r[id] || []).map(x => x.start)))].sort((a, b) => a - b);
      if (!allDays.length) return;
      this._daily = allDays.slice(-14).map(t => ({ used: ch(E.import, t), solar: ch(exp, t),
        label: new Date(t).toLocaleDateString(CONFIG.locale, { day: 'numeric', month: 'numeric' }) }));

      // latest day with data, hour by hour (retailer data usually lags 1–2 days)
      const dayStart = new Date(allDays[allDays.length - 1]), dayEnd = new Date(+dayStart + 86400000);
      const rh = await ws(dayStart, dayEnd, 'hour');
      const imp = byHour(rh, E.import), ex = byHour(rh, exp);
      const cost = cst.length ? sum(byHour(rh, cst)) : sum(imp.map((v, hh) => v * RATE(hh)));
      this._hourly = { imp, exp: ex, cost, label: dayStart.toLocaleDateString(CONFIG.locale, { weekday: 'long', day: 'numeric', month: 'short' }) };
      this._stats = { used: sum(imp), solar: sum(ex), cost, label: dayStart.toLocaleDateString(CONFIG.locale, { weekday: 'short', day: 'numeric', month: 'short' }) };

      // heatmap: every hour of the last 14 data days, priced at the configured rate for that hour
      const hs = allDays.slice(-14), hStart = new Date(hs[0]), hEnd = new Date(hs[hs.length - 1] + 86400000);
      const rr = await ws(hStart, hEnd, 'hour', E.import);
      const grid = new Map(hs.map(t => [new Date(t).toDateString(), Array(24).fill(0)]));
      for (const id of E.import) for (const x of rr[id] || []) {
        const dt = new Date(x.start), row = grid.get(dt.toDateString());
        if (row) row[dt.getHours()] += (x.change || 0) * RATE(dt.getHours());
      }
      this._heat = hs.map(t => { const cells = grid.get(new Date(t).toDateString());
        return { label: new Date(t).toLocaleDateString(CONFIG.locale, { weekday: 'short', day: 'numeric' }), cells, total: sum(cells) }; });
      this._render();
    } catch (e) { console.warn('house-twin: statistics unavailable', e); }
  }
}
customElements.define('house-twin-panel', HouseTwin);
