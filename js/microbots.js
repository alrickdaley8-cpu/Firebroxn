/* ============================================================================
   MICROBOTS v2.0 — a Big Hero 6 fan demo
   ----------------------------------------------------------------------------
   A neural-linked swarm of thousands of magnetic microbots that link into
   streamers, towers, waves, galaxies, rain, the San Fransokyo skyline, a heart,
   Baymax's face and title text — steered by your pointer like Hiro's
   neurotransmitter headband.

   Features
     · 9 swarm modes                    · hold = gather, release = surge
     · right-drag = repel field         · wheel = swarm spread
     · 4 color themes (armor red!)      · ghost trails
     · ambient hum + synth SFX          · screenshot capture, fullscreen
     · boot sequence + control manual   · adaptive perf governor
     · auto demo with scripted surges

   Zero dependencies. Vanilla canvas + WebAudio.
   ========================================================================== */
(() => {
'use strict';

const TAU = Math.PI * 2;
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const $ = (s) => document.querySelector(s);

/* ---------------------------------------------------------------- themes */
const THEMES = [
  { name: 'KABUKI GREEN', hex: '#46ffc2', rgb: '70,255,194' },
  { name: 'BAYMAX ARMOR', hex: '#ff4d6a', rgb: '255,77,106' },
  { name: 'HIRO PURPLE',  hex: '#9d6eff', rgb: '157,110,255' },
  { name: 'SFIT CYAN',    hex: '#3cd6ff', rgb: '60,214,255' },
];

/* ----------------------------------------------------------------- modes */
const MODES = ['swarm', 'tower', 'wave', 'galaxy', 'rain', 'skyline', 'baymax', 'heart', 'title'];
const MODE_LABEL = {
  swarm:   'SWARM LINK',
  tower:   'TOWER RISING',
  wave:    'TSUNAMI WAVE',
  galaxy:  'GALAXY SPIRAL',
  rain:    'MICROBOT RAIN',
  skyline: 'SAN FRANSOKYO',
  baymax:  'BAYMAX PROTOCOL',
  heart:   'SATISFIED WITH MY CARE',
  title:   'TITLE SEQUENCE',
};
const PHRASES = ['BIG HERO 6', 'BA-NA-NA', 'HELLO', 'I AM BAYMAX'];
const SHAPE_MODES = { skyline: 1, baymax: 1, heart: 1, title: 1 };

/* ------------------------------------------------------------------ state */
let W = 0, H = 0, DPR = 1;
let bg = null;

const LINK_D = 12, LINK2 = LINK_D * LINK_D;
const SEP_R = 6.4, SEP2 = SEP_R * SEP_R;
const CELL = LINK_D;
let cols = 0, rows = 0, grid = [];

const BODY_FILLS = ['#1d222c', '#232936', '#1a1e28', '#202634'];

const S = {
  mode: 'swarm',
  t: 0, last: performance.now(), frame: 0,
  bots: [],
  targetCount: 1500, adaptCap: 2200,
  px: 0, py: 0, ptx: 0, pty: 0,
  down: false, manual: false, charge: 0,
  repel: false,
  spread: 1,
  paused: false, ghost: false,
  theme: 0, phrase: 0,
  shake: 0, anchorX: 0,
  autoTimer: 0, autoIdx: 0, autoGather: false, wasAutoGather: false,
  sfx: true, humOn: false,
  fps: 60, adaptAcc: 0, adaptN: 0,
  links: [], rings: [],
  trail: [],        // pointer comet trail
  motes: [],        // ambient dust
  scanX: -1, scanTimer: 6,
  booted: false,
};

const LINK_RGB = () => THEMES[S.theme].rgb;

/* ---------------------------------------------------------------- helpers */
const rand  = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp  = (a, b, t) => a + (b - a) * t;

let toastTimer = 0;
function toast(msg, ms = 1600) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function setTheme(i, quiet) {
  S.theme = ((i % THEMES.length) + THEMES.length) % THEMES.length;
  const th = THEMES[S.theme];
  document.documentElement.style.setProperty('--accent', th.hex);
  if (!quiet) { toast(`THEME — ${th.name}`); chirp(392, 587.33, 0.09, 'triangle', 0.03); }
}

/* ------------------------------------------------------------------ audio */
let AC = null, hum = null;
function audio() {
  if (!S.sfx && !S.humOn) return null;
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    return AC;
  } catch (e) { return null; }
}
function chirp(f0, f1, dur = 0.09, type = 'sine', g = 0.04) {
  if (!S.sfx) return;
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime;
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.linearRampToValueAtTime(g, t0 + 0.008);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn).connect(ac.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function arpeggio() {
  if (!S.sfx) return;
  const notes = [523.25, 622.25, 783.99];
  notes.forEach((f, i) => setTimeout(() => chirp(f, f * 1.01, 0.08, 'square', 0.018), i * 62));
}
function whoosh(strength = 1) {
  if (!S.sfx) return;
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime, dur = 0.55;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource(); src.buffer = buf;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(280, t0);
  bp.frequency.exponentialRampToValueAtTime(1600, t0 + dur * 0.35);
  bp.frequency.exponentialRampToValueAtTime(160, t0 + dur);
  const gn = ac.createGain();
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.linearRampToValueAtTime(0.10 * strength, t0 + 0.03);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(gn).connect(ac.destination);
  src.start(t0);
  chirp(150, 42, 0.35, 'sine', 0.10 * strength);
}
function setHum(on) {
  S.humOn = on;
  $('#hum').setAttribute('aria-pressed', String(on));
  if (on) {
    const ac = audio(); if (!ac) { S.humOn = false; return; }
    const g = ac.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.014, ac.currentTime + 1.2);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const o1 = ac.createOscillator(); o1.frequency.value = 55;
    const o2 = ac.createOscillator(); o2.frequency.value = 55.6;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.13;
    const lfoG = ac.createGain(); lfoG.gain.value = 0.005;
    lfo.connect(lfoG).connect(g.gain);
    o1.connect(lp); o2.connect(lp); lp.connect(g).connect(ac.destination);
    o1.start(); o2.start(); lfo.start();
    hum = { o1, o2, lfo, g };
    toast('AMBIENT HUM ON');
  } else if (hum) {
    const ac = AC, h = hum;
    h.g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5);
    setTimeout(() => { h.o1.stop(); h.o2.stop(); h.lfo.stop(); }, 700);
    hum = null;
    toast('AMBIENT HUM OFF');
  }
}

/* ------------------------------------------------------------------- bots */
function spawnBot(x, y, vx = 0, vy = 0) {
  S.bots.push({
    x, y, vx, vy,
    a: rand(TAU), seed: rand(1),
    orbitR: 0, orbitA: rand(TAU), orbitSpd: 1,          // swarm
    hf: 0, spin: 1,                                     // tower
    u: rand(1), rib: 0, off: rand(TAU),                 // wave
    gr: 0, ga: 0, gArm: 0,                              // galaxy
    rx: 0, spd: 1, pool: false,                         // rain
    sx: 0, sy: 0,                                       // shapes
    leaving: false,
    size: rand(0.85, 1.25),
    fill: (Math.random() * BODY_FILLS.length) | 0,
  });
}
function spawnFromEdge() {
  const side = (Math.random() * 4) | 0, m = 24;
  let x, y, vx, vy;
  if (side === 0)      { x = rand(W); y = -m;    vx = rand(-1, 1);  vy = rand(3, 6); }
  else if (side === 1) { x = W + m;   y = rand(H); vx = -rand(3, 6); vy = rand(-1, 1); }
  else if (side === 2) { x = rand(W); y = H + m;  vx = rand(-1, 1);  vy = -rand(3, 6); }
  else                 { x = -m;      y = rand(H); vx = rand(3, 6);  vy = rand(-1, 1); }
  spawnBot(x, y, vx, vy);
}

/* ------------------------------------------------------- shape sampling */
function sampleShape(drawFn, designW, designH, maxW, maxH, cx, cy) {
  const oc = document.createElement('canvas');
  oc.width = designW; oc.height = designH;
  const c = oc.getContext('2d', { willReadFrequently: true });
  drawFn(c, designW, designH);
  const img = c.getImageData(0, 0, designW, designH).data;
  const raw = [];
  for (let y = 0; y < designH; y += 2)
    for (let x = 0; x < designW; x += 2)
      if (img[(y * designW + x) * 4 + 3] > 128) raw.push([x, y]);
  if (!raw.length) raw.push([designW / 2, designH / 2]);
  const scale = Math.min(maxW / designW, maxH / designH, 2.4);
  const pts = [];
  for (const [x, y] of raw)
    pts.push({ x: cx + (x - designW / 2) * scale, y: cy + (y - designH / 2) * scale });
  for (let i = pts.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts;
}

function drawBaymax(c, w, h) {
  const cx = w / 2, cy = h / 2;
  c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineCap = 'round';
  c.lineWidth = 6.5;
  c.beginPath(); c.ellipse(cx, cy, w * 0.30, h * 0.35, 0, 0, TAU); c.stroke();
  c.beginPath(); c.arc(cx - w * 0.105, cy - 4, 7.5, 0, TAU); c.fill();
  c.beginPath(); c.arc(cx + w * 0.105, cy - 4, 7.5, 0, TAU); c.fill();
  c.lineWidth = 5;
  c.beginPath(); c.moveTo(cx - w * 0.105, cy - 4); c.lineTo(cx + w * 0.105, cy - 4); c.stroke();
}
function drawHeart(c, w, h) {
  c.fillStyle = '#fff';
  c.beginPath();
  c.moveTo(w * 0.5, h * 0.30);
  c.bezierCurveTo(w * 0.5, h * 0.10, w * 0.06, h * 0.16, w * 0.06, h * 0.42);
  c.bezierCurveTo(w * 0.06, h * 0.64, w * 0.34, h * 0.78, w * 0.5, h * 0.94);
  c.bezierCurveTo(w * 0.66, h * 0.78, w * 0.94, h * 0.64, w * 0.94, h * 0.42);
  c.bezierCurveTo(w * 0.94, h * 0.16, w * 0.5, h * 0.10, w * 0.5, h * 0.30);
  c.closePath(); c.fill();
}
function drawSkyline(c, w, h) {
  const baseY = h * 0.82;
  c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineCap = 'round';
  // sun disc over the bay
  c.beginPath(); c.arc(w * 0.55, h * 0.24, 24, 0, TAU); c.fill();
  // buildings (left half)
  let x = 4;
  while (x < w * 0.50) {
    const bw = rand(16, 30), bh = rand(h * 0.16, h * 0.56);
    c.fillRect(x, baseY - bh, bw, bh);
    if (Math.random() < 0.25) c.fillRect(x + bw / 2 - 1.5, baseY - bh - 10, 3, 10); // antenna
    if (Math.random() < 0.35) c.fillRect(x - 3, baseY - bh + 6, bw + 6, 5);          // tier
    x += bw + rand(3, 9);
  }
  // San Fransokyo bridge (right half)
  const x1 = w * 0.56, x2 = w * 0.98, deckY = baseY - 16;
  const tA = w * 0.64, tB = w * 0.86, topY = h * 0.24;
  c.lineWidth = 3.2;
  for (const tx of [tA, tB]) {
    c.fillRect(tx - 3, topY, 6, deckY - topY + 6);            // tower
    c.fillRect(tx - 9, topY + 22, 18, 4);                     // crossbeam
  }
  c.fillRect(x1, deckY, x2 - x1, 6);                           // deck
  c.beginPath();                                               // main cable
  c.moveTo(x1, deckY - 2);
  c.quadraticCurveTo((x1 + tA) / 2, deckY + 26, tA, topY + 2);
  c.quadraticCurveTo((tA + tB) / 2, deckY + 34, tB, topY + 2);
  c.quadraticCurveTo((tB + x2) / 2, deckY + 26, x2, deckY - 2);
  c.stroke();
  c.lineWidth = 2.2;                                           // suspenders
  for (let sx = tA + 6; sx < tB; sx += 10) {
    const cy = topY + 2 + (1 - Math.pow((2 * (sx - tA) / (tB - tA)) - 1, 2)) * (deckY + 30 - topY);
    c.beginPath(); c.moveTo(sx, Math.min(cy, deckY)); c.lineTo(sx, deckY); c.stroke();
  }
  // ground strip
  c.fillRect(0, baseY, w, h - baseY);
}
function drawTitle(c, w, h) {
  c.fillStyle = '#fff';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const text = PHRASES[S.phrase];
  let size = h * 0.62;
  c.font = `900 ${size}px ui-sans-serif, system-ui, sans-serif`;
  while (c.measureText(text).width > w * 0.94 && size > 10) {
    size -= 2;
    c.font = `900 ${size}px ui-sans-serif, system-ui, sans-serif`;
  }
  try { c.letterSpacing = '6px'; } catch (e) {}
  c.fillText(text, w / 2, h / 2 + 2);
}

const SHAPES = {
  skyline: { draw: drawSkyline, w: 380, h: 210, mw: 0.96, mh: 0.60, cy: 0.46 },
  baymax:  { draw: drawBaymax,  w: 360, h: 220, mw: 0.62, mh: 0.52, cy: 0.42 },
  heart:   { draw: drawHeart,   w: 220, h: 200, mw: 0.46, mh: 0.42, cy: 0.42 },
  title:   { draw: drawTitle,   w: 460, h: 110, mw: 0.88, mh: 0.30, cy: 0.40 },
};
function assignShapeTargets() {
  const s = SHAPES[S.mode];
  if (!s) return;
  const pts = sampleShape(s.draw, s.w, s.h, W * s.mw, H * s.mh, W / 2, H * s.cy);
  for (let i = 0; i < S.bots.length; i++) {
    const b = S.bots[i], p = pts[i % pts.length];
    b.sx = p.x + rand(-2, 2);
    b.sy = p.y + rand(-2, 2);
  }
}

/* -------------------------------------------------------------- set mode */
function setMode(mode, quiet) {
  S.mode = mode;
  document.querySelectorAll('#modes button').forEach((btn) =>
    btn.classList.toggle('active', btn.dataset.mode === mode));
  $('#stat-mode').textContent = MODE_LABEL[mode];

  const midX = W / 2, midY = H * 0.42;
  for (const b of S.bots) {
    if (mode === 'swarm') {
      b.orbitR = 16 + Math.pow(Math.random(), 1.6) * Math.min(W, H) * 0.42;
      b.orbitA = rand(TAU);
      b.orbitSpd = (0.35 + 55 / (b.orbitR + 30)) * (Math.random() < 0.18 ? -1 : 1);
    } else if (mode === 'tower') {
      b.hf = Math.random();
      b.spin = rand(1.2, 2.6) * (Math.random() < 0.5 ? 1 : -1);
    } else if (mode === 'wave') {
      b.u = rand(1);
      b.rib = (Math.random() * 3) | 0;
      b.off = rand(TAU);
    } else if (mode === 'galaxy') {
      b.gr = 14 + Math.pow(Math.random(), 0.6) * Math.min(W, H) * 0.46;
      b.ga = b.gr * 0.05;
      b.gArm = (Math.random() * 3) | 0;
      b.off = rand(-0.14, 0.14);
    } else if (mode === 'rain') {
      b.rx = rand(W);
      b.spd = rand(0.5, 1.05);
      b.off = rand(1.2);
      b.pool = Math.random() < 0.22;
    }
    b.vx += rand(-1.6, 1.6);
    b.vy += rand(-1.6, 1.6);
  }
  if (SHAPE_MODES[mode]) assignShapeTargets();
  if (mode === 'tower') S.anchorX = S.px || midX;

  if (!quiet) { arpeggio(); toast(MODE_LABEL[mode]); }
}

function cyclePhrase() {
  S.phrase = (S.phrase + 1) % PHRASES.length;
  assignShapeTargets();
  toast(`“${PHRASES[S.phrase]}”`);
  chirp(659.25, 880, 0.08, 'triangle', 0.03);
}

/* ------------------------------------------------------------ background */
function buildBG() {
  bg = document.createElement('canvas');
  bg.width = Math.max(1, W); bg.height = Math.max(1, H);
  const c = bg.getContext('2d');
  const g = c.createRadialGradient(W / 2, H * 0.32, 0, W / 2, H * 0.4, Math.max(W, H) * 0.75);
  g.addColorStop(0, '#0b1428');
  g.addColorStop(0.55, '#060a16');
  g.addColorStop(1, '#03040a');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(90,170,210,0.05)';
  c.lineWidth = 1;
  c.beginPath();
  for (let x = 0.5; x < W; x += 44) { c.moveTo(x, 0); c.lineTo(x, H); }
  for (let y = 0.5; y < H; y += 44) { c.moveTo(0, y); c.lineTo(W, y); }
  c.stroke();
  c.strokeStyle = 'rgba(90,200,220,0.10)';
  for (const [x, y, dx, dy] of [[24, 24, 1, 1], [W - 24, 24, -1, 1], [24, H - 24, 1, -1], [W - 24, H - 24, -1, -1]]) {
    c.beginPath(); c.moveTo(x + 20 * dx, y); c.lineTo(x, y); c.lineTo(x, y + 20 * dy); c.stroke();
  }
}

/* ---------------------------------------------------------------- resize */
function resize() {
  DPR = clamp(window.devicePixelRatio || 1, 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  buildBG();
  cols = Math.max(1, Math.ceil(W / CELL));
  rows = Math.max(1, Math.ceil(H / CELL));
  grid = new Array(cols * rows);
  for (let i = 0; i < grid.length; i++) grid[i] = [];
  S.motes = [];
  for (let i = 0; i < 42; i++)
    S.motes.push({ x: rand(W), y: rand(H), d: rand(0.3, 1), ph: rand(TAU) });
  if (SHAPE_MODES[S.mode]) assignShapeTargets();
}

/* --------------------------------------------------------------- physics */
function buildGrid() {
  for (let i = 0; i < grid.length; i++) grid[i].length = 0;
  const bots = S.bots;
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    const cx = clamp((b.x / CELL) | 0, 0, cols - 1);
    const cy = clamp((b.y / CELL) | 0, 0, rows - 1);
    grid[cy * cols + cx].push(i);
  }
}

function pairPass() {
  const bots = S.bots;
  S.links.length = 0;
  const linkCap = 11000;

  const visit = (ia, ib) => {
    const a = bots[ia], b = bots[ib];
    const dx = b.x - a.x, dy = b.y - a.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > LINK2 || d2 === 0) return;
    if (d2 < SEP2) {
      const d = Math.sqrt(d2) || 0.001;
      const f = ((SEP_R - d) / SEP_R) * 0.55;
      const nx = dx / d, ny = dy / d;
      a.vx -= nx * f; a.vy -= ny * f;
      b.vx += nx * f; b.vy += ny * f;
    }
    if (S.links.length < linkCap * 3)
      S.links.push(ia, ib, 1 - Math.sqrt(d2) / LINK_D);
  };

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const A = grid[cy * cols + cx];
      if (!A.length) continue;
      for (let i = 0; i < A.length; i++)
        for (let j = i + 1; j < A.length; j++) visit(A[i], A[j]);
      for (const [ox, oy] of [[1, 0], [-1, 1], [0, 1], [1, 1]]) {
        const nx = cx + ox, ny = cy + oy;
        if (nx < 0 || nx >= cols || ny >= rows) continue;
        const B = grid[ny * cols + nx];
        for (let i = 0; i < A.length; i++)
          for (let j = 0; j < B.length; j++) visit(A[i], B[j]);
      }
    }
  }
}

function steer(b, tx, ty, k, damp, dtN) {
  b.vx += (tx - b.x) * k * dtN;
  b.vy += (ty - b.y) * k * dtN;
  const d = Math.pow(damp, dtN);
  b.vx *= d; b.vy *= d;
}

function physics(dtN) {
  const t = S.t, bots = S.bots, mode = S.mode;
  const px = S.px, py = S.py;
  const gathering = (S.down && S.manual) || S.autoGather;
  const baseY = H * 0.84, towerH = H * 0.62;
  const spread = S.spread;

  if (mode === 'tower') S.anchorX = lerp(S.anchorX || px, px, 0.04 * dtN);

  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];

    if (b.leaving) {
      b.vx *= 1.04; b.vy *= 1.04;
      b.x += b.vx * dtN; b.y += b.vy * dtN;
      continue;
    }

    if (gathering) {
      const dx = px - b.x, dy = py - b.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const k = 0.016 + S.charge * 0.03;
      b.vx += dx * k * dtN + (-dy / d) * (0.5 + S.charge * 1.4) * dtN;
      b.vy += dy * k * dtN + ( dx / d) * (0.5 + S.charge * 1.4) * dtN;
      const dmp = Math.pow(0.90, dtN);
      b.vx *= dmp; b.vy *= dmp;
    } else if (mode === 'swarm') {
      const a = b.orbitA + t * b.orbitSpd;
      const rr = b.orbitR * spread * (1 + 0.07 * Math.sin(t * 1.7 + b.seed * 9));
      steer(b, px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.8, 0.0045, 0.93, dtN);
    } else if (mode === 'tower') {
      const hf = b.hf;
      const ang = b.orbitA + t * b.spin;
      const R = (40 + 26 * Math.sin(hf * 9 + t * 0.8)) * (1 - hf * 0.55);
      const sway = Math.sin(t * 1.15) * 34 * hf;
      steer(b,
        S.anchorX + Math.cos(ang) * R + sway,
        baseY - hf * towerH + Math.sin(ang) * R * 0.3,
        0.010, 0.90, dtN);
      if (hf > 0.93 && Math.random() < 0.004) { b.vy -= rand(2, 4); b.vx += rand(-1, 1); }
    } else if (mode === 'wave') {
      const u = (b.u + t * 0.022) % 1;
      const x = u * (W + 180) - 90;
      const y = H * 0.34 + b.rib * (H * 0.10)
        + Math.sin(x * 0.011 - t * (2.1 + b.rib * 0.33) + b.off) * (52 + b.rib * 16)
        + Math.sin(x * 0.05 + t * 4) * 5;
      steer(b, x, y, 0.016, 0.90, dtN);
    } else if (mode === 'galaxy') {
      const a = b.ga + b.gArm * (TAU / 3) + b.off + t * 0.22;
      const r = b.gr * spread;
      steer(b,
        px + Math.cos(a) * r,
        py + Math.sin(a) * r * 0.55,
        0.006, 0.92, dtN);
    } else if (mode === 'rain') {
      if (b.pool) {
        const y = H * 0.955 + Math.sin(b.rx * 0.02 + t * 2.2) * 5;
        steer(b, b.rx, y, 0.03, 0.86, dtN);
      } else {
        const prog = (b.off + t * 0.16 * b.spd) % 1.15;
        steer(b, b.rx + Math.sin(t + b.seed * 8) * 3, prog * H * 1.18 - 80, 0.05, 0.90, dtN);
        b.vy += 0.16 * dtN;
      }
    } else { // skyline / baymax / heart / title
      const bx = b.sx + Math.sin(t * 0.9 + b.seed * TAU) * (mode === 'skyline' ? 1.1 : 2.4);
      const by = b.sy + Math.cos(t * 0.8 + b.seed * TAU) * (mode === 'skyline' ? 1.1 : 2.4);
      steer(b, bx, by, 0.042, 0.85, dtN);
    }

    // repel field
    if (S.repel) {
      const dx = b.x - px, dy = b.y - py;
      const d2 = dx * dx + dy * dy, R = 150;
      if (d2 < R * R && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (1 - d / R) * 2.3 * dtN;
        b.vx += (dx / d) * f;
        b.vy += (dy / d) * f;
      }
    }

    // organic shimmer
    b.vx += Math.sin(t * 1.3 + b.seed * 13.7) * 0.05 * dtN;
    b.vy += Math.cos(t * 1.1 + b.seed * 17.3) * 0.05 * dtN;

    const sp2 = b.vx * b.vx + b.vy * b.vy;
    const max = gathering ? 15 : 11;
    if (sp2 > max * max) { const s = max / Math.sqrt(sp2); b.vx *= s; b.vy *= s; }
    b.x += b.vx * dtN;
    b.y += b.vy * dtN;

    const m = 6;
    if (b.x < m) b.vx += (m - b.x) * 0.02 * dtN;
    else if (b.x > W - m) b.vx -= (b.x - (W - m)) * 0.02 * dtN;
    if (b.y < m) b.vy += (m - b.y) * 0.02 * dtN;
    else if (b.y > H - m) b.vy -= (b.y - (H - m)) * 0.02 * dtN;
  }

  buildGrid();
  pairPass();
}

/* --------------------------------------------------------------- render */
function rr(c, x, y, w, h, r) {
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function render(dtN) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (S.shake > 0.2) {
    ctx.translate(rand(-S.shake, S.shake), rand(-S.shake, S.shake));
    S.shake *= Math.pow(0.86, dtN);
  }

  if (S.ghost) {                       // ghost trails: fade the bg instead of clear
    ctx.globalAlpha = 0.26;
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.globalAlpha = 1;
  } else {
    ctx.drawImage(bg, 0, 0, W, H);
  }

  // ambient dust motes with parallax
  ctx.fillStyle = 'rgba(140,200,230,0.25)';
  for (const mo of S.motes) {
    mo.ph += 0.004 * dtN;
    const mx = mo.x + Math.sin(mo.ph) * 14 + (S.px - W / 2) * mo.d * 0.03;
    const my = mo.y + Math.cos(mo.ph * 0.8) * 10 + (S.py - H / 2) * mo.d * 0.02;
    ctx.globalAlpha = 0.10 + mo.d * 0.16;
    ctx.fillRect(((mx % W) + W) % W, ((my % H) + H) % H, mo.d * 2, mo.d * 2);
  }
  ctx.globalAlpha = 1;

  // neural spotlight
  const sg = ctx.createRadialGradient(S.px, S.py, 0, S.px, S.py, 320);
  sg.addColorStop(0, `rgba(${LINK_RGB()},0.06)`);
  sg.addColorStop(1, `rgba(${LINK_RGB()},0)`);
  ctx.fillStyle = sg;
  ctx.fillRect(S.px - 320, S.py - 320, 640, 640);

  // pointer comet trail
  if (S.manual) {
    S.trail.push({ x: S.px, y: S.py });
    if (S.trail.length > 14) S.trail.shift();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < S.trail.length; i++) {
    const p = S.trail[i], f = i / S.trail.length;
    ctx.fillStyle = `rgba(${LINK_RGB()},${(f * 0.16).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, 1 + f * 3.2, 0, TAU); ctx.fill();
  }

  const bots = S.bots;

  // links — two-pass bloom
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = `rgba(${LINK_RGB()},0.05)`;
  ctx.beginPath();
  for (let i = 0; i < S.links.length; i += 3) {
    const a = bots[S.links[i]], b = bots[S.links[i + 1]];
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  let strokeKey = -1;
  for (let i = 0; i < S.links.length; i += 3) {
    const a = bots[S.links[i]], b = bots[S.links[i + 1]], al = S.links[i + 2];
    const key = (al * 6) | 0;
    if (key !== strokeKey) {
      ctx.strokeStyle = `rgba(${LINK_RGB()},${(0.05 + key * 0.028).toFixed(3)})`;
      strokeKey = key;
    }
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // motion streaks
  ctx.strokeStyle = `rgba(${LINK_RGB()},0.09)`;
  ctx.beginPath();
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    const sp = b.vx * b.vx + b.vy * b.vy;
    if (sp > 16) {
      const f = 2.4 / Math.sqrt(sp);
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * f * 3.2, b.y - b.vy * f * 3.2);
    }
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';

  // bot bodies
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp > 0.35) {
      const target = Math.atan2(b.vy, b.vx);
      let da = target - b.a;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      b.a += da * clamp(0.24 * dtN, 0, 1);
    }
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.a);
    ctx.scale(b.size, b.size);
    ctx.fillStyle = BODY_FILLS[b.fill];
    ctx.beginPath();
    rr(ctx, -3.8, -1.9, 7.6, 3.8, 1.9);
    ctx.fill();
    ctx.fillStyle = 'rgba(185,205,235,0.55)';
    ctx.fillRect(-2.6, -1.35, 3.9, 0.85);
    if (Math.sin(S.t * 3 + b.seed * 43) > 0.965) {
      ctx.fillStyle = `rgba(${LINK_RGB()},0.95)`;
      ctx.beginPath(); ctx.arc(2.4, 0, 0.95, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // surge rings
  ctx.globalCompositeOperation = 'lighter';
  for (let i = S.rings.length - 1; i >= 0; i--) {
    const r = S.rings[i];
    r.r += 9 * dtN;
    r.a *= Math.pow(0.93, dtN);
    if (r.a < 0.02) { S.rings.splice(i, 1); continue; }
    ctx.strokeStyle = `rgba(${LINK_RGB()},${r.a})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
  }

  // scan sweep
  if (S.scanX >= 0) {
    const x = S.scanX;
    const grd = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
    grd.addColorStop(0, `rgba(${LINK_RGB()},0)`);
    grd.addColorStop(0.5, `rgba(${LINK_RGB()},0.045)`);
    grd.addColorStop(1, `rgba(${LINK_RGB()},0)`);
    ctx.fillStyle = grd;
    ctx.fillRect(x - 60, 0, 120, H);
  }

  // pointer reticle / charge / repel
  if (S.manual || S.autoGather) {
    if (S.repel) {
      ctx.strokeStyle = 'rgba(255,90,90,0.6)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.arc(S.px, S.py, 150, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    } else if (S.down || S.autoGather) {
      const R = 20 + S.charge * 58;
      ctx.strokeStyle = `rgba(${LINK_RGB()},${0.25 + S.charge * 0.45})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(S.px, S.py, R, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(${LINK_RGB()},${0.05 + S.charge * 0.08})`;
      ctx.beginPath(); ctx.arc(S.px, S.py, R * 0.7, 0, TAU); ctx.fill();
    } else if (S.manual) {
      ctx.strokeStyle = 'rgba(90,220,255,0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(S.px, S.py, 9, 0, TAU); ctx.stroke();
      ctx.beginPath();
      for (const [dx, dy] of [[14, 0], [-14, 0], [0, 14], [0, -14]]) {
        ctx.moveTo(S.px + dx * 0.65, S.py + dy * 0.65);
        ctx.lineTo(S.px + dx, S.py + dy);
      }
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  if (S.paused) {
    ctx.fillStyle = 'rgba(5,8,14,0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(${LINK_RGB()},0.9)`;
    ctx.font = `700 ${Math.min(34, W * 0.05)}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('❚❚ PAUSED', W / 2, H / 2);
  }
}

/* ---------------------------------------------------------------- events */
function goManual() {
  if (S.manual) return;
  S.manual = true;
  S.autoGather = false;
  toast('NEURAL LINK — MANUAL CONTROL');
  chirp(520, 780, 0.08, 'sine', 0.03);
}

window.addEventListener('pointermove', (e) => {
  goManual();
  S.ptx = e.clientX; S.pty = e.clientY;
});
window.addEventListener('pointerdown', (e) => {
  if (!S.booted) finishBoot();
  if (!helpHidden()) hideHelp();
  if (e.target !== canvas) return;
  goManual();
  S.ptx = e.clientX; S.pty = e.clientY;
  if (e.button === 2) { S.repel = true; chirp(220, 140, 0.14, 'sawtooth', 0.03); }
  else { S.down = true; S.charge = 0; chirp(300, 520, 0.12, 'sine', 0.035); }
});
window.addEventListener('pointerup', (e) => {
  if (e.button === 2) { S.repel = false; return; }
  if (!S.down) return;
  S.down = false;
  if (S.charge > 0.12) burst(S.px, S.py, S.charge);
  S.charge = 0;
});
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('wheel', (e) => {
  if (!S.booted) return;
  e.preventDefault();
  goManual();
  S.spread = clamp(S.spread * (e.deltaY > 0 ? 0.92 : 1.085), 0.35, 2.4);
  toast(`SPREAD ${(S.spread * 100) | 0}%`, 700);
}, { passive: false });
window.addEventListener('resize', resize);

function burst(x, y, strength) {
  const power = 3.5 + strength * 11;
  for (const b of S.bots) {
    const dx = b.x - x, dy = b.y - y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const imp = power * (240 / (200 + d));
    b.vx += (dx / d) * imp + rand(-1, 1);
    b.vy += (dy / d) * imp + rand(-1, 1);
  }
  S.shake = Math.min(13, 3 + strength * 10);
  S.rings.push({ x, y, r: 12, a: 0.55 });
  whoosh(0.5 + strength * 0.8);
}

function scatterReset() {
  for (const b of S.bots) {
    const a = rand(TAU), f = rand(3, 9);
    b.vx += Math.cos(a) * f;
    b.vy += Math.sin(a) * f;
  }
  S.shake = 8;
  whoosh(0.9);
  toast('SWARM SCATTERED');
}

function screenshot() {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `microbots-${S.mode}-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('FRAME CAPTURED');
    chirp(1046.5, 1568, 0.06, 'square', 0.02);
  });
}

function togglePause() {
  S.paused = !S.paused;
  toast(S.paused ? 'PAUSED' : 'RESUMED');
  chirp(S.paused ? 440 : 330, S.paused ? 220 : 550, 0.1, 'triangle', 0.03);
}

function toggleGhost() {
  S.ghost = !S.ghost;
  $('#trail').setAttribute('aria-pressed', String(S.ghost));
  toast(S.ghost ? 'GHOST TRAILS ON' : 'GHOST TRAILS OFF');
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

/* help overlay */
const helpHidden = () => $('#help').classList.contains('hidden');
function showHelp() { $('#help').classList.remove('hidden'); }
function hideHelp() { $('#help').classList.add('hidden'); }

window.addEventListener('keydown', (e) => {
  if (!S.booted) { finishBoot(); return; }
  if (!helpHidden() && (e.key === 'Escape' || e.key.toLowerCase() === 'h')) { hideHelp(); return; }
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  const map = { 1: 'swarm', 2: 'tower', 3: 'wave', 4: 'galaxy', 5: 'rain', 6: 'skyline', 7: 'baymax', 8: 'heart' };
  if (map[e.key]) { goManual(); setMode(map[e.key]); }
  else if (e.key === '9') { goManual(); if (S.mode === 'title') cyclePhrase(); else setMode('title'); }
  else if (e.code === 'Space') { e.preventDefault(); goManual(); burst(S.px, S.py, 0.65); }
  else if (k === 't') setTheme(S.theme + 1);
  else if (k === 'g') toggleGhost();
  else if (k === 'p') togglePause();
  else if (k === 'r') scatterReset();
  else if (k === 'c') screenshot();
  else if (k === 'f') toggleFullscreen();
  else if (k === 'h' || e.key === '?') showHelp();
  else if (k === 's') toggleSfx();
});

/* UI wiring */
document.querySelectorAll('#modes button').forEach((btn) =>
  btn.addEventListener('click', () => { goManual(); setMode(btn.dataset.mode); }));

$('#count').addEventListener('input', (e) => { S.targetCount = +e.target.value; });

function toggleSfx() {
  S.sfx = !S.sfx;
  $('#sfx').setAttribute('aria-pressed', String(S.sfx));
  if (S.sfx) chirp(660, 990, 0.07);
}
$('#sfx').addEventListener('click', toggleSfx);
$('#hum').addEventListener('click', () => setHum(!S.humOn));
$('#theme').addEventListener('click', () => setTheme(S.theme + 1));
$('#trail').addEventListener('click', toggleGhost);
$('#shot').addEventListener('click', screenshot);
$('#full').addEventListener('click', toggleFullscreen);
$('#helpBtn').addEventListener('click', () => (helpHidden() ? showHelp() : hideHelp()));
$('#help').addEventListener('click', hideHelp);

/* ---------------------------------------------------------- boot overlay */
const BOOT_LINES = [
  ['mounting microbot cores', 'OK'],
  ['charging 2,200 magnetic lattices', 'OK'],
  ['weaving connection lattice', 'OK'],
  ['calibrating neurotransmitter', 'OK'],
  ['hiro-protocol handshake', 'OK'],
  ['balalalala', '✦'],
];
let bootTimer = null;
function runBoot() {
  const log = $('#boot-log'), bar = $('#boot-bar');
  let i = 0;
  const next = () => {
    if (S.booted) return;
    if (i >= BOOT_LINES.length) {
      bar.style.width = '100%';
      bootTimer = setTimeout(finishBoot, 500);
      return;
    }
    const [txt, mark] = BOOT_LINES[i];
    const line = document.createElement('div');
    line.innerHTML = `&gt; ${txt} ${'.'.repeat(Math.max(2, 34 - txt.length))} <span class="${mark === 'OK' ? 'ok' : 'star'}">${mark}</span>`;
    log.appendChild(line);
    i++;
    bar.style.width = `${(i / BOOT_LINES.length) * 100}%`;
    chirp(700 + i * 60, 700 + i * 60, 0.03, 'square', 0.012);
    bootTimer = setTimeout(next, 430);
  };
  next();
}
function finishBoot() {
  if (S.booted) return;
  S.booted = true;
  clearTimeout(bootTimer);
  $('#boot').classList.add('done');
  setTimeout(() => $('#boot').classList.add('hidden'), 650);
  setTimeout(() => toast('NEURAL LINK ONLINE — AUTO DEMO'), 200);
  setTimeout(() => { if (!S.manual) toast('move your cursor to take control · H for manual'); }, 3000);
}

/* ------------------------------------------------------------- main loop */
function step(now) {
  requestAnimationFrame(step);
  let dt = now - S.last; S.last = now;
  dt = clamp(dt, 1, 50);
  const dtN = S.paused ? 0 : dt / 16.666;
  S.t += (S.paused ? 0 : dt * 0.001);
  S.frame++;

  // perf governor + HUD stats
  S.adaptAcc += dt; S.adaptN++;
  if (S.adaptN >= 90) {
    const avg = S.adaptAcc / S.adaptN;
    if (avg > 26 && S.adaptCap > 700) S.adaptCap -= 150;
    else if (avg < 16.8 && S.adaptCap < 2200) S.adaptCap += 100;
    S.fps = Math.round(1000 / avg);
    S.adaptAcc = 0; S.adaptN = 0;
    $('#stat-fps').textContent = `${S.fps} FPS`;
    $('#stat-count').textContent = `${S.bots.length.toLocaleString()} BOTS`;
    $('#stat-links').textContent = `${(S.links.length / 3).toLocaleString()} LINKS`;
  }

  // auto-pilot with scripted surges until the user takes over
  if (!S.manual && !S.paused) {
    S.autoTimer += dt * 0.001;
    const ph = S.autoTimer;
    S.ptx = W / 2 + Math.cos(S.t * 0.45) * W * 0.27;
    S.pty = H * 0.40 + Math.sin(S.t * 0.83) * H * 0.17;
    S.autoGather = ph > 3.4 && ph < 4.5;
    if (S.autoGather) S.charge = clamp(S.charge + dt * 0.0018, 0, 1);
    if (S.wasAutoGather && !S.autoGather) { burst(S.px, S.py, S.charge); S.charge = 0; }
    S.wasAutoGather = S.autoGather;
    if (ph > 9.2) {
      S.autoTimer = 0;
      S.wasAutoGather = false;
      S.autoIdx = (S.autoIdx + 1) % MODES.length;
      setMode(MODES[S.autoIdx]);
    }
  }
  S.px = lerp(S.px || S.ptx, S.ptx, clamp(0.16 * (dtN || 1), 0, 1));
  S.py = lerp(S.py || S.pty, S.pty, clamp(0.16 * (dtN || 1), 0, 1));

  if (S.down) S.charge = clamp(S.charge + dt * 0.0011, 0, 1);

  // scan sweep
  S.scanTimer -= dt * 0.001;
  if (S.scanX < 0 && S.scanTimer <= 0) { S.scanX = -60; S.scanTimer = 11 + rand(6); }
  if (S.scanX >= 0) {
    S.scanX += (W + 120) / 95 * dtN;
    if (S.scanX > W + 60) S.scanX = -1;
  }

  // population trickle
  const want = Math.min(S.targetCount, S.adaptCap);
  if (S.bots.length < want) {
    for (let i = 0; i < 16 && S.bots.length < want; i++) spawnFromEdge();
  } else if (S.bots.length > want) {
    let n = Math.min(16, S.bots.length - want);
    for (const b of S.bots) {
      if (n <= 0) break;
      if (!b.leaving && Math.random() < 0.02) {
        b.leaving = true;
        const a = Math.atan2(b.y - H / 2, b.x - W / 2);
        b.vx = Math.cos(a) * 5; b.vy = Math.sin(a) * 5;
        n--;
      }
    }
  }
  for (let i = S.bots.length - 1; i >= 0; i--) {
    const b = S.bots[i];
    if (b.leaving && (b.x < -70 || b.x > W + 70 || b.y < -70 || b.y > H + 70))
      S.bots.splice(i, 1);
  }

  physics(dtN);
  render(dtN || 1);
}

/* ------------------------------------------------------------------ boot */
resize();
S.px = S.ptx = W / 2; S.py = S.pty = H * 0.38;
for (let i = 0; i < 750; i++) spawnBot(rand(W), rand(H), rand(-2, 2), rand(-2, 2));
setTheme(0, true);
setMode('swarm', true);
$('body')?.classList?.add('loaded');
runBoot();
requestAnimationFrame(step);
})();
